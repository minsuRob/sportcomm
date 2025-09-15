/**
 * 통합 인증 훅 (AuthContext 기반, 안정화 리팩토링)
 *
 * 목적:
 * - Apollo Reactive Var / 커스텀 리스너 중복 의존을 제거하고
 *   전역 AuthContext를 단일 진실 소스로 사용하여 안정성을 높입니다.
 * - 인스타그램/트위터류 앱처럼 "세션은 최대한 보존하고, 필요 시 강제 동기화" 패턴으로 동작합니다.
 *
 * 핵심 전략:
 * - 세션/사용자 상태: AuthProvider(AuthContext)만이 소유
 * - 외부 액션(동기화, 프로필 수정)은 서버 호출 후 reloadUser({ force: true })로 일관 동기화
 * - 토큰은 token-manager의 getValidToken/ensureFreshSession을 통해 안정적으로 확보
 *
 * 주의:
 * - 더 이상 Apollo ReactiveVar(authStateVar), AuthEventListener에 직접 의존하지 않습니다.
 * - _layout.tsx 루트에서 <AuthProvider>로 앱을 감싸는 전제가 필요합니다.
 */

import { useCallback, useMemo } from "react";
import {
  useAuth as useAuthContext,
  type AuthContextValue,
} from "@/lib/auth/context/AuthContext";
import { getValidToken, ensureFreshSession } from "@/lib/auth/token-manager";
import {
  UserSyncService,
  type SyncUserInput,
  type User as GqlUser,
} from "../supabase/user-sync";

/**
 * (타입 호환) 과거 AuthStore.AuthState와 동일 시그니처 유지
 * - 런타임 의존 제거를 위해 로컬에서 타입만 재정의
 */
export interface AuthState {
  isAuthenticated: boolean;
  user: GqlUser | null;
  isLoading: boolean;
  isSynced: boolean;
  accessToken: string | null;
}

/**
 * 사용자 동기화 결과 타입 (기존 EnhancedUserSyncService와 호환)
 */
export interface SyncResult {
  success: boolean;
  user?: GqlUser;
  error?: string;
  wasAlreadySynced?: boolean;
}

/**
 * 인증 훅 반환 타입 (기존 시그니처 최대한 유지)
 */
export interface UseAuthReturn {
  // 상태
  authState: AuthState;
  isAuthenticated: boolean;
  user: GqlUser | null;
  isLoading: boolean;
  isSynced: boolean;
  accessToken: string | null;

  // 액션
  syncUser: (input: SyncUserInput, forceSync?: boolean) => Promise<SyncResult>;
  syncAfterSignUp: (userProfile: {
    id: string;
    nickname: string;
    email: string;
    role?: string;
  }) => Promise<SyncResult>;
  checkAndSyncAfterSignIn: () => Promise<SyncResult>;
  updateProfile: (input: {
    nickname?: string;
    profileImageUrl?: string;
    bio?: string;
  }) => Promise<SyncResult>;
  signOut: () => Promise<void>;
  resetAuth: () => Promise<void>;
}

/**
 * 인증 훅 옵션
 * - 리스너 자동 시작 등 과거 옵션은 제거됨 (AuthProvider가 단일 소스로 관리)
 */
export interface UseAuthOptions {
  enableDebugLog?: boolean;
  onSyncSuccess?: (user: GqlUser) => void;
  onError?: (error: Error) => void;
}

/**
 * 내부 로그 헬퍼
 */
function dbg(enabled: boolean, ...args: any[]) {
  if (enabled) {
    // eslint-disable-next-line no-console
    //console.log("[useAuth]", ...args);
  }
}

/**
 * 안정화된 인증 훅 구현
 * - 전역 AuthContext를 단일 소스로 사용
 * - 서버/백엔드 동기화는 UserSyncService 사용
 * - 세션 토큰은 token-manager 경유
 */
export function useAuth(options: UseAuthOptions = {}): UseAuthReturn {
  const { enableDebugLog = false, onSyncSuccess, onError } = options;

  // 전역 AuthContext (단일 진실)
  const {
    user: ctxUser,
    isAuthenticated: ctxIsAuthenticated,
    isLoading: ctxIsLoading,
    accessToken: ctxAccessToken,
    reloadUser,
    updateUser: ctxUpdateUser,
    signOut: ctxSignOut,
    lastSyncedAt,
  }: AuthContextValue = useAuthContext();

  // authState(레거시 호환) 구성
  const authState: AuthState = useMemo(
    () => ({
      isAuthenticated: ctxIsAuthenticated,
      user: (ctxUser as unknown as GqlUser) || null, // 런타임 객체는 호환, 타입 캐스팅
      isLoading: ctxIsLoading,
      isSynced: !!lastSyncedAt,
      accessToken: ctxAccessToken,
    }),
    [ctxIsAuthenticated, ctxUser, ctxIsLoading, ctxAccessToken, lastSyncedAt],
  );

  /**
   * 사용자 동기화
   * - 백엔드 GraphQL syncUser 호출 후 reloadUser(force)로 전역 상태 최신화
   */
  const syncUser = useCallback(
    async (
      input: SyncUserInput,
      forceSync: boolean = false,
    ): Promise<SyncResult> => {
      try {
        // 유효 토큰 확보 (필요 시 강제 세션 최신화)
        let token = await getValidToken();
        if (!token) {
          await ensureFreshSession();
          token = await getValidToken();
        }
        if (!token) {
          const err = new Error(
            "액세스 토큰이 없습니다. 다시 로그인해 주세요.",
          );
          onError?.(err);
          return { success: false, error: err.message };
        }

        dbg(enableDebugLog, "사용자 동기화 시작", { input, forceSync });

        // 서버 동기화
        const serverUser = await UserSyncService.syncUser(input, token);

        // 전역 상태 강제 최신화 (서버 값 기준)
        await reloadUser({ force: true });

        if (serverUser && onSyncSuccess) {
          onSyncSuccess(serverUser);
        }

        return { success: true, user: serverUser, wasAlreadySynced: false };
      } catch (e) {
        const err = e as Error;
        dbg(enableDebugLog, "사용자 동기화 실패", err.message);
        onError?.(err);
        return { success: false, error: err.message, wasAlreadySynced: false };
      }
    },
    [enableDebugLog, onError, onSyncSuccess, reloadUser],
  );

  /**
   * 회원가입 후 동기화
   * - 서버에 최소 프로필 생성/보장 -> 전역 상태 재동기화
   */
  const syncAfterSignUp = useCallback(
    async (userProfile: {
      id: string;
      nickname: string;
      email: string;
      role?: string;
    }): Promise<SyncResult> => {
      try {
        let token = await getValidToken();
        if (!token) {
          await ensureFreshSession();
          token = await getValidToken();
        }
        if (!token) {
          const err = new Error(
            "액세스 토큰이 없습니다. 다시 로그인해 주세요.",
          );
          onError?.(err);
          return { success: false, error: err.message };
        }

        dbg(enableDebugLog, "회원가입 후 동기화 시작", { userProfile });

        const syncInput: SyncUserInput = {
          nickname: userProfile.nickname,
          role: (userProfile.role as any) || "USER",
        };

        const serverUser = await UserSyncService.syncUser(syncInput, token);

        await reloadUser({ force: true });
        if (serverUser && onSyncSuccess) onSyncSuccess(serverUser);

        return { success: true, user: serverUser, wasAlreadySynced: false };
      } catch (e) {
        const err = e as Error;
        dbg(enableDebugLog, "회원가입 후 동기화 실패", err.message);
        onError?.(err);
        return { success: false, error: err.message, wasAlreadySynced: false };
      }
    },
    [enableDebugLog, onError, onSyncSuccess, reloadUser],
  );

  /**
   * 로그인 이후 상태 확인 및 사용자 동기화
   * - 세션 토큰 확보 → 현재 사용자 정보 조회 → 전역 업데이트
   */
  const checkAndSyncAfterSignIn = useCallback(async (): Promise<SyncResult> => {
    try {
      let token = await getValidToken();
      if (!token) {
        await ensureFreshSession();
        token = await getValidToken();
      }
      if (!token) {
        const err = new Error("액세스 토큰이 없습니다. 다시 로그인해 주세요.");
        onError?.(err);
        return { success: false, error: err.message };
      }

      dbg(enableDebugLog, "로그인 후 사용자 확인/동기화 시작");

      const serverUser = await UserSyncService.getCurrentUserInfo(token);

      // 서버의 최신 사용자 정보를 전역에 반영
      // - 안전을 위해 강제 리로드로 일관성 보장
      await reloadUser({ force: true });
      if (serverUser && onSyncSuccess) onSyncSuccess(serverUser);

      return { success: true, user: serverUser, wasAlreadySynced: false };
    } catch (e) {
      const err = e as Error;
      dbg(enableDebugLog, "로그인 후 사용자 확인/동기화 실패", err.message);
      onError?.(err);
      return { success: false, error: err.message, wasAlreadySynced: false };
    }
  }, [enableDebugLog, onError, onSyncSuccess, reloadUser]);

  /**
   * 프로필 업데이트
   * - 서버 업데이트 → 전역 강제 리로드
   */
  const updateProfile = useCallback(
    async (input: {
      nickname?: string;
      profileImageUrl?: string;
      bio?: string;
    }): Promise<SyncResult> => {
      try {
        let token = await getValidToken();
        if (!token) {
          await ensureFreshSession();
          token = await getValidToken();
        }
        if (!token) {
          const err = new Error(
            "액세스 토큰이 없습니다. 다시 로그인해 주세요.",
          );
          onError?.(err);
          return { success: false, error: err.message };
        }

        dbg(enableDebugLog, "프로필 업데이트 시작", input);

        const updated = await UserSyncService.updateUserProfile(input, token);

        // 서버 값으로 전역 동기화
        // 일부 화면에서 즉시 반영이 필요하다면 부분 업데이트도 병행 가능:
        // await ctxUpdateUser(updated as any);
        await reloadUser({ force: true });

        return { success: true, user: updated };
      } catch (e) {
        const err = e as Error;
        dbg(enableDebugLog, "프로필 업데이트 실패", err.message);
        onError?.(err);
        return { success: false, error: err.message };
      }
    },
    [enableDebugLog, onError, reloadUser, ctxUpdateUser],
  );

  /**
   * 로그아웃
   * - AuthContext에 위임 (세션/스토리지/브로드캐스트 일원화)
   */
  const signOut = useCallback(async (): Promise<void> => {
    dbg(enableDebugLog, "로그아웃 호출");
    await ctxSignOut();
  }, [ctxSignOut, enableDebugLog]);

  /**
   * 인증 상태 리셋
   * - 현재 구현에서는 로그아웃과 동일 처리
   */
  const resetAuth = useCallback(async (): Promise<void> => {
    dbg(enableDebugLog, "인증 상태 리셋 호출");
    await ctxSignOut();
  }, [ctxSignOut, enableDebugLog]);

  // 반환 시그니처 (레거시 호환)
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
 */
export function useAuthState(): Pick<
  UseAuthReturn,
  "isAuthenticated" | "user" | "isLoading"
> {
  const { isAuthenticated, user, isLoading } = useAuth({
    enableDebugLog: false,
  });
  return { isAuthenticated, user, isLoading };
}

// 편의 기본 익스포트
export default useAuth;

/*
커밋 메세지: refactor(auth): useAuth 훅을 AuthContext 단일 소스 기반으로 리팩토링하여 중복 의존 제거 및 안정성 향상
*/
