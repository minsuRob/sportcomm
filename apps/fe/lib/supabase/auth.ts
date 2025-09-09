/**
 * Supabase 인증 서비스
 *
 * 최신 Supabase Auth를 사용하여 회원가입, 로그인, 로그아웃 등의 인증 기능을 제공합니다.
 * GraphQL 뮤테이션 대신 Supabase Auth를 직접 사용합니다.
 */

import { supabase } from "./client";
import type {
  AuthError,
  AuthResponse,
  SignUpWithPasswordCredentials,
  SignInWithPasswordCredentials,
} from "@supabase/supabase-js";

/**
 * 회원가입 입력 데이터 타입
 */
export interface RegisterInput {
  email: string;
  password: string;
  nickname: string;
  confirmPassword?: string;
}

/**
 * 로그인 입력 데이터 타입
 */
export interface LoginInput {
  email: string;
  password: string;
}

/**
 * 인증 응답 타입
 */
export interface AuthResult {
  user: any | null;
  session: any | null;
  error: AuthError | null;
}

/**
 * 사용자 프로필 타입
 */
export interface UserProfile {
  id: string;
  nickname: string;
  email: string;
  role: string;
  profileImageUrl?: string;
  myTeams?: Array<{
    team: {
      id: string;
      name: string;
      logoUrl?: string;
    };
  }>;
}

/**
 * Supabase Auth 서비스 클래스
 */
export class SupabaseAuthService {
  /**
   * 회원가입
   * @param input 회원가입 정보
   * @returns 인증 결과
   */
  static async signUp(input: RegisterInput): Promise<AuthResult> {
    try {
      console.log("🔄 Supabase 회원가입 시작:", {
        email: input.email,
        nickname: input.nickname,
      });

      // 패스워드 확인 검증
      if (input.confirmPassword && input.password !== input.confirmPassword) {
        return {
          user: null,
          session: null,
          error: {
            message: "비밀번호가 일치하지 않습니다.",
            name: "ValidationError",
            status: 400,
          } as AuthError,
        };
      }

      // Supabase Auth를 사용한 회원가입
      const credentials: SignUpWithPasswordCredentials = {
        email: input.email,
        password: input.password,
        options: {
          data: {
            nickname: input.nickname,
            role: "USER", // 기본 역할 설정
          },
        },
      };

      const { data, error } = await supabase.auth.signUp(credentials);

      if (error) {
        console.error("❌ Supabase 회원가입 실패:", error);
        return {
          user: null,
          session: null,
          error,
        };
      }

      console.log("✅ Supabase 회원가입 성공:", data.user?.id);

      // 사용자 프로필 정보 구성
      const userProfile: UserProfile | null = data.user
        ? {
            id: data.user.id,
            nickname: data.user.user_metadata?.nickname || input.nickname,
            email: data.user.email || input.email,
            role: data.user.user_metadata?.role || "USER",
            profileImageUrl: data.user.user_metadata?.profileImageUrl,
            myTeams: [],
          }
        : null;

      return {
        user: userProfile,
        session: data.session,
        error: null,
      };
    } catch (error) {
      console.error("❌ 회원가입 중 예외 발생:", error);
      return {
        user: null,
        session: null,
        error: {
          message:
            error instanceof Error
              ? error.message
              : "회원가입 중 오류가 발생했습니다.",
          name: "UnknownError",
          status: 500,
        } as AuthError,
      };
    }
  }

  /**
   * 로그인
   * @param input 로그인 정보
   * @returns 인증 결과
   */
  static async signIn(input: LoginInput): Promise<AuthResult> {
    try {
      console.log("🔄 Supabase 로그인 시작:", { email: input.email });

      // Supabase Auth를 사용한 로그인
      const credentials: SignInWithPasswordCredentials = {
        email: input.email,
        password: input.password,
      };

      const { data, error } =
        await supabase.auth.signInWithPassword(credentials);

      if (error) {
        console.error("❌ Supabase 로그인 실패:", error);
        return {
          user: null,
          session: null,
          error,
        };
      }

      console.log("✅ Supabase 로그인 성공:", data.user?.id);

      // 사용자 프로필 정보 구성
      const userProfile: UserProfile | null = data.user
        ? {
            id: data.user.id,
            nickname:
              data.user.user_metadata?.nickname ||
              data.user.email?.split("@")[0] ||
              "User",
            email: data.user.email || input.email,
            role: data.user.user_metadata?.role || "USER",
            profileImageUrl: data.user.user_metadata?.profileImageUrl,
            myTeams: [], // TODO: 실제 팀 정보 로드
          }
        : null;

      return {
        user: userProfile,
        session: data.session,
        error: null,
      };
    } catch (error) {
      console.error("❌ 로그인 중 예외 발생:", error);
      return {
        user: null,
        session: null,
        error: {
          message:
            error instanceof Error
              ? error.message
              : "로그인 중 오류가 발생했습니다.",
          name: "UnknownError",
          status: 500,
        } as AuthError,
      };
    }
  }

  /**
   * 로그아웃
   * @returns 로그아웃 결과
   */
  static async signOut(): Promise<{ error: AuthError | null }> {
    try {
      console.log("🔄 Supabase 로그아웃 시작");

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("❌ Supabase 로그아웃 실패:", error);
        return { error };
      }

      console.log("✅ Supabase 로그아웃 성공");
      return { error: null };
    } catch (error) {
      console.error("❌ 로그아웃 중 예외 발생:", error);
      return {
        error: {
          message:
            error instanceof Error
              ? error.message
              : "로그아웃 중 오류가 발생했습니다.",
          name: "UnknownError",
          status: 500,
        } as AuthError,
      };
    }
  }

  /**
   * 현재 사용자 세션 가져오기
   * @returns 현재 세션
   */
  static async getCurrentSession() {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("❌ 세션 조회 실패:", error);
        return { session: null, error };
      }

      return { session, error: null };
    } catch (error) {
      console.error("❌ 세션 조회 중 예외 발생:", error);
      return {
        session: null,
        error: {
          message:
            error instanceof Error
              ? error.message
              : "세션 조회 중 오류가 발생했습니다.",
          name: "UnknownError",
          status: 500,
        } as AuthError,
      };
    }
  }

  /**
   * 현재 사용자 정보 가져오기
   * @returns 현재 사용자
   */
  static async getCurrentUser(): Promise<{
    user: UserProfile | null;
    error: AuthError | null;
  }> {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.error("❌ 사용자 조회 실패:", error);
        return { user: null, error };
      }

      if (!user) {
        return { user: null, error: null };
      }

      // 사용자 프로필 정보 구성
      const userProfile: UserProfile = {
        id: user.id,
        nickname:
          user.user_metadata?.nickname || user.email?.split("@")[0] || "User",
        email: user.email || "",
        role: user.user_metadata?.role || "USER",
        profileImageUrl: user.user_metadata?.profileImageUrl,
        myTeams: [], // TODO: 실제 팀 정보 로드
      };

      return { user: userProfile, error: null };
    } catch (error) {
      console.error("❌ 사용자 조회 중 예외 발생:", error);
      return {
        user: null,
        error: {
          message:
            error instanceof Error
              ? error.message
              : "사용자 조회 중 오류가 발생했습니다.",
          name: "UnknownError",
          status: 500,
        } as AuthError,
      };
    }
  }

  /**
   * (제거됨) 중복 onAuthStateChange 래퍼
   * Supabase auto refresh 및 단일 AuthEventListener 사용 전략으로
   * 이 메서드는 더 이상 필요하지 않으므로 제거되었습니다.
   * 외부에서는 직접 supabase.auth.onAuthStateChange 또는
   * 중앙 AuthEventListener를 사용하세요.
   */
  // static onAuthStateChange(...) { /* removed to prevent duplicate listeners */ }

  /**
   * 비밀번호 재설정 이메일 전송
   * @param email 이메일 주소
   * @returns 결과
   */
  static async resetPassword(
    email: string,
  ): Promise<{ error: AuthError | null }> {
    try {
      console.log("🔄 비밀번호 재설정 이메일 전송:", email);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        console.error("❌ 비밀번호 재설정 실패:", error);
        return { error };
      }

      console.log("✅ 비밀번호 재설정 이메일 전송 성공");
      return { error: null };
    } catch (error) {
      console.error("❌ 비밀번호 재설정 중 예외 발생:", error);
      return {
        error: {
          message:
            error instanceof Error
              ? error.message
              : "비밀번호 재설정 중 오류가 발생했습니다.",
          name: "UnknownError",
          status: 500,
        } as AuthError,
      };
    }
  }

  /**
   * 이메일 확인 재전송
   * @param email 이메일 주소
   * @returns 결과
   */
  static async resendConfirmation(
    email: string,
  ): Promise<{ error: AuthError | null }> {
    try {
      console.log("🔄 이메일 확인 재전송:", email);

      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
      });

      if (error) {
        console.error("❌ 이메일 확인 재전송 실패:", error);
        return { error };
      }

      console.log("✅ 이메일 확인 재전송 성공");
      return { error: null };
    } catch (error) {
      console.error("❌ 이메일 확인 재전송 중 예외 발생:", error);
      return {
        error: {
          message:
            error instanceof Error
              ? error.message
              : "이메일 확인 재전송 중 오류가 발생했습니다.",
          name: "UnknownError",
          status: 500,
        } as AuthError,
      };
    }
  }
}

// 편의를 위한 기본 익스포트
export default SupabaseAuthService;

// 개별 함수 익스포트 (기존 GraphQL 뮤테이션과 호환성을 위해)
export const signUp = SupabaseAuthService.signUp;
export const signIn = SupabaseAuthService.signIn;
export const signOut = SupabaseAuthService.signOut;
export const getCurrentSession = SupabaseAuthService.getCurrentSession;
export const getCurrentUser = SupabaseAuthService.getCurrentUser;
// onAuthStateChange 제거됨: 중복 리스너 방지를 위해 직접 supabase.auth.onAuthStateChange 사용 권장
export const resetPassword = SupabaseAuthService.resetPassword;
export const resendConfirmation = SupabaseAuthService.resendConfirmation;
