/**
 * 단순화된 TokenManager
 * -------------------------------------------
 * 목적:
 *  - Supabase의 autoRefresh(클라이언트 설정) 기능을 신뢰하고
 *    커스텀 타이머/스케줄링/이중 리스너를 제거하여 복잡도 감소
 *  - 필요한 시점에만 수동 refreshSession()을 호출 (실패/만료 감지 시 1회 재시도)
 *
 * 주요 변경 사항:
 *  - 기존: onAuthStateChange + 만료 5분 전 커스텀 스케줄 타이머
 *  - 변경: Supabase 내부 auto refresh에 전적으로 의존
 *  - 함수 시그니처/외부 익스포트(getValidToken 등)는 기존과 호환 유지
 *
 * 사용 지침:
 *  - GraphQL / REST 호출 직전 `getValidToken()` 호출
 *  - 명시적으로 강제 갱신 필요 시 `refreshToken()` 호출
 */

import { supabase } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";

/**
 * TokenManager 인터페이스 정의 (확장 대비)
 */
interface ITokenManager {
  getValidToken(): Promise<string | null>;
  refreshToken(): Promise<Session | null>;
  ensureFreshSession(): Promise<Session | null>;
  getCurrentSession(): Session | null;
  isTokenValid(): boolean;
  signOut(): Promise<void>;
  debug(): Promise<void>;
}

/**
 * 단순화된 TokenManager 구현
 */
class SimpleTokenManager implements ITokenManager {
  private static instance: SimpleTokenManager;

  /**
   * Supabase에서 마지막으로 획득/저장한 세션 (필요 시 lazy update)
   */
  private session: Session | null = null;

  /**
   * 중복 refresh 호출 방지 Promise
   */
  private inflightRefresh: Promise<Session | null> | null = null;

  /**
   * 마지막으로 세션을 getSession() 통해 동기화한 시각 (ms)
   */
  private lastSyncAt: number = 0;

  /**
   * 세션 재조회 최소 주기(ms) - 너무 잦은 호출 방지용 (옵션)
   */
  private static readonly SESSION_SYNC_INTERVAL_MS = 5_000;

  private constructor() {
    // 커스텀 listener / 타이머 제거됨
  }

  static getInstance(): SimpleTokenManager {
    if (!SimpleTokenManager.instance) {
      SimpleTokenManager.instance = new SimpleTokenManager();
    }
    return SimpleTokenManager.instance;
  }

  /**
   * 내부: Supabase 세션 동기화 (캐시 적중 고려)
   */
  private async syncSession(force = false): Promise<Session | null> {
    const now = Date.now();
    if (
      !force &&
      this.session &&
      now - this.lastSyncAt < SimpleTokenManager.SESSION_SYNC_INTERVAL_MS
    ) {
      return this.session;
    }

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.warn("⚠️ 세션 동기화 실패:", error.message);
      return this.session; // 기존 세션 유지
    }

    this.session = session;
    this.lastSyncAt = now;
    return this.session;
  }

  /**
   * 현재 사용할 수 있는 Access Token 반환
   * - 만료/부재 시 1회 refresh 시도
   */
  async getValidToken(): Promise<string | null> {
    // 1. 세션 동기화 (캐시 사용)
    await this.syncSession();

    if (!this.session) {
      //console.log("ℹ️ 활성 세션 없음");
      return null;
    }

    if (this.isTokenValid()) {
      return this.session.access_token;
    }

    // 2. 만료 또는 직전 만료 감지 → 강제 refresh 1회
    //console.log("🔄 토큰 만료 감지 → 강제 refresh 시도");
    const refreshed = await this.refreshToken();
    return refreshed?.access_token ?? null;
  }

  /**
   * 명시적 토큰 갱신 (필요 시 외부에서 직접 호출)
   * - 동시 호출은 단일 inflightRefresh Promise로 serialize
   */
  async refreshToken(): Promise<Session | null> {
    if (this.inflightRefresh) {
      return this.inflightRefresh;
    }

    this.inflightRefresh = (async () => {
      try {
        //console.log("🔄 refreshSession 호출 시작");
        const {
          data: { session },
          error,
        } = await supabase.auth.refreshSession();

        if (error) {
          // refresh_token_not_found / invalid_grant 는 세션 전면 무효
          console.error("❌ refreshSession 실패:", error.message);
          if (
            error.message.includes("invalid_grant") ||
            error.message.includes("refresh_token_not_found")
          ) {
            console.warn("🚪 리프레시 토큰 무효 → 세션 초기화");
            this.session = null;
            return null;
          }
          // 기타 네트워크/일시적 오류인 경우 기존 세션 그대로 (Supabase 내부 재시도 기대)
          return this.session;
        }

        if (!session) {
          console.warn("⚠️ refresh 결과 세션 없음");
          return null;
        }

        this.session = session;
        this.lastSyncAt = Date.now();
        //console.log("✅ refreshSession 성공:", {
          // userId: session.user.id,
          // expiresAt: new Date(session.expires_at! * 1000).toISOString(),
        // });
        return session;
      } catch (e) {
        console.error("❌ refreshToken 처리 중 예외:", e);
        return null;
      } finally {
        this.inflightRefresh = null;
      }
    })();

    return this.inflightRefresh;
  }

  /**
   * 세션이 없거나 만료 임박/만료 상태라면 강제로 최신 세션을 확보합니다.
   * - 우선 강제 syncSession(true)로 최신 상태 반영
   * - 유효하지 않으면 refreshToken() 시도
   * - 최종 세션(Session | null) 반환
   */
  async ensureFreshSession(): Promise<Session | null> {
    await this.syncSession(true);
    if (this.session && this.isTokenValid()) {
      return this.session;
    }
    return await this.refreshToken();
  }

  /**
   * 현재 세션 반환 (캐시 그대로)
   */
  getCurrentSession(): Session | null {
    return this.session;
  }

  /**
   * 토큰 유효성 (만료 전 여부)
   */
  isTokenValid(): boolean {
    if (!this.session?.expires_at) return false;
    const now = Math.floor(Date.now() / 1000);
    return this.session.expires_at > now;
  }

  /**
   * 로그아웃
   */
  async signOut(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } finally {
      this.session = null;
      this.inflightRefresh = null;
    }
    //console.log("🚪 로그아웃 완료 (캐시 초기화)");
  }

  /**
   * 디버깅용 상태 출력
   */
  async debug(): Promise<void> {
    await this.syncSession(true);
    const expiresAtISO = this.session?.expires_at
      ? new Date(this.session.expires_at * 1000).toISOString()
      : null;
    //console.log("🔍 TokenManager Debug", {
    //   hasSession: !!this.session,
    //   userId: this.session?.user?.id,
    //   expiresAt: expiresAtISO,
    //   isValid: this.isTokenValid(),
    //   lastSyncAt: new Date(this.lastSyncAt).toISOString(),
    //   inflightRefresh: !!this.inflightRefresh,
    // });
  }
}

/* --------------------------------------------------
 * 싱글톤 인스턴스 & 기존 호환성 Helper 함수들
 * -------------------------------------------------- */
export const tokenManager = SimpleTokenManager.getInstance();

/**
 * 기존 호환 API (외부 코드 영향 최소화)
 */
export const getValidToken = () => tokenManager.getValidToken();
export const refreshToken = () => tokenManager.refreshToken();
export const ensureFreshSession = () => tokenManager.ensureFreshSession();
export const getCurrentSession = () => tokenManager.getCurrentSession();
export const isTokenValid = () => tokenManager.isTokenValid();
export const signOut = () => tokenManager.signOut();
export const debugTokenManager = () => tokenManager.debug();
