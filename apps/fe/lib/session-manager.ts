import { getSession } from "./auth";
import { supabaseChatClient } from "./supabase-chat";

/**
 * 세션 관리자
 *
 * 앱 시작 시 저장된 세션을 복원하고 Supabase 채팅 클라이언트를 초기화합니다.
 */
export class SessionManager {
  private static instance: SessionManager;
  private isInitialized = false;

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * 저장된 세션을 복원하고 필요한 클라이언트들을 초기화합니다.
   */
  async restoreSession(): Promise<{
    isAuthenticated: boolean;
    user: any;
    hasChatAccess: boolean;
  }> {
    if (this.isInitialized) {
      const session = await getSession();
      return {
        isAuthenticated: session.isAuthenticated,
        user: session.user,
        hasChatAccess: !!session.supabaseSession,
      };
    }

    try {
      console.log("🔄 세션 복원 시작...");

      // 저장된 세션 정보 조회
      const { token, user, supabaseSession, isAuthenticated } =
        await getSession();

      if (!isAuthenticated) {
        console.log("❌ 저장된 세션이 없습니다.");
        this.isInitialized = true;
        return {
          isAuthenticated: false,
          user: null,
          hasChatAccess: false,
        };
      }

      console.log("✅ 저장된 세션 발견:", {
        hasToken: !!token,
        hasUser: !!user,
        hasSupabaseSession: !!supabaseSession,
        userRole: user?.role,
      });

      // Supabase 채팅 클라이언트 초기화
      let hasChatAccess = false;
      if (supabaseSession) {
        try {
          await supabaseChatClient.initialize();
          await supabaseChatClient.setSession(supabaseSession);
          hasChatAccess = true;
          console.log("✅ Supabase 채팅 클라이언트 복원 완료");
        } catch (error) {
          console.error("❌ Supabase 채팅 클라이언트 복원 실패:", error);
          // 채팅 기능 실패해도 로그인 상태는 유지
        }
      } else {
        console.log("⚠️ Supabase 세션이 없어 채팅 기능을 사용할 수 없습니다.");
      }

      this.isInitialized = true;

      return {
        isAuthenticated: true,
        user,
        hasChatAccess,
      };
    } catch (error) {
      console.error("❌ 세션 복원 중 오류 발생:", error);
      this.isInitialized = true;

      return {
        isAuthenticated: false,
        user: null,
        hasChatAccess: false,
      };
    }
  }

  /**
   * 세션 초기화 상태를 재설정합니다.
   * 로그아웃 시 호출하여 다음 로그인 시 세션을 다시 복원할 수 있도록 합니다.
   */
  reset(): void {
    this.isInitialized = false;
  }

  /**
   * 현재 사용자가 채팅 기능에 접근할 수 있는지 확인합니다.
   */
  async checkChatAccess(): Promise<boolean> {
    try {
      const currentUser = await supabaseChatClient.getCurrentUser();
      return !!currentUser;
    } catch (error) {
      console.error("채팅 접근 권한 확인 실패:", error);
      return false;
    }
  }

  /**
   * Supabase 세션을 새로고침합니다.
   * 토큰이 만료되었을 때 사용할 수 있습니다.
   */
  async refreshSupabaseSession(): Promise<boolean> {
    try {
      const { supabaseSession } = await getSession();

      if (!supabaseSession) {
        console.warn("새로고침할 Supabase 세션이 없습니다.");
        return false;
      }

      // Supabase 클라이언트에서 세션 새로고침 시도
      const client = supabaseChatClient.getClient();
      if (!client) {
        console.error("Supabase 클라이언트가 초기화되지 않았습니다.");
        return false;
      }

      const { data, error } = await client.auth.refreshSession({
        refresh_token: supabaseSession.refresh_token,
      });

      if (error) {
        console.error("Supabase 세션 새로고침 실패:", error);
        return false;
      }

      if (data.session) {
        // 새로운 세션 정보로 업데이트
        const updatedSupabaseSession = {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          user_id: data.session.user.id,
          user_email: data.session.user.email || "",
        };

        // 기존 세션 정보 유지하면서 Supabase 세션만 업데이트
        const { token, user } = await getSession();
        if (token && user) {
          await import("./auth").then(({ saveSession }) =>
            saveSession(token, user, updatedSupabaseSession)
          );
        }

        console.log("✅ Supabase 세션 새로고침 완료");
        return true;
      }

      return false;
    } catch (error) {
      console.error("Supabase 세션 새로고침 중 오류 발생:", error);
      return false;
    }
  }
}

// 싱글톤 인스턴스 내보내기
export const sessionManager = SessionManager.getInstance();
