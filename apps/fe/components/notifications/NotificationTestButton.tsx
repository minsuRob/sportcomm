import React from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { Ionicons } from "@expo/vector-icons";
import {
  testForegroundNotification,
  testDelayedNotification,
  testVariousNotifications,
  cancelAllScheduledNotifications,
  listScheduledNotifications,
  checkNotificationPermissions,
} from "@/lib/notifications/testNotifications";

/**
 * 알림 기능 테스트를 위한 개발용 컴포넌트
 * 개발 환경에서만 사용하며, 프로덕션에서는 제거해야 합니다.
 */
export default function NotificationTestButton() {
  const { themed, theme } = useAppTheme();

  const showTestMenu = () => {
    Alert.alert(
      "🔔 알림 테스트",
      "어떤 테스트를 실행하시겠습니까?",
      [
        {
          text: "포그라운드 알림",
          onPress: testForegroundNotification,
        },
        {
          text: "5초 지연 알림",
          onPress: testDelayedNotification,
        },
        {
          text: "다양한 알림들",
          onPress: testVariousNotifications,
        },
        {
          text: "권한 확인",
          onPress: checkNotificationPermissions,
        },
        {
          text: "예약된 알림 목록",
          onPress: listScheduledNotifications,
        },
        {
          text: "모든 알림 취소",
          onPress: cancelAllScheduledNotifications,
          style: "destructive",
        },
        {
          text: "취소",
          style: "cancel",
        },
      ],
      { cancelable: true }
    );
  };

  // 개발 환경에서만 표시
  if (__DEV__) {
    return (
      <TouchableOpacity
        style={themed($container)}
        onPress={showTestMenu}
        activeOpacity={0.7}
      >
        <Ionicons
          name="notifications-outline"
          size={20}
          color={theme.colors.tint}
        />
        <Text style={themed($text)}>알림 테스트</Text>
      </TouchableOpacity>
    );
  }

  return null;
}

// --- 스타일 정의 ---
const $container: ThemedStyle<any> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  backgroundColor: colors.tint + "10",
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.tint + "30",
  marginVertical: spacing.xs,
});

const $text: ThemedStyle<any> = ({ colors }) => ({
  fontSize: 14,
  fontWeight: "500",
  color: colors.tint,
  marginLeft: 8,
});
