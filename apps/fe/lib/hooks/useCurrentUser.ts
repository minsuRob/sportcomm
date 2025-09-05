import { useEffect, useState, useCallback, useRef } from "react";
import type { User } from "@/lib/auth";
import { getSession, saveSession } from "@/lib/auth";
import { UserSyncService } from "@/lib/supabase/user-sync";
import {
  getValidToken,
  getCurrentSession,
  isTokenValid,
} from "@/lib/auth/token-manager";
import { onSessionChange } from "@/lib/auth/user-session-events";
/**
 * 전역(모듈 레벨) 사용자 캐시
 * - 화면 이동 시 훅이 재마운트되어도 즉시 이전 사용자 정보를 제공하여 UI 깜빡임(flicker) 제거
 * - __globalInFlight 로 최초/동시 로드 합류
 */
let __globalUserCache: User | null = null;
let __globalLastTokenExpiry: number = 0;
let __globalInFlight: Promise<void> | null = null;

/**
 * 현재 사용자 정보를 로드/보관하는 훅 (JWT 만료 시간 고려 최적화)
 * - 세션에서 사용자 정보를 가져오고, ADMIN이면 isAdmin 플래그를 보정합니다.
 * - JWT 토큰 만료 시간을 고려하여 스마트 동기화를 수행합니다.
 * - 토큰이 유효한 동안은 캐시를 사용하고, 만료 임박 시 자동 갱신합니다.
 * - 메모리 캐싱으로 동일한 사용자 정보 중복 로드를 방지합니다.
 */
export function useCurrentUser() {
  // 초기값을 전역 캐시로 설정 (이미 로드된 경우 즉시 사용)
  const [currentUser, setCurrentUser] = useState<User | null>(
    __globalUserCache,
  );
  const [lastSyncTime, setLastSyncTime] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const mountedRef = useRef(true);

  const userCacheRef = useRef<User | null>(null);
  const lastTokenExpiryRef = useRef<number>(__globalLastTokenExpiry);

  // --- 추가: 중복/폭풍 호출 방지용 Ref & 상수 ---
  const lastFetchRef = useRef<number>(0); // 마지막 네트워크 호출 시각 (ms)
  const inFlightRef = useRef<Promise<void> | null>(null); // 진행 중 호출 Promise (동일 호출 합류)
  const isLoadingRef = useRef<boolean>(false); // 최신 로딩 상태 (useCallback 폐쇄 변수 stale 방지)
  const THROTTLE_INTERVAL_MS = 5000; // 동일 사용자 정보 재조회 최소 간격(5초)

  const load = useCallback(async (forceSync = false) => {
    // 1-a) 전역 in-flight 있으면 합류 (강제 동기화 제외)
    if (!forceSync && __globalInFlight) {
      await __globalInFlight;
      if (userCacheRef.current) setCurrentUser(userCacheRef.current);
      return;
    }
    // 1-b) 훅 레벨 진행 중 호출 합류
    if (!forceSync && inFlightRef.current) {
      await inFlightRef.current;
      return;
    }

    // 2) UI 로딩 상태(stale closure 방지용 ref) 확인
    if (isLoadingRef.current && !forceSync) return;

    // 3) 호출 빈도 제한 (THROTTLE)
    const nowMs = Date.now();
    if (!forceSync && nowMs - lastFetchRef.current < THROTTLE_INTERVAL_MS) {
      // 캐시가 있으면 그대로 반환
      if (userCacheRef.current) {
        setCurrentUser(userCacheRef.current);
      }
      return;
    }

    // 실제 수행 로직을 Promise로 감싸 inFlightRef에 저장 (동시 호출 합류)
    const exec = (async () => {
      isLoadingRef.current = true;
      setIsLoading(true);
      lastFetchRef.current = nowMs; // 네트워크 시도 시각 기록

      try {
        const { user } = await getSession();
        let nextUser = user ?? null;

        if (!mountedRef.current) return;

        if (nextUser) {
          // 관리자 플래그 보정
          if (
            nextUser.role === "ADMIN" &&
            (nextUser as any).isAdmin === undefined
          ) {
            (nextUser as any).isAdmin = true;
          }

          // JWT 토큰 기반 동기화 필요성 판단
          const currentSession = getCurrentSession();
          const now = Math.floor(Date.now() / 1000);
          let shouldSync = forceSync;

          if (currentSession?.expires_at) {
            const tokenExpiresAt = currentSession.expires_at;
            const timeUntilExpiry = tokenExpiresAt - now;
            const tokenChanged = lastTokenExpiryRef.current !== tokenExpiresAt;

            // 다음 조건 중 하나라도 만족하면 동기화
            shouldSync =
              shouldSync ||
              tokenChanged || // 토큰이 갱신됨
              timeUntilExpiry < 600 || // 토큰이 10분 이내 만료
              !userCacheRef.current || // 캐시된 사용자 없음
              userCacheRef.current.id !== nextUser.id; // 다른 사용자

            lastTokenExpiryRef.current = tokenExpiresAt;
            __globalLastTokenExpiry = tokenExpiresAt;
          } else {
            // 토큰 정보가 없으면 항상 동기화
            shouldSync = true;
          }

          // 캐시된 사용자와 동일하고 토큰이 유효하면 캐시 사용
          if (
            userCacheRef.current &&
            userCacheRef.current.id === nextUser.id &&
            !shouldSync &&
            isTokenValid()
          ) {
            setCurrentUser(userCacheRef.current);
            return;
          }

          if (shouldSync) {
            try {
              // 서버에서 최신 사용자 정보(포인트 포함) 동기화
              const token = await getValidToken();
              if (token && mountedRef.current) {
                const remoteUser =
                  await UserSyncService.getCurrentUserInfo(token);

                if (!mountedRef.current) return;

                // 로컬 세션 업데이트 (포인트 및 myTeams 최신화)
                await saveSession({
                  id: remoteUser.id,
                  nickname: remoteUser.nickname,
                  email: (nextUser as any).email,
                  role: remoteUser.role,
                  profileImageUrl: remoteUser.profileImageUrl,
                  bio: remoteUser.bio,
                  myTeams:
                    (remoteUser as any).myTeams ?? (nextUser as any).myTeams,
                  userTeams: undefined,
                  points:
                    (remoteUser as any).points ?? (nextUser as any).points ?? 0,
                } as any);

                nextUser = (await getSession()).user;
                setLastSyncTime(Date.now()); // UI 참고용 (effect 재호출 X)
              }
            } catch (e) {
              // 네트워크 실패 시 로컬 값 유지
              console.warn(
                "useCurrentUser: 원격 사용자 동기화 실패",
                (e as any)?.message,
              );

              // 토큰이 완전히 만료된 경우 로그아웃 처리
              if (
                (e as any)?.message?.includes("refresh_token_not_found") ||
                (e as any)?.message?.includes("invalid_grant")
              ) {
                console.log("JWT 토큰 만료, 사용자 정보 초기화");
                nextUser = null;
                userCacheRef.current = null;
              }
            }
          }
        }

        if (mountedRef.current) {
          userCacheRef.current = nextUser;
          __globalUserCache = nextUser;
          setCurrentUser(nextUser);
        }
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
        isLoadingRef.current = false;
        inFlightRef.current = null; // 진행 중 표시 해제
      }
    })();

    inFlightRef.current = exec;
    __globalInFlight = exec;
    await exec;
    __globalInFlight = null;
  }, []); // 의존성 제거: 내부는 ref 기반 상태로 자체 관리 (불필요한 재생성/재호출 방지)

  // (중복되어 남아있던 이전 로직 블록 제거됨: 위에서 개선된 load 구현만 사용)

  // 초기 마운트 시 1회 로드
  useEffect(() => {
    mountedRef.current = true;
    void load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  /**
   * 세션 변경 이벤트 구독
   * - 로그인/로그아웃/프로필 업데이트 시 즉시 currentUser 반영
   * - logout 시 토큰 만료정보 초기화
   */
  useEffect(() => {
    const off = onSessionChange(({ user, reason }) => {
      userCacheRef.current = user;
      __globalUserCache = user;
      setCurrentUser(user);
      if (reason === "logout") {
        lastTokenExpiryRef.current = 0;
        __globalLastTokenExpiry = 0;
      }
    });
    return off;
  }, []);

  return {
    currentUser,
    reload: load,
    isLoading,
    lastSyncTime: lastSyncTime > 0 ? new Date(lastSyncTime) : null,
    isTokenValid: isTokenValid(),
    tokenExpiresAt: getCurrentSession()?.expires_at
      ? new Date(getCurrentSession()!.expires_at! * 1000)
      : null,
  } as const;
}

export default useCurrentUser;
