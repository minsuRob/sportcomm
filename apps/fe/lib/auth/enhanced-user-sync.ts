/**
 * 개선된 사용자 동기화 서비스
 *
 * 기존 user-sync.ts의 syncUser 함수를 활용하면서
 * 중복 호출 방지, 전역 상태 관리, 에러 처리를 개선합니다.
 */

import {
  UserSyncService,
  type User,
  type SyncUserInput,
} from "../supabase/user-sync";
import { AuthStore } from "../store/auth-store";

/**
 * 동기화 결과 타입
 */
export interface SyncResult {
  success: boolean;
  user?: User;
  error?: string;
  wasAlreadySynced?: boolean;
}

/**
 * 개선된 사용자 동기화 서비스
 */
export class EnhancedUserSyncService {
  private static syncPromise: Promise<SyncResult> | null = null;

  /**
   * 사용자 동기화 (중복 호출 방지 포함)
   *
   * @param input 동기화할 사용자 정보
   * @param accessToken Supabase Auth 액세스 토큰
   * @param forceSync 강제 동기화 여부 (기본값: false)
   * @returns 동기화 결과
   */
  static async syncUser(
    input: SyncUserInput,
    accessToken: string,
    forceSync: boolean = false,
  ): Promise<SyncResult> {
    try {
      // 중복 호출 방지 확인
      if (!forceSync && AuthStore.isSynced()) {
        console.log("✅ 이미 동기화 완료된 사용자 - 스킵");

        const currentUser = AuthStore.getState().user;
        return {
          success: true,
          user: currentUser || undefined,
          wasAlreadySynced: true,
        };
      }

      // 진행 중인 동기화가 있으면 해당 Promise 반환
      if (this.syncPromise && !forceSync) {
        console.log("🔄 진행 중인 동기화 대기...");
        return await this.syncPromise;
      }

      // 새로운 동기화 시작
      this.syncPromise = this.performSync(input, accessToken);

      const result = await this.syncPromise;

      // 동기화 완료 후 Promise 정리
      this.syncPromise = null;

      return result;
    } catch (error) {
      // 에러 발생 시 Promise 정리
      this.syncPromise = null;
      throw error;
    }
  }

  /**
   * 실제 동기화 수행
   *
   * @param input 동기화할 사용자 정보
   * @param accessToken 액세스 토큰
   * @returns 동기화 결과
   */
  private static async performSync(
    input: SyncUserInput,
    accessToken: string,
  ): Promise<SyncResult> {
    try {
      console.log("🔄 사용자 동기화 시작:", input);

      // 로딩 상태 설정
      AuthStore.setLoading(true);

      // 기존 UserSyncService의 syncUser 함수 활용
      const user = await UserSyncService.syncUser(input, accessToken);

      // 전역 상태 업데이트
      AuthStore.setAuthenticated(user, accessToken);

      console.log("✅ 사용자 동기화 성공:", user);

      return {
        success: true,
        user,
        wasAlreadySynced: false,
      };
    } catch (error: any) {
      console.error("❌ 사용자 동기화 실패:", error);

      // 로딩 상태 해제
      AuthStore.setLoading(false);

      const errorMessage = error?.message || "사용자 동기화에 실패했습니다.";

      return {
        success: false,
        error: errorMessage,
        wasAlreadySynced: false,
      };
    }
  }

  /**
   * 회원가입 후 자동 동기화
   *
   * @param userProfile Supabase Auth에서 받은 사용자 프로필
   * @param accessToken 액세스 토큰
   * @returns 동기화 결과
   */
  static async syncAfterSignUp(
    userProfile: {
      id: string;
      nickname: string;
      email: string;
      role?: string;
    },
    accessToken: string,
  ): Promise<SyncResult> {
    const syncInput: SyncUserInput = {
      nickname: userProfile.nickname,
      role: (userProfile.role as any) || "USER",
    };

    return await this.syncUser(syncInput, accessToken, true); // 회원가입 후에는 강제 동기화
  }

  /**
   * 로그인 후 사용자 정보 확인 및 동기화
   *
   * @param accessToken 액세스 토큰
   * @returns 동기화 결과
   */
  static async checkAndSyncAfterSignIn(
    accessToken: string,
  ): Promise<SyncResult> {
    try {
      console.log("🔄 로그인 후 사용자 정보 확인 시작");

      // 이미 동기화된 경우 스킵
      if (AuthStore.isSynced()) {
        const currentUser = AuthStore.getState().user;
        console.log("✅ 이미 동기화된 사용자 - 현재 정보 사용");

        return {
          success: true,
          user: currentUser || undefined,
          wasAlreadySynced: true,
        };
      }

      // 로딩 상태 설정
      AuthStore.setLoading(true);

      // 현재 사용자 정보 조회 시도
      const user = await UserSyncService.getCurrentUserInfo(accessToken);

      // 전역 상태 업데이트
      AuthStore.setAuthenticated(user, accessToken);

      console.log("✅ 로그인 후 사용자 정보 확인 완료:", user);

      return {
        success: true,
        user,
        wasAlreadySynced: false,
      };
    } catch (error: any) {
      console.warn("⚠️ 로그인 후 사용자 정보 확인 실패:", error);

      // 로딩 상태 해제
      AuthStore.setLoading(false);

      // 사용자 정보가 없는 경우 (동기화되지 않은 사용자)
      return {
        success: false,
        error: "사용자 정보를 찾을 수 없습니다. 다시 로그인해 주세요.",
        wasAlreadySynced: false,
      };
    }
  }

  /**
   * 동기화 상태 리셋 (로그아웃 시 호출)
   */
  static resetSyncState(): void {
    this.syncPromise = null;
    AuthStore.setUnauthenticated();
    console.log("✅ 동기화 상태 리셋 완료");
  }

  /**
   * 사용자 프로필 업데이트 (전역 상태 동기화 포함)
   *
   * @param input 업데이트할 프로필 정보
   * @param accessToken 액세스 토큰
   * @returns 업데이트 결과
   */
  static async updateUserProfile(
    input: { nickname?: string; profileImageUrl?: string; bio?: string },
    accessToken: string,
  ): Promise<SyncResult> {
    try {
      console.log("🔄 사용자 프로필 업데이트 시작:", input);

      // 로딩 상태 설정
      AuthStore.setLoading(true);

      // 기존 UserSyncService의 updateUserProfile 함수 활용
      const updatedUser = await UserSyncService.updateUserProfile(
        input,
        accessToken,
      );

      // 전역 상태의 사용자 정보 업데이트
      AuthStore.updateUser(updatedUser);

      console.log("✅ 사용자 프로필 업데이트 성공:", updatedUser);

      return {
        success: true,
        user: updatedUser,
      };
    } catch (error: any) {
      console.error("❌ 사용자 프로필 업데이트 실패:", error);

      // 로딩 상태 해제
      AuthStore.setLoading(false);

      const errorMessage = error?.message || "프로필 업데이트에 실패했습니다.";

      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}

// 편의를 위한 기본 익스포트
export default EnhancedUserSyncService;
