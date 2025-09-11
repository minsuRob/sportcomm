import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  PropsWithChildren,
} from "react";
import type { User } from "@/lib/auth";
import { getSession, saveSession, clearSession } from "@/lib/auth"; // 기존 세션 유틸 (스토리지 + 이벤트 브로드캐스트)
import {
  getValidToken,
  ensureFreshSession,
  signOut as supabaseSignOut,
} from "@/lib/auth/token-manager";
import { UserSyncService } from "@/lib/supabase/user-sync";
import {
  onSessionChange,
  bootstrapSession,
  emitSessionChange,
} from "@/lib/auth/user-session-events";

/**
 * AuthContext 내부에서 제공할 값의 타입
 */
export interface AuthContextValue {
  /** 현재 로그인한 사용자 정보 (없으면 null) */
  user: User | null;
  /** 인증 여부 */
  isAuthenticated: boolean;
  /** 로딩(부트스트랩/리로드) 상태 */
  isLoading: boolean;
  /** 액세스 토큰 (없을 수 있음) */
  accessToken: string | null;
  /** 사용자 정보 강제 새로고침 (원격 동기화) */
  reloadUser: (options?: { force?: boolean }) => Promise<void>;
  /** 부분 사용자 정보 업데이트 (로컬 세션 + 브로드캐스트) */
  updateUser: (partial: Partial<User>) => Promise<void>;
  /** 로그아웃 */
  signOut: () => Promise<void>;
  /** 마지막으로 사용자 정보를 성공적으로 동기화한 시각 */
  lastSyncedAt: Date | null;
}

/**
 * 내부 Context 생성
 */
const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * 사용자 경험 개선 메모:
 *  - 새로고침/앱 재시작 시 짧은 시간 동안 flicker(=로그인 풀렸다가 다시 로그인) 현상을 줄이기 위해
 *    1) 스토리지 + Supabase 세션 동시 조회
 *    2) 최소 보장 시간(옵션)을 두고 UI 업데이트
 *  - 여기서는 최소한의 구현으로 단일 Provider 로직만 제공 (추후 Skeleton 도입 가능)
 */

interface AuthProviderProps {
  /**
   * 최초 부트스트랩 후 UI 반영까지 지연시킬 최소 시간 (ms)
   * - 값이 너무 크면 초기 렌더 지연 → 0 권장
   */
  minBootstrapDelayMs?: number;
  /**
   * 디버그 로그 출력 여부
   */
  debug?: boolean;
}

/**
 * AuthProvider
 * - 앱 전역에서 단 하나만 사용 (_layout.tsx 에서 루트로 감싸기)
 * - feed / profile / 기타 화면은 useAuth() 로 간단히 접근
 */
export function AuthProvider({
  children,
  minBootstrapDelayMs = 0,
  debug = false,
}: PropsWithChildren<AuthProviderProps>) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  // --- 동시 호출 합류 제어용 Ref ---
  const reloadInFlightRef = useRef<Promise<void> | null>(null);
  const bootstrappedRef = useRef<boolean>(false);

  /**
   * 디버그 로그 헬퍼
   */
  const log = useCallback(
    (...args: any[]) => {
      if (debug) {
        // eslint-disable-next-line no-console
        console.log("[AuthProvider]", ...args);
      }
    },
    [debug],
  );

  /**
   * (1) 초기 부트스트랩
   * - 스토리지 세션 & Supabase 세션 동기화
   * - 필요 시 원격 사용자 정보 최신화
   */
  const bootstrap = useCallback(async () => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    const start = Date.now();
    setIsLoading(true);
    log("부트스트랩 시작");

    try {
      // 1) 로컬 세션 조회 (토큰은 token-manager 경유 → supabase 세션)
      const { token, user: storedUser, isAuthenticated } = await getSession();

      if (storedUser) {
        setUser(storedUser);
      }
      if (token) {
        setAccessToken(token);
      }

      // 2) Supabase 세션 강제 최신화 (토큰 없는데 cached user 가 있을 수도 있음)
      if (!token) {
        await ensureFreshSession();
        const refreshedToken = await getValidToken();
        if (refreshedToken) {
          setAccessToken(refreshedToken);
        }
      }

      // 3) 사용자 정보가 없지만 토큰이 있는 경우 원격 조회
      if (!storedUser) {
        const latestToken = await getValidToken();
        if (latestToken) {
          try {
            const remoteUser =
              await UserSyncService.getCurrentUserInfo(latestToken);
            await saveSession(remoteUser as any); // 타입 불일치(UserSyncService.User -> auth.User) 해결을 위해 캐스팅
            setUser(remoteUser as any); // myTeams 구조 차이로 인한 TS 오류 방지
            setLastSyncedAt(new Date());
            log("원격 사용자 정보 부트스트랩 성공");
            // bootstrap 이벤트 (초기 사용자 정보 브로드캐스트)
            bootstrapSession(remoteUser, latestToken);
          } catch (e) {
            log(
              "원격 사용자 정보 조회 실패 (비로그인 or 신규):",
              (e as any)?.message,
            );
          }
        }
      } else {
        // 저장된 사용자 정보를 bootstrap 이벤트로 알림
        bootstrapSession(storedUser, token);
      }
    } catch (e) {
      log("부트스트랩 중 오류 발생:", (e as any)?.message);
    } finally {
      const elapsed = Date.now() - start;
      const remain =
        minBootstrapDelayMs > elapsed ? minBootstrapDelayMs - elapsed : 0;
      if (remain > 0) {
        await new Promise((r) => setTimeout(r, remain));
      }
      setIsLoading(false);
      log("부트스트랩 완료");
    }
  }, [log, minBootstrapDelayMs]);

  /**
   * (2) 세션 이벤트 구독
   * - login / logout / update / refresh 등 즉시 반영
   */
  useEffect(() => {
    const off = onSessionChange(({ user, token, reason }) => {
      log("세션 이벤트 수신:", reason, {
        hasUser: !!user,
        hasToken: !!token,
      });
      if (token) setAccessToken(token);
      setUser(user);

      if (reason === "update" || reason === "refresh" || reason === "login") {
        setLastSyncedAt(new Date());
      }
      if (reason === "logout") {
        setLastSyncedAt(null);
      }
    });
    return off;
  }, [log]);

  /**
   * (3) 마운트 시 부트스트랩
   */
  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  /**
   * 사용자 정보 원격 새로고침
   * - force=true 이거나 현재 사용자 존재 + 토큰 존재 시 수행
   * - 동시 호출 합류(in-flight) 처리
   */
  const reloadUser = useCallback(
    async (options?: { force?: boolean }) => {
      const force = options?.force ?? false;

      if (reloadInFlightRef.current) {
        log("이미 사용자 새로고침 진행 중 - 합류");
        return reloadInFlightRef.current;
      }

      if (!force && !user) {
        log("새로고침 스킵: 사용자 없음 (force=false)");
        return;
      }

      reloadInFlightRef.current = (async () => {
        setIsLoading(true);
        try {
          const token = await getValidToken();
          // 토큰이 완전히 없으면 브라우저 새로고침 직후 Supabase 초기화 지연 가능성 → 한번 더 ensure
          if (!token) {
            await ensureFreshSession();
          }
          const finalToken = (await getValidToken()) || null;

          if (!finalToken) {
            log("토큰 없음 -> 비로그인 상태로 처리");
            return;
          }

          const remoteUser =
            await UserSyncService.getCurrentUserInfo(finalToken);

          await saveSession(remoteUser as any); // 타입 캐스팅으로 auth.User 호환 처리
          setUser(remoteUser as any); // myTeams 필드 구조 차이 해결
          setAccessToken(finalToken);
          setLastSyncedAt(new Date());

          log("사용자 새로고침 성공");
        } catch (e) {
          log("사용자 새로고침 실패:", (e as any)?.message);
        } finally {
          setIsLoading(false);
          reloadInFlightRef.current = null;
        }
      })();

      return reloadInFlightRef.current;
    },
    [user, log],
  );

  /**
   * 부분 사용자 정보 업데이트
   * - 로컬 세션 + 이벤트 브로드캐스트 (saveSession 내부)
   */
  const updateUser = useCallback(
    async (partial: Partial<User>) => {
      if (!user) return;
      const merged: User = { ...user, ...partial };
      await saveSession(merged);
      setUser(merged);
      // saveSession 이 'update' reason 으로 emit 하므로 별도 emit 불필요
      log("사용자 로컬 업데이트 완료");
    },
    [user, log],
  );

  /**
   * 로그아웃
   * - clearSession 호출 (스토리지 + 이벤트)
   * - Supabase signOut (token-manager signOut 내장)
   */
  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      await clearSession(); // 내부에서 logout 이벤트 브로드캐스트
      await supabaseSignOut();
      setUser(null);
      setAccessToken(null);
      log("로그아웃 완료");
    } catch (e) {
      log("로그아웃 중 오류:", (e as any)?.message);
    } finally {
      setIsLoading(false);
    }
  }, [log]);

  /**
   * Context Value 메모이제이션
   */
  const value: AuthContextValue = useMemo(
    () => ({
      user,
      isAuthenticated: !!user && !!accessToken,
      isLoading,
      accessToken,
      reloadUser,
      updateUser,
      signOut,
      lastSyncedAt,
    }),
    [
      user,
      accessToken,
      isLoading,
      reloadUser,
      updateUser,
      signOut,
      lastSyncedAt,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth 훅
 * - Consumer 컴포넌트에서 간단히 인증 정보 접근
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error(
      "useAuth 훅은 반드시 <AuthProvider> 하위에서만 사용할 수 있습니다.",
    );
  }
  return ctx;
}

/**
 * 선택: 사용자 객체만 간단히 가져오는 경량 훅
 */
export function useAuthUser(): User | null {
  return useAuth().user;
}

/**
 * (필요 시) 특정 역할 권한 체크 헬퍼
 */
export function useIsAdmin(): boolean {
  const { user } = useAuth();
  return !!user?.role && user.role === "ADMIN";
}

/**
 * (선택) 즉시 강제 동기화 + 결과 반환 유틸
 * - 외부 비동기 로직에서 await reloadUser({ force: true }) 대신 사용
 */
export async function forceReloadAuthUser(): Promise<void> {
  emitSessionChange({
    user: null,
    token: null,
    reason: "refresh",
  }); // UI 에 따라 로딩 표시 유도(옵션)
}

/**
 * 커밋 메세지: refactor(auth): 전역 AuthProvider 추가 및 세션 관리 단일화
 */
