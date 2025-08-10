/**
 * 인증 오류 처리 유틸리티
 *
 * JWT 토큰 만료 및 인증 관련 오류를 처리하고,
 * 필요시 사용자에게 재로그인을 요청합니다.
 */

import { Alert } from "react-native";
import { tokenManager } from "./token-manager";
import { supabase } from "@/lib/supabase/client";

export interface AuthError {
  message: string;
  code?: string;
  isTokenExpired?: boolean;
  requiresReauth?: boolean;
}

/**
 * 인증 오류 핸들러 클래스
 */
export class AuthErrorHandler {
  private static retryAttempts = new Map<string, number>();
  private static readonly MAX_RETRY_ATTEMPTS = 2;

  /**
   * GraphQL 오류가 인증 관련인지 확인
   */
  static isAuthError(error: any): boolean {
    if (!error) return false;

    const message = error.message || "";
    const code = error.extensions?.code || error.code || "";

    const isAuthRelated =
      message.includes("Unauthorized") ||
      message.includes("인증") ||
      message.includes("로그인") ||
      message.includes("token") ||
      message.includes("jwt expired") ||
      message.includes("토큰이 만료") ||
      message.includes("access denied") ||
      message.includes("인증에 실패했습니다") ||
      message.includes("사용자 정보 동기화에 실패했습니다") ||
      code === "UNAUTHENTICATED" ||
      code === "FORBIDDEN";

    if (isAuthRelated) {
      console.log("🔍 인증 관련 오류 감지:", {
        message,
        code,
        isTokenExpired: this.isTokenExpiredError(error),
      });
    }

    return isAuthRelated;
  }

  /**
   * 토큰 만료 오류인지 확인
   */
  static isTokenExpiredError(error: any): boolean {
    if (!error) return false;

    const message = error.message || "";

    return (
      message.includes("jwt expired") ||
      message.includes("토큰이 만료") ||
      message.includes("Token has expired") ||
      message.includes("token expired")
    );
  }

  /**
   * 인증 오류 처리
   * @param error 발생한 오류
   * @param operationName GraphQL 작업 이름
   * @returns 재시도 가능 여부
   */
  static async handleAuthError(
    error: any,
    operationName?: string,
  ): Promise<boolean> {
    console.log("🔍 인증 오류 처리 시작:", {
      operationName,
      errorMessage: error.message,
      errorCode: error.extensions?.code || error.code,
    });

    // 토큰 만료 오류인 경우 자동 갱신 시도
    if (this.isTokenExpiredError(error)) {
      return await this.handleTokenExpiredError(operationName);
    }

    // 기타 인증 오류인 경우 재로그인 요청
    if (this.isAuthError(error)) {
      return await this.handleGeneralAuthError(error, operationName);
    }

    return false;
  }

  /**
   * 토큰 만료 오류 처리
   */
  private static async handleTokenExpiredError(
    operationName?: string,
  ): Promise<boolean> {
    const retryKey = operationName || "default";
    const currentAttempts = this.retryAttempts.get(retryKey) || 0;

    // 최대 재시도 횟수 초과 시 재로그인 요청
    if (currentAttempts >= this.MAX_RETRY_ATTEMPTS) {
      console.warn("⚠️ 토큰 갱신 최대 재시도 횟수 초과, 재로그인 필요");
      this.retryAttempts.delete(retryKey);
      await this.requestReauth(
        "토큰 갱신에 실패했습니다. 다시 로그인해주세요.",
      );
      return false;
    }

    try {
      console.log("🔄 토큰 만료 감지, 자동 갱신 시도...", {
        operationName,
        attempt: currentAttempts + 1,
      });

      // 재시도 횟수 증가
      this.retryAttempts.set(retryKey, currentAttempts + 1);

      // 토큰 갱신 시도
      const refreshedSession = await tokenManager.refreshToken();

      if (refreshedSession) {
        console.log("✅ 토큰 갱신 성공, 요청 재시도 가능");
        // 성공 시 재시도 횟수 초기화
        this.retryAttempts.delete(retryKey);
        return true;
      } else {
        console.error("❌ 토큰 갱신 실패");
        await this.requestReauth("세션이 만료되었습니다. 다시 로그인해주세요.");
        return false;
      }
    } catch (refreshError) {
      console.error("❌ 토큰 갱신 중 오류:", refreshError);
      await this.requestReauth(
        "인증 오류가 발생했습니다. 다시 로그인해주세요.",
      );
      return false;
    }
  }

  /**
   * 일반 인증 오류 처리
   */
  private static async handleGeneralAuthError(
    error: any,
    operationName?: string,
  ): Promise<boolean> {
    console.error("❌ 일반 인증 오류:", {
      operationName,
      message: error.message,
      code: error.extensions?.code || error.code,
    });

    // 즉시 재로그인 요청
    await this.requestReauth("인증이 필요합니다. 다시 로그인해주세요.");
    return false;
  }

  /**
   * 재로그인 요청
   */
  private static async requestReauth(message: string): Promise<void> {
    try {
      // 현재 세션 정리
      await tokenManager.signOut();

      // 사용자에게 알림
      Alert.alert(
        "인증 필요",
        message,
        [
          {
            text: "확인",
            onPress: () => {
              // 여기서 로그인 화면으로 이동하는 로직 추가 가능
              console.log("사용자가 재로그인 알림 확인");
            },
          },
        ],
        { cancelable: false },
      );
    } catch (error) {
      console.error("❌ 재로그인 요청 처리 중 오류:", error);
    }
  }

  /**
   * 재시도 횟수 초기화 (성공적인 요청 후 호출)
   */
  static resetRetryAttempts(operationName?: string): void {
    const retryKey = operationName || "default";
    this.retryAttempts.delete(retryKey);
  }

  /**
   * 모든 재시도 횟수 초기화
   */
  static resetAllRetryAttempts(): void {
    this.retryAttempts.clear();
  }
}

// 편의 함수들
export const handleAuthError = (error: any, operationName?: string) =>
  AuthErrorHandler.handleAuthError(error, operationName);

export const isAuthError = (error: any) => AuthErrorHandler.isAuthError(error);

export const isTokenExpiredError = (error: any) =>
  AuthErrorHandler.isTokenExpiredError(error);

export const resetRetryAttempts = (operationName?: string) =>
  AuthErrorHandler.resetRetryAttempts(operationName);
