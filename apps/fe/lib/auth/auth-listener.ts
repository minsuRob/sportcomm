/**
 * Supabase Auth 이벤트 리스너 서비스
 * ------------------------------------
 * 목적:
 *  - Supabase Auth 상태 변화를 전역에서 감지하고
 *    로그인/로그아웃/토큰 갱신/사용자 정보 변경에 따른 후속 동작을 수행
 *
 * 수정 내역 (Fix):
 *  - 기존 코드에서 supabase.auth.onAuthStateChange 반환값을 바로 subscription 으로 간주
 *    => supabase-js v2 는 { data: { subscription }, error } 객체를 반환
 *    => stop() 시 this.subscription.unsubscribe 가 undefined 여서 TypeError 발생
 *  - 안전한 구조 분해 & 타입 가드 & 방어 로직 추가
 */

import { supabase } from "../supabase/client";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { EnhancedUserSyncService } from "./enhanced-user-sync";
import { AuthStore } from "../store/auth-store";

/**
 * Auth 이벤트 리스너 설정 옵션
 */
export interface AuthListenerOptions {
  enableAutoSync?: boolean; // 자동 사용자 동기화 여부 (기본 true)
  enableDebugLog?: boolean; // 디버그 로그 활성화
  onError?: (error: Error) => void;
  onSyncSuccess?: (user: any) => void;
}

/**
 * Supabase-js v2 Subscription 최소 형태 타입
 * (필요한 부분만 명시, 라이브러리 내부 구조에 의존 최소화)
 */
interface SupabaseAuthSubscription {
  unsubscribe: () => void;
}

/**
 * 내부 헬퍼: subscription 형태 확인 (런타임 방어)
 */
function isValidSubscription(
  value: unknown,
): value is SupabaseAuthSubscription {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as any).unsubscribe === "function"
  );
}

/**
 * 선택된 팀 필터 스토리지 키
 */
const SELECTED_TEAM_FILTER_KEY = "selected_team_filter";

/**
 * Supabase Auth 이벤트 리스너 클래스 (Singleton-like static)
 */
export class AuthEventListener {
  private static subscription: SupabaseAuthSubscription | null = null;
  private static options: AuthListenerOptions = {};
  private static starting = false; // 동시 start 방지 플래그

  /**
   * 리스너 시작
   */
  static start(options: AuthListenerOptions = {}): void {
    // 중복 호출 방지
    if (this.starting) {
      if (options.enableDebugLog) {
        //console.log("⏳ AuthEventListener: 이미 시작 처리중 (start 호출 무시)");
      }
      return;
    }

    // 이미 활성화 상태면 기존 것 정리
    if (this.isActive()) {
      this.stop();
    }

    this.starting = true;

    this.options = {
      enableAutoSync: true,
      enableDebugLog: false,
      ...options,
    };

    //console.log("🎧 Supabase Auth 이벤트 리스너 시작");

    try {
      // supabase-js v2 형태: { data: { subscription }, error }
      const {
        data,
        error,
      }: {
        data: { subscription: SupabaseAuthSubscription } | null;
        error: unknown;
      } = supabase.auth.onAuthStateChange(
        async (event: AuthChangeEvent, session: Session | null) => {
          await this.handleAuthStateChange(event, session);
        },
      ) as any;

      if (error) {
        console.error("❌ Auth 상태 변화 리스너 등록 실패:", error);
      }

      const potential = data?.subscription;
      if (isValidSubscription(potential)) {
        this.subscription = potential;
        if (this.options.enableDebugLog) {
          //console.log("✅ Auth 상태 변화 구독(subscription) 확보");
        }
      } else {
        // subscription 확보 실패 (구조 변경 / 에러)
        this.subscription = null;
        console.warn(
          "⚠️ Supabase Auth 구독 객체를 확보하지 못했습니다. (unsubscribe 미제공)",
        );
      }
    } catch (err) {
      console.error("❌ AuthEventListener.start 중 예외 발생:", err);
      this.subscription = null;
      if (this.options.onError) {
        this.options.onError(
          err instanceof Error ? err : new Error("알 수 없는 오류"),
        );
      }
    } finally {
      this.starting = false;
    }
  }

  /**
   * 리스너 중지
   */
  static stop(): void {
    if (!this.subscription) {
      // 이미 정리된 상태
      return;
    }

    try {
      if (isValidSubscription(this.subscription)) {
        this.subscription.unsubscribe();
        if (this.options.enableDebugLog) {
          //console.log("🛑 Supabase Auth 이벤트 리스너 구독 해제 완료");
        }
      } else {
        console.warn(
          "⚠️ stop() 호출 시 subscription 이 유효하지 않아 unsubscribe 생략",
        );
      }
    } catch (err) {
      console.error("❌ AuthEventListener.stop 중 예외 발생:", err);
    } finally {
      this.subscription = null;
    }
  }

  /**
   * Auth 상태 변화 처리
   */
  private static async handleAuthStateChange(
    event: AuthChangeEvent,
    session: Session | null,
  ): Promise<void> {
    if (this.options.enableDebugLog) {
      //console.log("🔔 Auth 상태 변화 감지:", { event, hasSession: !!session });
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
            //console.log(`📝 처리되지 않은 Auth 이벤트: ${event}`);
          }
      }
    } catch (error) {
      console.error(`❌ Auth 이벤트 처리 실패 (${event}):`, error);
      if (this.options.onError) this.options.onError(error as Error);
    }
  }

  /**
   * SIGNED_IN 처리
   */
  private static async handleSignedIn(session: Session | null): Promise<void> {
    if (!session?.access_token) {
      console.warn("⚠️ SIGNED_IN 이벤트이지만 유효한 세션이 없음");
      return;
    }

    //console.log("✅ 사용자 로그인 감지");

    if (!this.options.enableAutoSync) {
      AuthStore.updateAccessToken(session.access_token);
      return;
    }

    const syncResult = await EnhancedUserSyncService.checkAndSyncAfterSignIn(
      session.access_token,
    );

    if (syncResult.success && syncResult.user) {
      //console.log("✅ 로그인 후 사용자 동기화 완료:", syncResult.user.nickname);
      if (this.options.onSyncSuccess) {
        this.options.onSyncSuccess(syncResult.user);
      }
    } else {
      console.warn("⚠️ 로그인 후 사용자 동기화 실패:", syncResult.error);
      AuthStore.updateAccessToken(session.access_token);
    }
  }

  /**
   * SIGNED_OUT 처리
   */
  private static async handleSignedOut(): Promise<void> {
    //console.log("👋 사용자 로그아웃 감지");

    // 로그아웃 시 선택된 팀 필터 초기화
    try {
      await AsyncStorage.removeItem(SELECTED_TEAM_FILTER_KEY);
      // console.log("🗑️ 로그아웃: selected_team_filter AsyncStorage에서 제거됨");
    } catch (error) {
      console.warn("⚠️ 로그아웃 시 팀 필터 제거 실패:", error);
    }

    EnhancedUserSyncService.resetSyncState();
  }

  /**
   * TOKEN_REFRESHED 처리
   */
  private static async handleTokenRefreshed(
    session: Session | null,
  ): Promise<void> {
    if (!session?.access_token) {
      console.warn("⚠️ TOKEN_REFRESHED 이벤트이지만 유효한 세션이 없음");
      return;
    }
    if (this.options.enableDebugLog) {
      //console.log("🔄 토큰 갱신 감지");
    }
    AuthStore.updateAccessToken(session.access_token);
  }

  /**
   * USER_UPDATED 처리
   */
  private static async handleUserUpdated(
    session: Session | null,
  ): Promise<void> {
    if (!session?.access_token) {
      console.warn("⚠️ USER_UPDATED 이벤트이지만 유효한 세션이 없음");
      return;
    }

    if (this.options.enableDebugLog) {
      //console.log("👤 사용자 정보 업데이트 감지");
    }

    if (this.options.enableAutoSync && AuthStore.getState().isAuthenticated) {
      try {
        const syncResult =
          await EnhancedUserSyncService.checkAndSyncAfterSignIn(
            session.access_token,
          );
        if (syncResult.success && syncResult.user) {
          //console.log("✅ 사용자 정보 업데이트 후 재동기화 완료");
        }
      } catch (error) {
        console.warn("⚠️ 사용자 정보 업데이트 후 재동기화 실패:", error);
      }
    }
  }

  /**
   * 리스너 활성 여부
   */
  static isActive(): boolean {
    return isValidSubscription(this.subscription);
  }

  /**
   * 현재 설정 옵션 조회 (불변 사본)
   */
  static getOptions(): AuthListenerOptions {
    return { ...this.options };
  }

  /**
   * 디버그용 subscription 상태 정보
   */
  static getDebugSubscriptionInfo() {
    return {
      isActive: this.isActive(),
      hasSubscriptionObject: !!this.subscription,
      hasUnsubscribe:
        !!this.subscription &&
        typeof (this.subscription as any).unsubscribe === "function",
    };
  }
}

/**
 * 외부 간편 초기화 함수
 */
export function initializeAuthListener(options?: AuthListenerOptions): void {
  AuthEventListener.start(options);
}

/**
 * 외부 간편 정리 함수
 */
export function cleanupAuthListener(): void {
  AuthEventListener.stop();
}

export default AuthEventListener;
