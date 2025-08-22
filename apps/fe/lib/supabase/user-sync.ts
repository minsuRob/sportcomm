/**
 * 사용자 동기화 서비스
 *
 * Supabase Auth 회원가입 후 NestJS 백엔드에 사용자 정보를 동기화합니다.
 * GraphQL 뮤테이션을 통해 백엔드의 User 테이블에 사용자 정보를 생성/업데이트합니다.
 */

import { gql } from "@apollo/client";
import { client as apolloClient } from "../api/client";

/**
 * 사용자 동기화 GraphQL 뮤테이션
 */
const SYNC_USER_MUTATION = gql`
  mutation SyncUser($input: SyncUserInput!) {
    syncUser(input: $input) {
      id
      nickname
      role
      profileImageUrl
      bio
      isActive
      points
      createdAt
      updatedAt
    }
  }
`;

/**
 * 사용자 프로필 업데이트 GraphQL 뮤테이션
 */
const UPDATE_USER_PROFILE_MUTATION = gql`
  mutation UpdateUserProfile($input: UpdateUserProfileInput!) {
    updateUserProfile(input: $input) {
      id
      nickname
      role
      profileImageUrl
      bio
      isActive
      points
      createdAt
      updatedAt
    }
  }
`;

/**
 * 현재 사용자 정보 조회 GraphQL 쿼리
 */
const GET_CURRENT_USER_INFO_QUERY = gql`
  query GetCurrentUserInfo {
    getCurrentUserInfo {
      id
      nickname
      role
      profileImageUrl
      bio
      isActive
      points
      createdAt
      updatedAt
    }
  }
`;

/**
 * 닉네임 중복 확인 GraphQL 쿼리
 */
const CHECK_NICKNAME_TAKEN_QUERY = gql`
  query CheckNicknameTaken($nickname: String!) {
    checkNicknameTaken(nickname: $nickname)
  }
`;

/**
 * 사용자 동기화 입력 타입
 */
export interface SyncUserInput {
  nickname: string;
  role?: "USER" | "INFLUENCER" | "ADMIN";
  profileImageUrl?: string;
  bio?: string;
}

/**
 * 사용자 프로필 업데이트 입력 타입
 */
export interface UpdateUserProfileInput {
  nickname?: string;
  profileImageUrl?: string;
  bio?: string;
}

/**
 * 사용자 정보 타입
 */
export interface User {
  id: string;
  nickname: string;
  email: string;
  role: "USER" | "INFLUENCER" | "ADMIN";
  profileImageUrl?: string;
  bio?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  points?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 사용자 동기화 서비스 클래스
 */
export class UserSyncService {
  /**
   * Supabase Auth 회원가입 후 사용자 정보를 백엔드에 동기화
   *
   * @param input 동기화할 사용자 정보
   * @param accessToken Supabase Auth 액세스 토큰
   * @returns 동기화된 사용자 정보
   */
  static async syncUser(
    input: SyncUserInput,
    accessToken: string,
  ): Promise<User> {
    try {
      console.log("🔄 사용자 정보 동기화 시작:", input);

      const { data } = await apolloClient.mutate({
        mutation: SYNC_USER_MUTATION,
        variables: { input },
        context: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      });

      if (!data?.syncUser) {
        throw new Error("사용자 동기화 응답이 없습니다.");
      }

      console.log("✅ 사용자 정보 동기화 성공:", data.syncUser);
      return data.syncUser;
    } catch (error: any) {
      console.error("❌ 사용자 정보 동기화 실패:", error);

      // GraphQL 에러 메시지 추출
      const errorMessage =
        error?.graphQLErrors?.[0]?.message ||
        error?.message ||
        "사용자 정보 동기화에 실패했습니다.";

      throw new Error(errorMessage);
    }
  }

  /**
   * 사용자 프로필 업데이트
   *
   * @param input 업데이트할 프로필 정보
   * @param accessToken Supabase Auth 액세스 토큰
   * @returns 업데이트된 사용자 정보
   */
  static async updateUserProfile(
    input: UpdateUserProfileInput,
    accessToken: string,
  ): Promise<User> {
    try {
      console.log("🔄 사용자 프로필 업데이트 시작:", input);

      const { data } = await apolloClient.mutate({
        mutation: UPDATE_USER_PROFILE_MUTATION,
        variables: { input },
        context: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      });

      if (!data?.updateUserProfile) {
        throw new Error("사용자 프로필 업데이트 응답이 없습니다.");
      }

      console.log("✅ 사용자 프로필 업데이트 성공:", data.updateUserProfile);
      return data.updateUserProfile;
    } catch (error: any) {
      console.error("❌ 사용자 프로필 업데이트 실패:", error);

      const errorMessage =
        error?.graphQLErrors?.[0]?.message ||
        error?.message ||
        "사용자 프로필 업데이트에 실패했습니다.";

      throw new Error(errorMessage);
    }
  }

  /**
   * 현재 사용자 정보 조회
   *
   * @param accessToken Supabase Auth 액세스 토큰
   * @returns 현재 사용자 정보
   */
  static async getCurrentUserInfo(accessToken: string): Promise<User> {
    try {
      const { data } = await apolloClient.query({
        query: GET_CURRENT_USER_INFO_QUERY,
        context: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
        fetchPolicy: "network-only", // 항상 최신 정보 조회
      });

      if (!data?.getCurrentUserInfo) {
        throw new Error("현재 사용자 정보 조회 응답이 없습니다.");
      }

      return data.getCurrentUserInfo;
    } catch (error: any) {
      console.error("❌ 현재 사용자 정보 조회 실패:", error);

      const errorMessage =
        error?.graphQLErrors?.[0]?.message ||
        error?.message ||
        "현재 사용자 정보 조회에 실패했습니다.";

      throw new Error(errorMessage);
    }
  }

  /**
   * 닉네임 중복 확인
   *
   * @param nickname 확인할 닉네임
   * @param accessToken Supabase Auth 액세스 토큰
   * @returns 중복 여부 (true: 사용 불가, false: 사용 가능)
   */
  static async checkNicknameTaken(
    nickname: string,
    accessToken: string,
  ): Promise<boolean> {
    try {
      console.log("🔄 닉네임 중복 확인 시작:", nickname);

      const { data } = await apolloClient.query({
        query: CHECK_NICKNAME_TAKEN_QUERY,
        variables: { nickname },
        context: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
        fetchPolicy: "network-only", // 항상 최신 정보 확인
      });

      const isTaken = data?.checkNicknameTaken ?? false;

      console.log(
        `✅ 닉네임 중복 확인 완료: ${nickname} -> ${isTaken ? "사용 불가" : "사용 가능"}`,
      );
      return isTaken;
    } catch (error: any) {
      console.error("❌ 닉네임 중복 확인 실패:", error);

      // 에러 발생 시 안전하게 true 반환 (사용 불가로 처리)
      return true;
    }
  }
}

/**
 * 회원가입 후 자동 사용자 동기화 헬퍼 함수
 *
 * @param userProfile Supabase Auth에서 받은 사용자 프로필
 * @param accessToken Supabase Auth 액세스 토큰
 * @returns 동기화된 사용자 정보
 */
export async function syncUserAfterSignUp(
  userProfile: {
    id: string;
    nickname: string;
    email: string;
    role?: string;
  },
  accessToken: string,
): Promise<User> {
  try {
    console.log("🔄 회원가입 후 자동 사용자 동기화 시작:", userProfile);

    const syncInput: SyncUserInput = {
      nickname: userProfile.nickname,
      role: (userProfile.role as any) || "USER",
    };

    const userInfo = await UserSyncService.syncUser(syncInput, accessToken);

    console.log("✅ 회원가입 후 자동 사용자 동기화 완료:", userInfo);
    return userInfo;
  } catch (error) {
    console.error("❌ 회원가입 후 자동 사용자 동기화 실패:", error);
    throw error;
  }
}

/**
 * 로그인 후 사용자 정보 확인 및 동기화 헬퍼 함수
 *
 * @param accessToken Supabase Auth 액세스 토큰
 * @returns 사용자 정보 (없으면 null)
 */
export async function checkAndSyncUserAfterSignIn(
  accessToken: string,
): Promise<User | null> {
  try {
    console.log("🔄 로그인 후 사용자 정보 확인 시작");

    // 먼저 현재 사용자 정보 조회 시도
    const userInfo = await UserSyncService.getCurrentUserInfo(accessToken);

    console.log("✅ 로그인 후 사용자 정보 확인 완료:", userInfo);
    return userInfo;
  } catch (error) {
    console.warn(
      "⚠️ 로그인 후 사용자 정보 확인 실패 (동기화되지 않은 사용자일 수 있음):",
      error,
    );

    // 사용자 정보가 없으면 null 반환
    // 필요시 여기서 자동 동기화를 수행할 수도 있음
    return null;
  }
}

// 편의를 위한 기본 익스포트
export default UserSyncService;
