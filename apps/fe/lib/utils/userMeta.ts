/**
 * 사용자 메타 데이터 처리 유틸리티
 *
 * 팀 로고, 나이 등 사용자 관련 메타 데이터를 공통으로 처리합니다.
 */

// 기본 사용자 정보 인터페이스
export interface BaseUser {
  id: string;
  nickname: string;
  profileImageUrl?: string;
  age?: number;
}

// 팀 정보 인터페이스
export interface TeamInfo {
  id: string;
  name: string;
  logoUrl?: string;
  icon: string;
}

// 사용자 팀 관계 인터페이스
export interface UserTeam {
  team: TeamInfo;
  priority?: number;
}

// 확장 가능한 사용자 메타 데이터 인터페이스
export interface UserMeta {
  age?: number;
  teamLogos?: string[];
  teams?: TeamInfo[];
  // 향후 확장 가능한 필드들
  badges?: string[];
  level?: number;
  achievements?: string[];
}

// 사용자 정보와 팀 정보를 포함한 확장 사용자 인터페이스
export interface ExtendedUser extends BaseUser {
  myTeams?: UserTeam[];
  myTeamLogos?: string[];
}

/**
 * 사용자의 팀 로고 목록을 추출합니다
 * @param user 사용자 정보
 * @param maxCount 최대 표시할 로고 개수 (기본값: 3)
 * @returns 팀 로고 URL 배열
 */
export function extractTeamLogos(
  user: ExtendedUser | any,
  maxCount: number = 3
): string[] {
  // 1. myTeamLogos 필드가 있는 경우 (채팅 메시지 등)
  if (user.myTeamLogos && Array.isArray(user.myTeamLogos)) {
    return user.myTeamLogos.filter(Boolean).slice(0, maxCount);
  }

  // 2. myTeams 필드가 있는 경우 (GraphQL 사용자 정보)
  if (user.myTeams && Array.isArray(user.myTeams)) {
    return user.myTeams
      .filter((ut: any) => ut?.team?.logoUrl)
      .map((ut: any) => ut.team.logoUrl)
      .slice(0, maxCount);
  }

  // 3. authorTeams 필드가 있는 경우 (게시물 작성자)
  if (user.authorTeams && Array.isArray(user.authorTeams)) {
    return user.authorTeams
      .filter((team: any) => team?.logoUrl)
      .map((team: any) => team.logoUrl)
      .slice(0, maxCount);
  }

  return [];
}

/**
 * 사용자의 팀 정보 목록을 추출합니다
 * @param user 사용자 정보
 * @param maxCount 최대 표시할 팀 개수 (기본값: 3)
 * @returns 팀 정보 배열
 */
export function extractTeams(
  user: ExtendedUser | any,
  maxCount: number = 3
): TeamInfo[] {
  // 1. myTeams 필드가 있는 경우
  if (user.myTeams && Array.isArray(user.myTeams)) {
    return user.myTeams
      .filter((ut: any) => ut?.team)
      .map((ut: any) => ut.team)
      .slice(0, maxCount);
  }

  // 2. authorTeams 필드가 있는 경우
  if (user.authorTeams && Array.isArray(user.authorTeams)) {
    return user.authorTeams.slice(0, maxCount);
  }

  return [];
}

/**
 * 사용자 메타 데이터를 생성합니다
 * @param user 사용자 정보
 * @param options 옵션 설정
 * @returns UserMeta 객체
 */
export function createUserMeta(
  user: ExtendedUser | any,
  options: {
    maxTeamLogos?: number;
    includeAge?: boolean;
    includeTeams?: boolean;
  } = {}
): UserMeta {
  const { maxTeamLogos = 3, includeAge = true, includeTeams = false } = options;

  const meta: UserMeta = {};

  // 나이 정보 추가
  if (includeAge && user.age) {
    meta.age = user.age;
  }

  // 팀 로고 추가
  const teamLogos = extractTeamLogos(user, maxTeamLogos);
  if (teamLogos.length > 0) {
    meta.teamLogos = teamLogos;
  }

  // 팀 정보 추가
  if (includeTeams) {
    const teams = extractTeams(user, maxTeamLogos);
    if (teams.length > 0) {
      meta.teams = teams;
    }
  }

  return meta;
}

/**
 * 두 사용자가 같은 사용자인지 확인합니다
 * @param currentUser 현재 사용자
 * @param targetUser 대상 사용자
 * @returns 같은 사용자 여부
 */
export function isSameUser(
  currentUser: BaseUser | null,
  targetUser: BaseUser | any
): boolean {
  return (
    currentUser?.id === targetUser?.id ||
    currentUser?.id === targetUser?.user_id
  );
}

/**
 * 사용자 메타 데이터를 채팅 메시지용으로 변환합니다
 * @param user 사용자 정보
 * @param currentUser 현재 사용자 (본인인 경우 더 많은 정보 제공)
 * @returns 채팅용 사용자 메타 데이터
 */
export function createChatUserMeta(
  user: ExtendedUser | any,
  currentUser?: ExtendedUser | any
): UserMeta | undefined {
  // 사용자 정보가 없으면 undefined 반환
  if (!user) return undefined;

  // 본인인 경우 현재 사용자 정보를 우선 사용
  const sourceUser = isSameUser(currentUser, user) ? currentUser || user : user;

  return createUserMeta(sourceUser, {
    maxTeamLogos: 3,
    includeAge: true,
    includeTeams: false,
  });
}
