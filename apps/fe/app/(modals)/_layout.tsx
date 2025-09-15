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
        headerShown: false,
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTintColor: theme.colors.text,
        presentation: "modal",
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      {/* 회원가입 후 기본 프로필 설정 모달 */}
      <Stack.Screen
        name="post-signup-profile"
        options={{
          headerShown: true,
          title: "기본 프로필 설정",
        }}
      />
    </Stack>
  );
}
