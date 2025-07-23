import React from "react";
import { Stack } from "expo-router";
import { useAppTheme } from "@/lib/theme/context";

/**
 * 상세 페이지용 스택 레이아웃
 * 뒤로가기 버튼이 있는 헤더를 제공합니다
 */
export default function DetailsLayout() {
  const { theme } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTintColor: theme.colors.text,
        headerBackTitle: "뒤로",
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    />
  );
}
