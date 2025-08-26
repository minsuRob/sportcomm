import { useEffect, useState, useCallback, useRef } from "react";
import type { User } from "@/lib/auth";
import { getSession, saveSession } from "@/lib/auth";
import { UserSyncService } from "@/lib/supabase/user-sync";
import { getValidToken, getCurrentSession, isTokenValid } from "@/lib/auth/token-manager";

/**
 * 현재 사용자 정보를 로드/보관하는 훅 (JWT 만료 시간 고려 최적화)
 * - 세션에서 사용자 정보를 가져오고, ADMIN이면 isAdmin 플래그를 보정합니다.
 * - JWT 토큰 만료 시간을 고려하여 스마트 동기화를 수행합니다.
 * - 토큰이 유효한 동안은 캐시를 사용하고, 만료 임박 시 자동 갱신합니다.
 * - 메모리 캐싱으로 동일한 사용자 정보 중복 로드를 방지합니다.
 */
export function useCurrentUser() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const mountedRef = useRef(true);

  const userCacheRef = useRef<User | null>(null);
  const lastTokenExpiryRef = useRef<number>(0);

  const load = useCallback(async (forceSync = false) => {
    if (isLoading && !forceSync) return; // 중복 로딩 방지

    setIsLoading(true);

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
          shouldSync = shouldSync ||
            tokenChanged ||                    // 토큰이 갱신됨
            timeUntilExpiry < 600 ||          // 토큰이 10분 이내 만료
            !userCacheRef.current ||          // 캐시된 사용자 없음
            userCacheRef.current.id !== nextUser.id; // 다른 사용자

          lastTokenExpiryRef.current = tokenExpiresAt;
        } else {
          // 토큰 정보가 없으면 항상 동기화
          shouldSync = true;
        }

        // 캐시된 사용자와 동일하고 토큰이 유효하면 캐시 사용
        if (userCacheRef.current &&
            userCacheRef.current.id === nextUser.id &&
            !shouldSync &&
            isTokenValid()) {
          setCurrentUser(userCacheRef.current);
          setIsLoading(false);
          return;
        }

        if (shouldSync) {
          try {
            // 서버에서 최신 사용자 정보(포인트 포함) 동기화
            const token = await getValidToken();
            if (token && mountedRef.current) {
              const remoteUser = await UserSyncService.getCurrentUserInfo(token);

              if (!mountedRef.current) return;

              // 로컬 세션 업데이트 (points 등 최신화)
              await saveSession({
                id: remoteUser.id,
                nickname: remoteUser.nickname,
                email: (nextUser as any).email,
                role: remoteUser.role,
                profileImageUrl: remoteUser.profileImageUrl,
                bio: remoteUser.bio,
                myTeams: (nextUser as any).myTeams,
                userTeams: undefined,
                points: (remoteUser as any).points ?? (nextUser as any).points ?? 0,
              } as any);

              nextUser = (await getSession()).user;
              setLastSyncTime(Date.now());
            }
          } catch (e) {
            // 네트워크 실패 시 로컬 값 유지
            console.warn(
              "useCurrentUser: 원격 사용자 동기화 실패",
              (e as any)?.message,
            );

            // 토큰이 완전히 만료된 경우 로그아웃 처리
            if ((e as any)?.message?.includes('refresh_token_not_found') ||
                (e as any)?.message?.includes('invalid_grant')) {
              console.log("JWT 토큰 만료, 사용자 정보 초기화");
              nextUser = null;
              userCacheRef.current = null;
            }
          }
        }
      }

      if (mountedRef.current) {
        userCacheRef.current = nextUser;
        setCurrentUser(nextUser);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [lastSyncTime, isLoading]);

  useEffect(() => {
    mountedRef.current = true;
    void load();

    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  return {
    currentUser,
    reload: load,
    isLoading,
    lastSyncTime: lastSyncTime > 0 ? new Date(lastSyncTime) : null,
    isTokenValid: isTokenValid(),
    tokenExpiresAt: getCurrentSession()?.expires_at ?
      new Date(getCurrentSession()!.expires_at! * 1000) : null
  } as const;
}

export default useCurrentUser;
