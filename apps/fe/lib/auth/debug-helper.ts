/**
 * 인증 디버깅 헬퍼
 *
 * 인증 관련 문제를 디버깅하기 위한 유틸리티 함수들
 */

import { supabase } from "@/lib/supabase/client";
import { getSession } from "@/lib/auth";
import { tokenManager } from "./token-manager";

/**
 * 전체 인증 상태 디버깅 정보 출력
 */
export async function debugAuthStatus(): Promise<void> {
  console.log("🔍 === 인증 상태 전체 디버깅 ===");

  try {
    // 1. Supabase 세션 확인
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    console.log("1️⃣ Supabase 세션:", {
      hasSession: !!session,
      sessionError: sessionError?.message,
      userId: session?.user?.id,
      email: session?.user?.email,
      expiresAt: session?.expires_at
        ? new Date(session.expires_at * 1000).toISOString()
        : null,
      tokenLength: session?.access_token?.length,
    });

    // 2. 토큰 매니저 상태 확인
    const tokenManagerSession = tokenManager.getCurrentSession();
    const isTokenValid = tokenManager.isTokenValid();
    console.log("2️⃣ 토큰 매니저:", {
      hasSession: !!tokenManagerSession,
      isTokenValid,
      userId: tokenManagerSession?.user?.id,
      email: tokenManagerSession?.user?.email,
    });

    // 3. 로컬 스토리지 세션 확인
    const localSession = await getSession();
    console.log("3️⃣ 로컬 스토리지 세션:", {
      hasToken: !!localSession.token,
      hasUser: !!localSession.user,
      isAuthenticated: localSession.isAuthenticated,
      userId: localSession.user?.id,
      tokenLength: localSession.token?.length,
    });

    // 4. JWT 토큰 디코딩
    const validToken = session?.access_token || localSession.token;
    if (validToken) {
      try {
        const tokenParts = validToken.split(".");
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          console.log("4️⃣ JWT 페이로드:", {
            sub: payload.sub,
            iss: payload.iss,
            aud: payload.aud,
            exp: payload.exp
              ? new Date(payload.exp * 1000).toISOString()
              : null,
            iat: payload.iat
              ? new Date(payload.iat * 1000).toISOString()
              : null,
            email: payload.email,
            role: payload.role,
            user_metadata: payload.user_metadata,
          });
        }
      } catch (decodeError) {
        console.error("4️⃣ JWT 디코딩 실패:", decodeError);
      }
    }
  } catch (error) {
    console.error("❌ 인증 상태 디버깅 중 오류:", error);
  }

  console.log("🔍 === 디버깅 완료 ===");
}

/**
 * 인증 문제 해결을 위한 권장사항 출력
 */
export function printAuthTroubleshootingTips(): void {
  console.log("💡 === 인증 문제 해결 권장사항 ===");
  console.log(
    "1. 프론트엔드와 백엔드가 같은 Supabase 프로젝트를 사용하는지 확인",
  );
  console.log("2. JWT 시크릿이 올바른지 확인");
  console.log("3. 토큰이 만료되지 않았는지 확인");
  console.log("4. 사용자가 Supabase Auth에 존재하는지 확인");
  console.log("5. 백엔드 서버가 실행 중인지 확인");
  console.log("💡 === 권장사항 끝 ===");
}
