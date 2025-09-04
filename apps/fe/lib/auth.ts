import { setItem, getItem, removeItem } from "./storage/storage";
import { UserTeam } from "./graphql/teams";
import { getValidToken, getCurrentSession } from "./auth/token-manager";
import { emitSessionChange } from "./auth/user-session-events";

const TOKEN_KEY = "sportcomm-auth-token";
const USER_KEY = "sportcomm-auth-user";

export interface User {
  id: string;
  nickname: string;
  email?: string;
  profileImageUrl?: string;
  bio?: string;
  /** 사용자의 나이 (로컬 저장 전용) */
  age?: number;
  team?: string;
  isPrivate?: boolean;
  role?: string;
  isAdmin?: boolean;
  myTeams?: UserTeam[];
  userTeams?: any[];
  /** 유저 포인트 (가상 자산). 없으면 0으로 간주 */
  points?: number;
  /** @deprecated 전역 경험치 필드 (팀별 구조 이관) - use myTeams[].experience */
  experience?: number;
  /** @deprecated 전역 레벨 필드 (팀별 구조 이관) - use myTeams[].level */
  level?: number;
  /** @deprecated 전역 남은 경험치 필드 (팀별 구조 이관) - use myTeams[].experienceToNextLevel */
  experienceToNextLevel?: number;
  /** 마지막 출석(출석체크) 일시 */
  lastAttendanceAt?: string | null;
}

export const saveSession = async (
  tokenOrUser: string | User,
  user?: User,
): Promise<void> => {
  try {
    // 두 개의 매개변수가 전달된 경우 (기존 방식)
    if (typeof tokenOrUser === "string" && user) {
      if (!tokenOrUser || !user) {
        console.error("Failed to save session: token or user is missing.", {
          token: tokenOrUser,
          user,
        });
        return;
      }
      // role이 'ADMIN'인 경우 isAdmin 속성 자동 설정
      if (user.role === "ADMIN") {
        user.isAdmin = true;
      }
      if (user.userTeams) {
        user.myTeams = user.userTeams;
        delete user.userTeams;
      }
      await setItem(TOKEN_KEY, tokenOrUser);
      // points 기본값 보정
      if (typeof (user as any).points !== "number") {
        (user as any).points = 0;
      }
      // 경험치/레벨 기본값 보정
      if (typeof (user as any).experience !== "number") {
        (user as any).experience = 0;
      }
      if (typeof (user as any).level !== "number" || (user as any).level <= 0) {
        (user as any).level = 1;
      }
      if (
        typeof (user as any).experienceToNextLevel !== "number" ||
        (user as any).experienceToNextLevel < 0
      ) {
        (user as any).experienceToNextLevel = 0;
      }
      await setItem(USER_KEY, JSON.stringify(user));
      console.log("세션 저장 완료: 토큰과 사용자 정보가 모두 저장됨");
      // --- 세션 이벤트 브로드캐스트 (로그인/토큰+유저 저장) ---
      emitSessionChange({
        user,
        token: tokenOrUser,
        reason: "login",
      });
    }
    // 사용자 정보만 업데이트하는 경우
    else if (typeof tokenOrUser === "object") {
      // role이 'ADMIN'인 경우 isAdmin 속성 자동 설정
      if (tokenOrUser.role === "ADMIN") {
        tokenOrUser.isAdmin = true;
      }
      if (tokenOrUser.userTeams) {
        tokenOrUser.myTeams = tokenOrUser.userTeams;
        delete tokenOrUser.userTeams;
      }
      // points 기본값 보정
      if (typeof (tokenOrUser as any).points !== "number") {
        (tokenOrUser as any).points = 0;
      }
      // 경험치/레벨 기본값 보정
      if (typeof (tokenOrUser as any).experience !== "number") {
        (tokenOrUser as any).experience = 0;
      }
      if (
        typeof (tokenOrUser as any).level !== "number" ||
        (tokenOrUser as any).level <= 0
      ) {
        (tokenOrUser as any).level = 1;
      }
      if (
        typeof (tokenOrUser as any).experienceToNextLevel !== "number" ||
        (tokenOrUser as any).experienceToNextLevel < 0
      ) {
        (tokenOrUser as any).experienceToNextLevel = 0;
      }
      await setItem(USER_KEY, JSON.stringify(tokenOrUser));
      // --- 세션 이벤트 브로드캐스트 (프로필/포인트 등 사용자 정보 업데이트) ---
      emitSessionChange({
        user: tokenOrUser,
        token: null,
        reason: "update",
      });
    }
  } catch (error) {
    console.error("Failed to save session", error);
    // Optionally, re-throw or handle the error as needed
  }
};

export const getSession = async (): Promise<{
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
}> => {
  try {
    // 토큰 매니저에서 유효한 토큰 가져오기 (자동 갱신 포함)
    const validToken = await getValidToken();

    // 로컬 스토리지에서 사용자 정보 가져오기
    const userJson = await getItem(USER_KEY);
    const user = userJson ? (JSON.parse(userJson) as User) : null;

    // Supabase 세션에서 사용자 정보 동기화
    const supabaseSession = getCurrentSession();
    if (supabaseSession?.user && user) {
      // 필요시 사용자 정보 업데이트
      user.email = supabaseSession.user.email || user.email;
    }

    // 사용자 객체가 있고 role이 'ADMIN'이면 isAdmin 속성 설정
    if (user && user.role === "ADMIN" && user.isAdmin === undefined) {
      user.isAdmin = true;
    }

    const isAuthenticated = !!validToken && !!user;

    return { token: validToken, user, isAuthenticated };
  } catch (error) {
    console.error("Failed to get session", error);
    return { token: null, user: null, isAuthenticated: false };
  }
};

export const clearSession = async (): Promise<void> => {
  try {
    // 로컬 스토리지 정리
    await removeItem(TOKEN_KEY);
    await removeItem(USER_KEY);

    // 토큰 매니저를 통한 Supabase 로그아웃
    const { tokenManager } = await import("./auth/token-manager");
    await tokenManager.signOut();
    console.log("세션 정보가 모두 삭제되었습니다.");
    // --- 세션 이벤트 브로드캐스트 (로그아웃) ---
    emitSessionChange({
      user: null,
      token: null,
      reason: "logout",
    });
  } catch (error) {
    console.error("Failed to clear session", error);
  }
};

/**
 * 세션의 유효성을 검사합니다.
 * 세션이 유효하면 true를 반환하고, 그렇지 않으면 false를 반환합니다.
 */
export const validateSession = async (): Promise<boolean> => {
  try {
    const { token, user } = await getSession();
    // 토큰과 사용자 정보가 모두 있는 경우에만 유효한 세션으로 간주
    if (!token || !user) {
      console.warn("세션 유효성 검사 실패: 토큰 또는 사용자 정보 없음");
      return false;
    }

    // 여기에 토큰 유효성 추가 검증 로직을 추가할 수 있음
    // 예: JWT 만료 시간 체크 등

    return true;
  } catch (error) {
    console.error("세션 유효성 검사 중 오류 발생:", error);
    return false;
  }
};
