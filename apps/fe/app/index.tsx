import React from "react";
import { Redirect } from "expo-router";
import { useAuth } from "@/lib/auth/context/AuthContext";

/**
 * 앱 루트(index) 라우트
 *
 * - 역할: 초기 진입 시 기본적으로 피드(/feed)로 리다이렉트합니다.
 * - 단, Google OAuth 리다이렉트로 돌아온 직후처럼 인증이 완료되었고
 *   사용자에 연결된 `myTeams`(= `user_teams`)가 비어 있다면
 *   온보딩(프로필 경량 설정) 모달로 먼저 유도합니다.
 *
 * 유지보수 메모:
 * - 그룹 세그먼트((app))는 URL에 드러나지 않으므로 "/feed" 로 충분합니다.
 */
export default function Index(): React.ReactElement {
  // Google OAuth 리다이렉트 이후 진입 지점
  // - 로그인된 사용자이며 myTeams가 비어있으면 온보딩(프로필 설정) 모달로 유도
  // - 비로그인 또는 팀이 이미 있는 경우엔 피드로 이동
  const { user, isAuthenticated, isLoading } = useAuth();

  // Auth 부트스트랩/동기화가 끝날 때까지 렌더 지연하여 잘못된 경로로의 조기 리다이렉트 방지
  if (isLoading) return null;

  // 팀 정보가 없거나 빈 배열이면 온보딩으로 유도
  if (
    isAuthenticated &&
    (!Array.isArray(user?.myTeams) || (user!.myTeams as any[]).length === 0)
  ) {
    return <Redirect href="/(modals)/post-signup-profile" />;
  }

  return <Redirect href="/feed" />;
}
