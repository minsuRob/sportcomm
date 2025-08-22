import { useEffect, useState, useCallback } from "react";
import type { User } from "@/lib/auth";
import { getSession, saveSession } from "@/lib/auth";
import { UserSyncService } from "@/lib/supabase/user-sync";
import { getValidToken } from "@/lib/auth/token-manager";

/**
 * 현재 사용자 정보를 로드/보관하는 훅
 * - 세션에서 사용자 정보를 가져오고, ADMIN이면 isAdmin 플래그를 보정합니다.
 */
export function useCurrentUser() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const load = useCallback(async () => {
    const { user } = await getSession();
    let nextUser = user ?? null;
    if (nextUser) {
      // 관리자 플래그 보정
      if (
        nextUser.role === "ADMIN" &&
        (nextUser as any).isAdmin === undefined
      ) {
        (nextUser as any).isAdmin = true;
      }

      try {
        // 서버에서 최신 사용자 정보(포인트 포함) 동기화
        const token = await getValidToken();
        if (token) {
          const remoteUser = await UserSyncService.getCurrentUserInfo(token);
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
        }
      } catch (e) {
        // 네트워크 실패 시 로컬 값 유지
        console.warn(
          "useCurrentUser: 원격 사용자 동기화 실패",
          (e as any)?.message,
        );
      }
    }
    setCurrentUser(nextUser);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { currentUser, reload: load } as const;
}

export default useCurrentUser;
