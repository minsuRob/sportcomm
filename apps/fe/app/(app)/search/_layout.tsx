import React from "react";
import { Stack } from "expo-router";
import { useAppTheme } from "@/lib/theme/context";

/**
 * 검색 탭용 스택 레이아웃
 * iOS 뒤로가기 제스처를 지원하기 위해 Stack 레이아웃을 사용합니다
 */
export default function SearchLayout() {
  const { theme } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTintColor: theme.colors.text,
        headerBackTitle: "뒤로",
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
        // iOS 뒤로가기 제스처 활성화
        gestureEnabled: true,
        presentation: "card",
      }}
    />
  );
}
