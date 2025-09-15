import React from "react";
import { Redirect } from "expo-router";

/**
 * 앱 루트(index) 라우트
 *
 * - 역할: 초기 진입 시 피드 화면(/feed)으로 단순 리다이렉트
 * - 온보딩/회원가입 후 라우팅은 인증 플로우 화면(auth.tsx)에서 처리합니다.
 *   (이 파일은 어떤 post-signup 로직도 수행하지 않습니다)
 *
 * 유지보수 메모:
 * - 그룹 세그먼트((app))는 URL에 드러나지 않으므로 "/feed" 로 충분합니다.
 */
export default function Index(): React.ReactElement {
  return <Redirect href="/feed" />;
}
