/**
 * Apollo Reactive Variables를 활용한 인증 상태 전역 관리
 *
 * 사용자 인증 상태, 사용자 정보, 동기화 상태를 전역적으로 관리합니다.
 * 중복 호출 방지 및 효율적인 상태 업데이트를 제공합니다.
 */

import { makeVar } from "@apollo/client";
import type { User } from "../supabase/user-sync";

/**
 * 인증 상태 타입 정의
 */
export interface AuthState {
  /** 인증 여부 */
  isAuthenticated: boolean;
  /** 현재 사용자 정보 */
  user: User | null;
  /** 로딩 상태 */
  isLoading: boolean;
  /** 동기화 완료 여부 (중복 호출 방지용) */
  isSynced: boolean;
  /** 액세스 토큰 */
  accessToken: string | null;
}

/**
 * 초기 인증 상태
 */
const initialAuthState: AuthState = {
  isAuthenticated: false,
  user: null,
  isLoading: false,
  isSynced: false,
  accessToken: null,
};

/**
 * 인증 상태 Reactive Variable
 *
 * Apollo Client의 Reactive Variables를 사용하여
 * 전역 상태를 관리하고 컴포넌트 간 상태 공유를 제공합니다.
 */
export const authStateVar = makeVar<AuthState>(initialAuthState);

/**
 * 인증 상태 관리 서비스
 */
export class AuthStore {
  /**
   * 현재 인증 상태 조회
   */
  static getState(): AuthState {
    return authStateVar();
  }

  /**
   * 로그인 상태로 설정
   *
   * @param user 사용자 정보
   * @param accessToken 액세스 토큰
   */
  static setAuthenticated(user: User, accessToken: string): void {
    const currentState = authStateVar();

    authStateVar({
      ...currentState,
      isAuthenticated: true,
      user,
      accessToken,
      isLoading: false,
      isSynced: true, // 동기화 완료로 표시
    });

    console.log("✅ 인증 상태 업데이트:", {
      userId: user.id,
      nickname: user.nickname,
    });
  }

  /**
   * 로그아웃 상태로 설정
   */
  static setUnauthenticated(): void {
    authStateVar({
      isAuthenticated: false,
      user: null,
      isLoading: false,
      isSynced: false, // 동기화 상태 리셋
      accessToken: null,
    });

    console.log("✅ 로그아웃 상태로 변경");
  }

  /**
   * 로딩 상태 설정
   *
   * @param isLoading 로딩 여부
   */
  static setLoading(isLoading: boolean): void {
    const currentState = authStateVar();

    authStateVar({
      ...currentState,
      isLoading,
    });
  }

  /**
   * 사용자 정보 업데이트
   *
   * @param user 업데이트된 사용자 정보
   */
  static updateUser(user: User): void {
    const currentState = authStateVar();

    if (!currentState.isAuthenticated) {
      console.warn("⚠️ 인증되지 않은 상태에서 사용자 정보 업데이트 시도");
      return;
    }

    authStateVar({
      ...currentState,
      user,
    });

    console.log("✅ 사용자 정보 업데이트:", {
      userId: user.id,
      nickname: user.nickname,
    });
  }

  /**
   * 동기화 상태 확인
   *
   * @returns 동기화 완료 여부
   */
  static isSynced(): boolean {
    return authStateVar().isSynced;
  }

  /**
   * 동기화 상태 설정
   *
   * @param isSynced 동기화 완료 여부
   */
  static setSynced(isSynced: boolean): void {
    const currentState = authStateVar();

    authStateVar({
      ...currentState,
      isSynced,
    });

    console.log(`✅ 동기화 상태 변경: ${isSynced ? "완료" : "미완료"}`);
  }

  /**
   * 액세스 토큰 업데이트
   *
   * @param accessToken 새로운 액세스 토큰
   */
  static updateAccessToken(accessToken: string): void {
    const currentState = authStateVar();

    authStateVar({
      ...currentState,
      accessToken,
    });

    console.log("✅ 액세스 토큰 업데이트");
  }

  /**
   * 인증 상태 초기화
   */
  static reset(): void {
    authStateVar(initialAuthState);
    console.log("✅ 인증 상태 초기화");
  }
}

/**
 * 인증 상태 구독을 위한 커스텀 훅
 */
export function useAuthState(): AuthState {
  return authStateVar();
}

// 편의를 위한 기본 익스포트
export default AuthStore;
