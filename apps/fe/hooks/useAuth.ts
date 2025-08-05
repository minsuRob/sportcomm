import { useState, useEffect } from "react";
import { User } from "../lib/auth";
import { sessionManager } from "../lib/session-manager";

/**
 * 인증 상태를 관리하는 커스텀 훅
 */
export const useAuth = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [hasChatAccess, setHasChatAccess] = useState(false);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      setIsLoading(true);

      const result = await sessionManager.restoreSession();

      setIsAuthenticated(result.isAuthenticated);
      setUser(result.user);
      setHasChatAccess(result.hasChatAccess);

      console.log("🔐 인증 상태 초기화 완료:", {
        isAuthenticated: result.isAuthenticated,
        user: result.user?.nickname,
        hasChatAccess: result.hasChatAccess,
      });
    } catch (error) {
      console.error("인증 상태 초기화 실패:", error);
      setIsAuthenticated(false);
      setUser(null);
      setHasChatAccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = (userData: User) => {
    setIsAuthenticated(true);
    setUser(userData);
    // 채팅 접근 권한은 세션 매니저에서 확인
    sessionManager.checkChatAccess().then(setHasChatAccess);
  };

  const logout = async () => {
    try {
      // 세션 정리
      const { clearSession } = await import("../lib/auth");
      await clearSession();

      // Supabase 로그아웃
      const { supabaseChatClient } = await import("../lib/supabase-chat");
      await supabaseChatClient.signOut();

      // 세션 매니저 리셋
      sessionManager.reset();

      // 상태 초기화
      setIsAuthenticated(false);
      setUser(null);
      setHasChatAccess(false);

      console.log("✅ 로그아웃 완료");
    } catch (error) {
      console.error("로그아웃 중 오류 발생:", error);
    }
  };

  const refreshChatAccess = async () => {
    try {
      const success = await sessionManager.refreshSupabaseSession();
      if (success) {
        const hasAccess = await sessionManager.checkChatAccess();
        setHasChatAccess(hasAccess);
        return hasAccess;
      }
      return false;
    } catch (error) {
      console.error("채팅 접근 권한 새로고침 실패:", error);
      return false;
    }
  };

  return {
    isLoading,
    isAuthenticated,
    user,
    hasChatAccess,
    login,
    logout,
    refreshChatAccess,
    initializeAuth,
  };
};
