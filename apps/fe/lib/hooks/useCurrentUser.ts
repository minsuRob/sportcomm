import { useEffect, useState, useCallback } from "react";
import type { User } from "@/lib/auth";
import { getSession } from "@/lib/auth";

/**
 * 현재 사용자 정보를 로드/보관하는 훅
 * - 세션에서 사용자 정보를 가져오고, ADMIN이면 isAdmin 플래그를 보정합니다.
 */
export function useCurrentUser() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const load = useCallback(async () => {
    const { user } = await getSession();
    if (user) {
      // 관리자 플래그 보정
      if (user.role === "ADMIN" && (user as any).isAdmin === undefined) {
        (user as any).isAdmin = true;
      }
    }
    setCurrentUser(user ?? null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { currentUser, reload: load } as const;
}

export default useCurrentUser;
