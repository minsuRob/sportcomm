/**
 * 토큰 관리 서비스
 *
 * Supabase JWT 토큰의 자동 갱신 및 만료 처리를 담당합니다.
 * Apollo Client와 연동하여 API 요청 시 항상 유효한 토큰을 사용하도록 보장합니다.
 */

import { supabase } from "@/lib/supabase/client";
import { Session } from "@supabase/supabase-js";

export interface TokenInfo {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: any;
}

/**
 * 토큰 관리자 클래스
 */
export class TokenManager {
  private static instance: TokenManager;
  private currentSession: Session | null = null;
  private refreshPromise: Promise<Session | null> | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.initializeSessionListener();
  }

  /**
   * 싱글톤 인스턴스 반환
   */
  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  /**
   * Supabase 세션 변경 리스너 초기화
   */
  private initializeSessionListener(): void {
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔄 인증 상태 변경:", event, {
        hasSession: !!session,
        userId: session?.user?.id,
        expiresAt: session?.expires_at,
      });

      this.currentSession = session;

      if (event === "TOKEN_REFRESHED" && session) {
        console.log("✅ 토큰 자동 갱신 완료:", {
          userId: session.user.id,
          expiresAt: new Date(session.expires_at! * 1000).toISOString(),
        });
      }

      if (event === "SIGNED_OUT") {
        this.clearRefreshTimer();
        this.currentSession = null;
      }

      // 토큰 만료 5분 전에 갱신 스케줄링
      if (session?.expires_at) {
        this.scheduleTokenRefresh(session.expires_at);
      }
    });
  }

  /**
   * 현재 유효한 토큰 반환
   * 만료가 임박한 경우 자동으로 갱신 시도
   */
  async getValidToken(): Promise<string | null> {
    try {
      // 현재 세션이 없으면 세션 가져오기 시도
      if (!this.currentSession) {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error) {
          console.error("❌ 세션 가져오기 실패:", error);
          return null;
        }
        this.currentSession = session;
      }

      if (!this.currentSession) {
        console.warn("⚠️ 활성 세션이 없음");
        return null;
      }

      const now = Math.floor(Date.now() / 1000);
      const expiresAt = this.currentSession.expires_at!;
      const timeUntilExpiry = expiresAt - now;

      // 토큰이 5분 이내에 만료되면 갱신
      if (timeUntilExpiry < 300) {
        console.log("🔄 토큰 갱신 필요 (5분 이내 만료)");
        const refreshedSession = await this.refreshToken();
        if (refreshedSession) {
          return refreshedSession.access_token;
        }
      }

      return this.currentSession.access_token;
    } catch (error) {
      console.error("❌ 유효한 토큰 가져오기 실패:", error);
      return null;
    }
  }

  /**
   * 토큰 강제 갱신
   */
  async refreshToken(): Promise<Session | null> {
    // 이미 갱신 중이면 기존 Promise 반환
    if (this.refreshPromise) {
      console.log("🔄 토큰 갱신 이미 진행 중, 대기...");
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();

    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * 실제 토큰 갱신 수행
   */
  private async performTokenRefresh(): Promise<Session | null> {
    try {
      console.log("🔄 토큰 갱신 시작...");

      const {
        data: { session },
        error,
      } = await supabase.auth.refreshSession();

      if (error) {
        console.error("❌ 토큰 갱신 실패:", error);

        // 갱신 실패 시 로그아웃 처리
        if (
          error.message.includes("refresh_token_not_found") ||
          error.message.includes("invalid_grant")
        ) {
          console.log("🚪 리프레시 토큰 무효, 로그아웃 처리");
          await this.signOut();
        }

        return null;
      }

      if (!session) {
        console.error("❌ 갱신된 세션이 없음");
        return null;
      }

      this.currentSession = session;
      console.log("✅ 토큰 갱신 성공:", {
        userId: session.user.id,
        expiresAt: new Date(session.expires_at! * 1000).toISOString(),
      });

      // 다음 갱신 스케줄링
      this.scheduleTokenRefresh(session.expires_at!);

      return session;
    } catch (error) {
      console.error("❌ 토큰 갱신 중 예외 발생:", error);
      return null;
    }
  }

  /**
   * 토큰 만료 전 자동 갱신 스케줄링
   */
  private scheduleTokenRefresh(expiresAt: number): void {
    this.clearRefreshTimer();

    const now = Math.floor(Date.now() / 1000);
    const timeUntilRefresh = Math.max(0, expiresAt - now - 300); // 5분 전에 갱신

    console.log("⏰ 토큰 자동 갱신 스케줄링:", {
      expiresAt: new Date(expiresAt * 1000).toISOString(),
      refreshIn: `${timeUntilRefresh}초`,
    });

    this.refreshTimer = setTimeout(async () => {
      console.log("⏰ 스케줄된 토큰 갱신 실행");
      await this.refreshToken();
    }, timeUntilRefresh * 1000);
  }

  /**
   * 갱신 타이머 정리
   */
  private clearRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * 현재 세션 정보 반환
   */
  getCurrentSession(): Session | null {
    return this.currentSession;
  }

  /**
   * 로그아웃 처리
   */
  async signOut(): Promise<void> {
    try {
      this.clearRefreshTimer();
      this.currentSession = null;
      await supabase.auth.signOut();
      console.log("🚪 로그아웃 완료");
    } catch (error) {
      console.error("❌ 로그아웃 실패:", error);
    }
  }

  /**
   * 토큰 유효성 검사
   */
  isTokenValid(): boolean {
    if (!this.currentSession) return false;

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = this.currentSession.expires_at!;

    return expiresAt > now;
  }
}

// 싱글톤 인스턴스 내보내기
export const tokenManager = TokenManager.getInstance();

// 편의 함수들
export const getValidToken = () => tokenManager.getValidToken();
export const refreshToken = () => tokenManager.refreshToken();
export const getCurrentSession = () => tokenManager.getCurrentSession();
export const isTokenValid = () => tokenManager.isTokenValid();
