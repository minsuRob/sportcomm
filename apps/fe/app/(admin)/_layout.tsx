import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Redirect, Slot } from "expo-router";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { User, getSession } from "@/lib/auth";

/**
 * 관리자 레이아웃
 *
 * 관리자 권한이 있는 사용자만 접근할 수 있는 레이아웃입니다.
 */
export default function AdminLayout() {
  const { themed } = useAppTheme();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAdminPermission = async () => {
      try {
        const { user } = await getSession();
        setCurrentUser(user);
      } catch (error) {
        console.error("사용자 정보 로드 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminPermission();
  }, []);

  // 로딩 중
  if (isLoading) {
    return (
      <View style={themed($loadingContainer)}>
        <Text style={themed($loadingText)}>권한 확인 중...</Text>
      </View>
    );
  }

  // 관리자 권한이 없는 경우 리다이렉트
  if (!currentUser || currentUser.role !== "ADMIN") {
    return <Redirect href="/(app)/feed" />;
  }

  return <Slot />;
}

// --- 스타일 정의 ---
const $loadingContainer: ThemedStyle<any> = ({ colors }) => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: colors.background,
});

const $loadingText: ThemedStyle<any> = ({ colors }) => ({
  fontSize: 16,
  color: colors.textDim,
});
