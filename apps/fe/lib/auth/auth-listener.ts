/**
 * Supabase Auth 이벤트 리스너 서비스
 *
 * SIGNED_IN, SIGNED_OUT 이벤트를 감지하여
 * 자동으로 사용자 동기화 및 전역 상태 관리를 수행합니다.
 */

import { supabase } from "../supabase/client";
import { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { EnhancedUserSyncService } from "./enhanced-user-sync";
import { AuthStore } from "../store/auth-store";

/**
 * Auth 이벤트 리스너 설정 옵션
 */
export interface AuthListenerOptions {
  /** 자동 동기화 활성화 여부 (기본값: true) */
  enableAutoSync?: boolean;
  /** 디버그 로그 활성화 여부 (기본값: false) */
  enableDebugLog?: boolean;
  /** 에러 콜백 함수 */
  onError?: (error: Error) => void;
  /** 동기화 성공 콜백 함수 */
  onSyncSuccess?: (user: any) => void;
}

/**
 * Supabase Auth 이벤트 리스너 클래스
 */
export class AuthEventListener {
  private static subscription: { unsubscribe: () => void } | null = null;
  private static options: AuthListenerOptions = {};

  /**
   * Auth 이벤트 리스너 시작
   *
   * @param options 리스너 설정 옵션
   */
  static start(options: AuthListenerOptions = {}): void {
    // 기존 리스너가 있으면 정리
    this.stop();

    this.options = {
      enableAutoSync: true,
      enableDebugLog: false,
      ...options,
    };

    console.log("🎧 Supabase Auth 이벤트 리스너 시작");

    // Auth 상태 변화 구독
    this.subscription = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        await this.handleAuthStateChange(event, session);
      },
    );
  }

  /**
   * Auth 이벤트 리스너 중지
   */
  static stop(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
      console.log("🛑 Supabase Auth 이벤트 리스너 중지");
    }
  }

  /**
   * Auth 상태 변화 처리
   *
   * @param event Auth 이벤트 타입
   * @param session 현재 세션 정보
   */
  private static async handleAuthStateChange(
    event: AuthChangeEvent,
    session: Session | null,
  ): Promise<void> {
    if (this.options.enableDebugLog) {
      console.log("🔔 Auth 상태 변화 감지:", { event, hasSession: !!session });
    }

    try {
      switch (event) {
        case "SIGNED_IN":
          await this.handleSignedIn(session);
          break;

        case "SIGNED_OUT":
          await this.handleSignedOut();
          break;

        case "TOKEN_REFRESHED":
          await this.handleTokenRefreshed(session);
          break;

        case "USER_UPDATED":
          await this.handleUserUpdated(session);
          break;

        default:
          if (this.options.enableDebugLog) {
            console.log(`📝 처리되지 않은 Auth 이벤트: ${event}`);
          }
          break;
      }
    } catch (error) {
      console.error(`❌ Auth 이벤트 처리 실패 (${event}):`, error);

      if (this.options.onError) {
        this.options.onError(error as Error);
      }
    }
  }

  /**
   * SIGNED_IN 이벤트 처리
   *
   * @param session 세션 정보
   */
  private static async handleSignedIn(session: Session | null): Promise<void> {
    if (!session?.access_token) {
      console.warn("⚠️ SIGNED_IN 이벤트이지만 유효한 세션이 없음");
      return;
    }

    console.log("✅ 사용자 로그인 감지");

    // 자동 동기화가 비활성화된 경우 토큰만 업데이트
    if (!this.options.enableAutoSync) {
      AuthStore.updateAccessToken(session.access_token);
      return;
    }

    // 사용자 정보 확인 및 동기화
    const syncResult = await EnhancedUserSyncService.checkAndSyncAfterSignIn(
      session.access_token,
    );

    if (syncResult.success && syncResult.user) {
      console.log("✅ 로그인 후 사용자 동기화 완료:", syncResult.user.nickname);

      if (this.options.onSyncSuccess) {
        this.options.onSyncSuccess(syncResult.user);
      }
    } else {
      console.warn("⚠️ 로그인 후 사용자 동기화 실패:", syncResult.error);

      // 동기화 실패 시에도 토큰은 저장 (수동 동기화 가능하도록)
      AuthStore.updateAccessToken(session.access_token);
    }
  }

  /**
   * SIGNED_OUT 이벤트 처리
   */
  private static async handleSignedOut(): Promise<void> {
    console.log("👋 사용자 로그아웃 감지");

    // 동기화 상태 및 전역 상태 리셋
    EnhancedUserSyncService.resetSyncState();
  }

  /**
   * TOKEN_REFRESHED 이벤트 처리
   *
   * @param session 새로운 세션 정보
   */
  private static async handleTokenRefreshed(
    session: Session | null,
  ): Promise<void> {
    if (!session?.access_token) {
      console.warn("⚠️ TOKEN_REFRESHED 이벤트이지만 유효한 세션이 없음");
      return;
    }

    if (this.options.enableDebugLog) {
      console.log("🔄 토큰 갱신 감지");
    }

    // 전역 상태의 토큰 업데이트
    AuthStore.updateAccessToken(session.access_token);

    // 토큰 갱신 시에는 중복 동기화를 수행하지 않음
    // (이미 동기화된 사용자이므로)
  }

  /**
   * USER_UPDATED 이벤트 처리
   *
   * @param session 세션 정보
   */
  private static async handleUserUpdated(
    session: Session | null,
  ): Promise<void> {
    if (!session?.access_token) {
      console.warn("⚠️ USER_UPDATED 이벤트이지만 유효한 세션이 없음");
      return;
    }

    if (this.options.enableDebugLog) {
      console.log("👤 사용자 정보 업데이트 감지");
    }

    // 자동 동기화가 활성화된 경우에만 사용자 정보 재동기화
    if (this.options.enableAutoSync && AuthStore.getState().isAuthenticated) {
      try {
        const syncResult =
          await EnhancedUserSyncService.checkAndSyncAfterSignIn(
            session.access_token,
          );

        if (syncResult.success && syncResult.user) {
          console.log("✅ 사용자 정보 업데이트 후 재동기화 완료");
        }
      } catch (error) {
        console.warn("⚠️ 사용자 정보 업데이트 후 재동기화 실패:", error);
      }
    }
  }

  /**
   * 현재 리스너 상태 확인
   *
   * @returns 리스너 활성화 여부
   */
  static isActive(): boolean {
    return this.subscription !== null;
  }

  /**
   * 현재 설정 옵션 조회
   *
   * @returns 현재 설정된 옵션
   */
  static getOptions(): AuthListenerOptions {
    return { ...this.options };
  }
}

/**
 * Auth 리스너 초기화 헬퍼 함수
 *
 * @param options 리스너 설정 옵션
 */
export function initializeAuthListener(options?: AuthListenerOptions): void {
  AuthEventListener.start(options);
}

/**
 * Auth 리스너 정리 헬퍼 함수
 */
export function cleanupAuthListener(): void {
  AuthEventListener.stop();
}

// 편의를 위한 기본 익스포트
export default AuthEventListener;
