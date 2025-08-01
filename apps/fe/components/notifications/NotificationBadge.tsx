import React from "react";
import { View, Text, ViewStyle, TextStyle } from "react-native";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { useUnreadNotificationCount } from "@/lib/notifications";

interface NotificationBadgeProps {
  maxCount?: number; // 표시할 최대 숫자 (예: 99+)
  size?: "small" | "medium" | "large";
  showZero?: boolean; // 0일 때도 표시할지 여부
}

/**
 * 알림 배지 컴포넌트
 * 읽지 않은 알림 개수를 표시하는 빨간 원형 배지
 */
export default function NotificationBadge({
  maxCount = 99,
  size = "medium",
  showZero = false,
}: NotificationBadgeProps) {
  const { themed } = useAppTheme();
  const unreadCount = useUnreadNotificationCount();

  // 0이고 showZero가 false면 렌더링하지 않음
  if (unreadCount === 0 && !showZero) {
    return null;
  }

  // 표시할 텍스트 결정
  const displayText =
    unreadCount > maxCount ? `${maxCount}+` : unreadCount.toString();

  // 크기별 스타일 선택
  const sizeStyle = {
    small: $badgeSmall,
    medium: $badgeMedium,
    large: $badgeLarge,
  }[size];

  const textSizeStyle = {
    small: $textSmall,
    medium: $textMedium,
    large: $textLarge,
  }[size];

  return (
    <View style={[themed($badge), themed(sizeStyle)]}>
      <Text style={[themed($text), themed(textSizeStyle)]}>{displayText}</Text>
    </View>
  );
}

// --- 스타일 정의 ---
const $badge: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.error || "#EF4444",
  borderRadius: 10,
  justifyContent: "center",
  alignItems: "center",
  minWidth: 20,
  paddingHorizontal: 6,
  paddingVertical: 2,
  position: "absolute",
  top: -8,
  right: -8,
  zIndex: 10,
  // 그림자 효과
  shadowColor: "#000",
  shadowOffset: {
    width: 0,
    height: 1,
  },
  shadowOpacity: 0.2,
  shadowRadius: 2,
  elevation: 3,
});

const $text: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontWeight: "bold",
  textAlign: "center",
});

// 크기별 스타일
const $badgeSmall: ThemedStyle<ViewStyle> = () => ({
  minWidth: 16,
  height: 16,
  borderRadius: 8,
  paddingHorizontal: 4,
  paddingVertical: 0,
});

const $badgeMedium: ThemedStyle<ViewStyle> = () => ({
  minWidth: 20,
  height: 20,
  borderRadius: 10,
  paddingHorizontal: 6,
  paddingVertical: 2,
});

const $badgeLarge: ThemedStyle<ViewStyle> = () => ({
  minWidth: 24,
  height: 24,
  borderRadius: 12,
  paddingHorizontal: 8,
  paddingVertical: 3,
});

const $textSmall: ThemedStyle<TextStyle> = () => ({
  fontSize: 10,
});

const $textMedium: ThemedStyle<TextStyle> = () => ({
  fontSize: 12,
});

const $textLarge: ThemedStyle<TextStyle> = () => ({
  fontSize: 14,
});
