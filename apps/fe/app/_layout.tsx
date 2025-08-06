/**
 * 루트 레이아웃 컴포넌트
 *
 * 앱 전체의 레이아웃과 초기화를 담당합니다.
 * 토큰 매니저 초기화도 여기서 수행합니다.
 */

import { useEffect } from "react";
import { Stack } from "expo-router";
import { tokenManager } from "@/lib/auth/token-manager";

export default function RootLayout() {
  useEffect(() => {
    // 앱 시작 시 토큰 매니저 초기화
    console.log("🚀 앱 시작 - 토큰 매니저 초기화");

    // 토큰 매니저는 싱글톤이므로 getInstance() 호출만으로 초기화됨
    tokenManager.getCurrentSession();
  }, []);

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(app)" options={{ headerShown: false }} />
    </Stack>
  );
}
