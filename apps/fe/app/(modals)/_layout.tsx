import React from "react";
import { Stack } from "expo-router";
import { useAppTheme } from "@/lib/theme/context";

/**
 * 모달 페이지용 스택 레이아웃
 * 모달 형태로 표시되는 화면들을 위한 레이아웃입니다
 */
export default function ModalsLayout() {
  const { theme } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTintColor: theme.colors.text,
        presentation: "modal",
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    />
  );
}
