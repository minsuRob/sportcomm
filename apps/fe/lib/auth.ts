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
      // [Deprecated] 토큰은 Supabase 세션으로만 관리합니다. 로컬 중복 저장은 중단합니다.
      // await setItem(TOKEN_KEY, tokenOrUser);
      // points 기본값 보정
      if (typeof (user as any).points !== "number") {
        (user as any).points = 0;
      }

      await setItem(USER_KEY, JSON.stringify(user));
      // //console.log("세션 저장 완료: 토큰과 사용자 정보가 모두 저장됨");
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
    // 로컬 스토리지 정리 (사용자 캐시만 삭제)
    // [Deprecated] TOKEN_KEY는 Supabase 세션으로 대체되므로 별도 삭제하지 않습니다.
    await removeItem(USER_KEY);

    // 토큰 매니저를 통한 Supabase 로그아웃
    const { tokenManager } = await import("./auth/token-manager");
    await tokenManager.signOut();
    // //console.log("세션 정보가 모두 삭제되었습니다.");
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

/**
 * 출석체크 포인트 지급 헬퍼 함수
 * 사용자 세션을 확인하고 출석체크 가능 여부를 검증한 후 포인트를 지급합니다.
 *
 * 사용 예시:
 * ```typescript
 * const result = await claimDailyAttendance();
 * if (result.success) {
 *   console.log(result.message); // "20포인트를 획득했습니다!"
 *   console.log(`현재 포인트: ${result.pointsEarned}`);
 * } else {
 *   console.log(result.message); // "오늘은 이미 출석체크를 완료했습니다."
 * }
 * ```
 *
 * @param timezone 시간대 (기본값: 'Asia/Seoul')
 * @returns 지급된 포인트 수량과 성공 여부
 */
export const claimDailyAttendance = async (
  timezone: string = 'Asia/Seoul'
): Promise<{ success: boolean; pointsEarned: number; message: string }> => {
  try {
    // 현재 세션 확인
    const { user, isAuthenticated } = await getSession();

    if (!isAuthenticated || !user) {
      return {
        success: false,
        pointsEarned: 0,
        message: '로그인이 필요합니다.'
      };
    }

    // 출석체크 가능 여부 확인 (프론트엔드에서 간단한 검증)
    const now = new Date();
    const canClaim = user.lastAttendanceAt ? (() => {
      const lastAttendance = new Date(user.lastAttendanceAt!);
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const lastDay = new Date(lastAttendance.getFullYear(), lastAttendance.getMonth(), lastAttendance.getDate());
      return today.getTime() !== lastDay.getTime();
    })() : true;

    if (!canClaim) {
      return {
        success: false,
        pointsEarned: 0,
        message: '오늘은 이미 출석체크를 완료했습니다.'
      };
    }

    // GraphQL 뮤테이션을 통해 백엔드에서 출석체크 처리
    // 실제로는 별도의 GraphQL 뮤테이션이나 REST API를 호출해야 함
    // 여기서는 임시로 로컬 계산만 수행

    // TODO: 백엔드 GraphQL 뮤테이션 구현 필요
    // const result = await performAttendanceCheck({ timezone });

    // 임시: 프론트엔드에서 간단한 계산 (실제로는 백엔드에서 처리)
    const attendancePoints = 20; // DAILY_ATTENDANCE 포인트
    const newPoints = (user.points || 0) + attendancePoints;

    // 사용자 정보 업데이트
    const updatedUser = {
      ...user,
      points: newPoints,
      lastAttendanceAt: now.toISOString()
    };

    // 세션 저장
    await saveSession(updatedUser);

    return {
      success: true,
      pointsEarned: attendancePoints,
      message: `${attendancePoints}포인트를 획득했습니다!`
    };

  } catch (error) {
    console.error('출석체크 처리 중 오류 발생:', error);
    return {
      success: false,
      pointsEarned: 0,
      message: '출석체크 처리 중 오류가 발생했습니다.'
    };
  }
};
