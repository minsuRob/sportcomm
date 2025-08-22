import { gql } from "@apollo/client";

/**
 * 스포츠 및 팀 관련 GraphQL 쿼리와 뮤테이션
 */

// 스포츠 정보 프래그먼트
export const SPORT_FRAGMENT = gql`
  fragment SportInfo on Sport {
    id
    name
    icon
    description
    sortOrder
    isActive
  }
`;

// 팀 정보 프래그먼트
export const TEAM_FRAGMENT = gql`
  fragment TeamInfo on Team {
    id
    name
    code
    color
    mainColor
    subColor
    darkMainColor
    darkSubColor
    icon
    logoUrl
    description
    sortOrder
    isActive
  }
`;

// 사용자 팀 관계 프래그먼트
export const USER_TEAM_FRAGMENT = gql`
  fragment UserTeamInfo on UserTeam {
    id
    userId
    teamId
    priority
    notificationEnabled
    favoriteDate
    createdAt
    team {
      ...TeamInfo
      sport {
        ...SportInfo
      }
    }
  }
  ${TEAM_FRAGMENT}
  ${SPORT_FRAGMENT}
`;

// 모든 스포츠 목록 조회
export const GET_SPORTS = gql`
  query GetSports {
    sports {
      ...SportInfo
      teams {
        ...TeamInfo
      }
    }
  }
  ${SPORT_FRAGMENT}
  ${TEAM_FRAGMENT}
`;

// 특정 스포츠 조회
export const GET_SPORT = gql`
  query GetSport($id: String!) {
    sport(id: $id) {
      ...SportInfo
      teams {
        ...TeamInfo
      }
    }
  }
  ${SPORT_FRAGMENT}
  ${TEAM_FRAGMENT}
`;

// 모든 팀 목록 조회
export const GET_TEAMS = gql`
  query GetTeams {
    teams {
      ...TeamInfo
      sport {
        ...SportInfo
      }
    }
  }
  ${TEAM_FRAGMENT}
  ${SPORT_FRAGMENT}
`;

// 특정 팀 조회
export const GET_TEAM = gql`
  query GetTeam($id: String!) {
    team(id: $id) {
      ...TeamInfo
      sport {
        ...SportInfo
      }
    }
  }
  ${TEAM_FRAGMENT}
  ${SPORT_FRAGMENT}
`;

// 현재 사용자가 선택한 팀 목록 조회
export const GET_MY_TEAMS = gql`
  query GetMyTeams {
    myTeams {
      ...UserTeamInfo
    }
  }
  ${USER_TEAM_FRAGMENT}
`;

// 현재 사용자의 주 팀 조회
export const GET_MY_PRIMARY_TEAM = gql`
  query GetMyPrimaryTeam {
    myPrimaryTeam {
      ...TeamInfo
      sport {
        ...SportInfo
      }
    }
  }
  ${TEAM_FRAGMENT}
  ${SPORT_FRAGMENT}
`;

// 팀 선택
export const SELECT_TEAM = gql`
  mutation SelectTeam($teamId: String!, $priority: Int = 0) {
    selectTeam(teamId: $teamId, priority: $priority) {
      ...UserTeamInfo
    }
  }
  ${USER_TEAM_FRAGMENT}
`;

// 팀 선택 해제
export const UNSELECT_TEAM = gql`
  mutation UnselectTeam($teamId: String!) {
    unselectTeam(teamId: $teamId)
  }
`;

// 사용자 팀 선택 모두 업데이트
export const UPDATE_MY_TEAMS = gql`
  mutation UpdateMyTeams($teams: [UpdateMyTeamInput!]!) {
    updateMyTeams(teams: $teams) {
      ...UserTeamInfo
    }
  }
  ${USER_TEAM_FRAGMENT}
`;

// TypeScript 타입 정의
export interface UpdateMyTeamInput {
  teamId: string;
  favoriteDate?: string;
}

export interface Sport {
  id: string;
  name: string;
  icon: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  activeTeamCount: number;
  totalUsers: number;
  teams?: Team[];
}

export interface Team {
  id: string;
  name: string;
  code: string;
  /** (Deprecated) 단일 색상 */
  color?: string;
  /** 라이트 메인 색상 */
  mainColor: string;
  /** 라이트 서브 색상 */
  subColor: string;
  /** 다크 메인 색상 */
  darkMainColor: string;
  /** 다크 서브 색상 */
  darkSubColor: string;
  icon: string;
  logoUrl?: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  totalUsers: number;
  primaryUsers: number;
  sport?: Sport;
}

export interface UserTeam {
  id: string;
  userId: string;
  teamId: string;
  priority: number;
  notificationEnabled: boolean;
  favoriteDate?: string;
  createdAt: string;
  team: Team;
}

// GraphQL 쿼리 결과 타입
export interface GetSportsResult {
  sports: Sport[];
}

export interface GetSportResult {
  sport: Sport;
}

export interface GetTeamsResult {
  teams: Team[];
}

export interface GetTeamResult {
  team: Team;
}

export interface GetMyTeamsResult {
  myTeams: UserTeam[];
}

export interface GetMyPrimaryTeamResult {
  myPrimaryTeam: Team | null;
}

export interface SelectTeamResult {
  selectTeam: UserTeam;
}

export interface UnselectTeamResult {
  unselectTeam: boolean;
}

export interface UpdateMyTeamsResult {
  updateMyTeams: UserTeam[];
}
