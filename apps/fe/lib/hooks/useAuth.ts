/**
 * 통합 인증 훅
 *
 * Apollo Reactive Variables 기반 전역 상태와
 * 사용자 동기화 기능을 통합한 커스텀 훅입니다.
 */

import { useReactiveVar } from "@apollo/client";
import { useEffect, useCallback } from "react";
import { authStateVar, AuthStore, type AuthState } from "../store/auth-store";
import {
  EnhancedUserSyncService,
  type SyncResult,
} from "../auth/enhanced-user-sync";
import { AuthEventListener } from "../auth/auth-listener";
import type { User, SyncUserInput } from "../supabase/user-sync";

/**
 * 인증 훅 반환 타입
 */
export interface UseAuthReturn {
  // 상태
  /** 현재 인증 상태 */
  authState: AuthState;
  /** 인증 여부 */
  isAuthenticated: boolean;
  /** 현재 사용자 정보 */
  user: User | null;
  /** 로딩 상태 */
  isLoading: boolean;
  /** 동기화 완료 여부 */
  isSynced: boolean;
  /** 액세스 토큰 */
  accessToken: string | null;

  // 액션
  /** 사용자 동기화 */
  syncUser: (input: SyncUserInput, forceSync?: boolean) => Promise<SyncResult>;
  /** 회원가입 후 동기화 */
  syncAfterSignUp: (userProfile: {
    id: string;
    nickname: string;
    email: string;
    role?: string;
  }) => Promise<SyncResult>;
  /** 로그인 후 확인 및 동기화 */
  checkAndSyncAfterSignIn: () => Promise<SyncResult>;
  /** 프로필 업데이트 */
  updateProfile: (input: {
    nickname?: string;
    profileImageUrl?: string;
    bio?: string;
  }) => Promise<SyncResult>;
  /** 로그아웃 */
  signOut: () => void;
  /** 인증 상태 리셋 */
  resetAuth: () => void;
}

/**
 * 인증 훅 옵션
 */
export interface UseAuthOptions {
  /** 자동 Auth 리스너 시작 여부 (기본값: true) */
  enableAutoListener?: boolean;
  /** 디버그 로그 활성화 여부 (기본값: false) */
  enableDebugLog?: boolean;
  /** 동기화 성공 콜백 */
  onSyncSuccess?: (user: User) => void;
  /** 에러 콜백 */
  onError?: (error: Error) => void;
}

/**
 * 통합 인증 훅
 *
 * @param options 훅 설정 옵션
 * @returns 인증 상태 및 액션 함수들
 */
export function useAuth(options: UseAuthOptions = {}): UseAuthReturn {
  const {
    enableAutoListener = true,
    enableDebugLog = false,
    onSyncSuccess,
    onError,
  } = options;

  // Apollo Reactive Variable 구독
  const authState = useReactiveVar(authStateVar);

  // Auth 이벤트 리스너 초기화
  useEffect(() => {
    if (enableAutoListener && !AuthEventListener.isActive()) {
      AuthEventListener.start({
        enableAutoSync: true,
        enableDebugLog,
        onSyncSuccess,
        onError,
      });

      if (enableDebugLog) {
        console.log("🎧 useAuth: Auth 이벤트 리스너 시작");
      }
    }

    // 컴포넌트 언마운트 시 리스너 정리
    return () => {
      if (enableAutoListener) {
        AuthEventListener.stop();

        if (enableDebugLog) {
          console.log("🛑 useAuth: Auth 이벤트 리스너 정리");
        }
      }
    };
  }, [enableAutoListener, enableDebugLog, onSyncSuccess, onError]);

  // 사용자 동기화
  const syncUser = useCallback(
    async (
      input: SyncUserInput,
      forceSync: boolean = false,
    ): Promise<SyncResult> => {
      if (!authState.accessToken) {
        const error = new Error(
          "액세스 토큰이 없습니다. 다시 로그인해 주세요.",
        );
        onError?.(error);
        return { success: false, error: error.message };
      }

      try {
        const result = await EnhancedUserSyncService.syncUser(
          input,
          authState.accessToken,
          forceSync,
        );

        if (result.success && result.user && onSyncSuccess) {
          onSyncSuccess(result.user);
        }

        return result;
      } catch (error) {
        const errorObj = error as Error;
        onError?.(errorObj);
        return { success: false, error: errorObj.message };
      }
    },
    [authState.accessToken, onSyncSuccess, onError],
  );

  // 회원가입 후 동기화
  const syncAfterSignUp = useCallback(
    async (userProfile: {
      id: string;
      nickname: string;
      email: string;
      role?: string;
    }): Promise<SyncResult> => {
      if (!authState.accessToken) {
        const error = new Error(
          "액세스 토큰이 없습니다. 다시 로그인해 주세요.",
        );
        onError?.(error);
        return { success: false, error: error.message };
      }

      try {
        const result = await EnhancedUserSyncService.syncAfterSignUp(
          userProfile,
          authState.accessToken,
        );

        if (result.success && result.user && onSyncSuccess) {
          onSyncSuccess(result.user);
        }

        return result;
      } catch (error) {
        const errorObj = error as Error;
        onError?.(errorObj);
        return { success: false, error: errorObj.message };
      }
    },
    [authState.accessToken, onSyncSuccess, onError],
  );

  // 로그인 후 확인 및 동기화
  const checkAndSyncAfterSignIn = useCallback(async (): Promise<SyncResult> => {
    if (!authState.accessToken) {
      const error = new Error("액세스 토큰이 없습니다. 다시 로그인해 주세요.");
      onError?.(error);
      return { success: false, error: error.message };
    }

    try {
      const result = await EnhancedUserSyncService.checkAndSyncAfterSignIn(
        authState.accessToken,
      );

      if (result.success && result.user && onSyncSuccess) {
        onSyncSuccess(result.user);
      }

      return result;
    } catch (error) {
      const errorObj = error as Error;
      onError?.(errorObj);
      return { success: false, error: errorObj.message };
    }
  }, [authState.accessToken, onSyncSuccess, onError]);

  // 프로필 업데이트
  const updateProfile = useCallback(
    async (input: {
      nickname?: string;
      profileImageUrl?: string;
      bio?: string;
    }): Promise<SyncResult> => {
      if (!authState.accessToken) {
        const error = new Error(
          "액세스 토큰이 없습니다. 다시 로그인해 주세요.",
        );
        onError?.(error);
        return { success: false, error: error.message };
      }

      try {
        const result = await EnhancedUserSyncService.updateUserProfile(
          input,
          authState.accessToken,
        );

        if (result.success && result.user && onSyncSuccess) {
          onSyncSuccess(result.user);
        }

        return result;
      } catch (error) {
        const errorObj = error as Error;
        onError?.(errorObj);
        return { success: false, error: errorObj.message };
      }
    },
    [authState.accessToken, onSyncSuccess, onError],
  );

  // 로그아웃
  const signOut = useCallback(() => {
    EnhancedUserSyncService.resetSyncState();

    if (enableDebugLog) {
      console.log("👋 useAuth: 로그아웃 처리 완료");
    }
  }, [enableDebugLog]);

  // 인증 상태 리셋
  const resetAuth = useCallback(() => {
    AuthStore.reset();

    if (enableDebugLog) {
      console.log("🔄 useAuth: 인증 상태 리셋 완료");
    }
  }, [enableDebugLog]);

  return {
    // 상태
    authState,
    isAuthenticated: authState.isAuthenticated,
    user: authState.user,
    isLoading: authState.isLoading,
    isSynced: authState.isSynced,
    accessToken: authState.accessToken,

    // 액션
    syncUser,
    syncAfterSignUp,
    checkAndSyncAfterSignIn,
    updateProfile,
    signOut,
    resetAuth,
  };
}

/**
 * 간단한 인증 상태만 필요한 경우를 위한 경량 훅
 *
 * @returns 기본 인증 상태
 */
export function useAuthState(): Pick<
  UseAuthReturn,
  "isAuthenticated" | "user" | "isLoading"
> {
  const authState = useReactiveVar(authStateVar);

  return {
    isAuthenticated: authState.isAuthenticated,
    user: authState.user,
    isLoading: authState.isLoading,
  };
}

// 편의를 위한 기본 익스포트
export default useAuth;
