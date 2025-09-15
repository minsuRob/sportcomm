import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { Ionicons } from "@expo/vector-icons";
import NotificationList from "@/components/notifications/NotificationList";
import { Notification } from "@/components/notifications/NotificationItem";
import { useAuth } from "@/lib/auth/context/AuthContext";
import { useNotifications } from "@/lib/notifications";

/**
 * 알림 화면 컴포넌트
 */
export default function NotificationsScreen() {
  const { themed, theme } = useAppTheme();
  const router = useRouter();
  const { user: currentUser } = useAuth();

  // 알림 관리 훅 사용
  const {
    notifications,
    isLoading,
    error,
    hasMore,
    refreshNotifications,
    loadMoreNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  /**
   * 설정 버튼 클릭 핸들러
   */
  const handleSettingsPress = () => {
    // TODO: 알림 설정 화면으로 이동
    //console.log("알림 설정 화면으로 이동");
  };

  /**
   * 뒤로 가기 핸들러
   */
  const handleGoBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={themed($container)}>
      {/* 헤더 */}
      <View style={themed($header)}>
        <TouchableOpacity style={themed($backButton)} onPress={handleGoBack}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={themed($headerTitle)}>알림</Text>
        <View style={themed($headerRight)}>
          {/* 설정 버튼 */}
          <TouchableOpacity
            style={themed($settingsButton)}
            onPress={handleSettingsPress}
          >
            <Ionicons
              name="settings-outline"
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* 알림 목록 */}
      <NotificationList
        notifications={notifications}
        isLoading={isLoading}
        onRefresh={refreshNotifications}
        onLoadMore={loadMoreNotifications}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        hasMoreNotifications={hasMore}
      />

      {/* 에러 표시 (필요시) */}
      {error && (
        <View style={themed($errorContainer)}>
          <Text style={themed($errorText)}>{error}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// --- 스타일 정의 ---
const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
});

const $header: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
  backgroundColor: colors.background,
});

const $backButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.xs,
  marginLeft: -spacing.xs,
});

const $headerTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
  fontWeight: "bold",
  color: colors.text,
  flex: 1,
  textAlign: "center",
});

const $headerRight: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
});

const $settingsButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.xs,
  marginRight: -spacing.xs,
});

const $errorContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  position: "absolute",
  bottom: spacing.lg,
  left: spacing.md,
  right: spacing.md,
  backgroundColor: colors.error || "#EF4444",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderRadius: 8,
});

const $errorText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 14,
  textAlign: "center",
});
