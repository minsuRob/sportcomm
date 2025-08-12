import React, { useState, useEffect } from "react";
import {
  View,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Text,
  TouchableOpacity,
} from "react-native";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { Ionicons } from "@expo/vector-icons";
import NotificationItem, {
  Notification,
  NotificationType,
} from "./NotificationItem";

interface NotificationListProps {
  notifications?: Notification[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onLoadMore?: () => void;
  onMarkAsRead?: (notificationId: string) => void;
  onMarkAllAsRead?: () => void;
  hasMoreNotifications?: boolean;
}

/**
 * 개발용 임시 알림 데이터
 */
/*
 * "백엔드와 연결 필요"
 *
 * 아래 `getMockNotifications` 함수는 UI 개발 및 테스트를 위한 임시 데이터입니다.
 * 실제 프로덕션 환경에서는 `notifications` prop을 통해 서버에서 받아온
 * 실제 알림 데이터를 사용해야 합니다.
 * 이 함수와 관련된 로직은 최종적으로 제거되거나, 스토리북과 같은
 * UI 테스트 환경에서만 사용되도록 분리하는 것이 좋습니다.
 */
// const getMockNotifications = (): Notification[] => { ... };

/**
 * 알림 목록 컴포넌트
 */
export default function NotificationList({
  notifications,
  isLoading = false,
  onRefresh,
  onLoadMore,
  onMarkAsRead,
  onMarkAllAsRead,
  hasMoreNotifications = false,
}: NotificationListProps) {
  const { themed, theme } = useAppTheme();
  const [refreshing, setRefreshing] = useState(false);

  // 실제 알림이 없을 때 임시 데이터 사용 (개발 환경에서만)
  const displayNotifications = notifications || [];

  // 읽지 않은 알림 개수 계산
  const unreadCount = displayNotifications.filter((n) => !n.isRead).length;

  /**
   * 새로고침 핸들러
   */
  const handleRefresh = async () => {
    if (onRefresh) {
      setRefreshing(true);
      await onRefresh();
      setRefreshing(false);
    }
  };

  /**
   * 스크롤 이벤트 핸들러 (페이지네이션)
   */
  const handleOnEndReached = () => {
    if (hasMoreNotifications && !isLoading && onLoadMore) {
      onLoadMore();
    }
  };

  /**
   * 알림 아이템 렌더링
   */
  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <NotificationItem notification={item} onMarkAsRead={onMarkAsRead} />
  );

  /**
   * 리스트 헤더 (모두 읽음 처리 버튼)
   */
  const ListHeaderComponent = () => {
    if (unreadCount === 0) return null;

    return (
      <View style={themed($headerContainer)}>
        <Text style={themed($unreadCountText)}>
          읽지 않은 알림 {unreadCount}개
        </Text>
        {onMarkAllAsRead && (
          <TouchableOpacity
            style={themed($markAllReadButton)}
            onPress={onMarkAllAsRead}
          >
            <Text style={themed($markAllReadText)}>모두 읽음</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  /**
   * 리스트 푸터 (로딩 인디케이터)
   */
  const ListFooterComponent = () => {
    if (!isLoading || refreshing) return null;

    return (
      <View style={themed($footerContainer)}>
        <ActivityIndicator size="small" color={theme.colors.tint} />
        <Text style={themed($loadingText)}>알림을 불러오는 중...</Text>
      </View>
    );
  };

  /**
   * 빈 상태 컴포넌트
   */
  const ListEmptyComponent = () => {
    if (isLoading) return null;

    return (
      <View style={themed($emptyContainer)}>
        <Ionicons
          name="notifications-off"
          size={48}
          color={theme.colors.textDim}
        />
        <Text style={themed($emptyTitle)}>알림이 없습니다</Text>
        <Text style={themed($emptyText)}>
          새로운 알림이 있으면 여기에 표시됩니다.
        </Text>
      </View>
    );
  };

  return (
    <View style={themed($container)}>
      <FlatList
        data={displayNotifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.tint}
            />
          ) : undefined
        }
        onEndReached={handleOnEndReached}
        onEndReachedThreshold={0.1}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={ListFooterComponent}
        ListEmptyComponent={ListEmptyComponent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          displayNotifications.length === 0
            ? themed($emptyContentContainer)
            : undefined
        }
      />
    </View>
  );
}

// --- 스타일 정의 ---
const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
});

const $headerContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
  backgroundColor: colors.backgroundAlt,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $unreadCountText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  fontWeight: "600",
  color: colors.text,
});

const $markAllReadButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  backgroundColor: colors.tint,
  borderRadius: 16,
});

const $markAllReadText: ThemedStyle<TextStyle> = () => ({
  fontSize: 12,
  fontWeight: "600",
  color: "white",
});

const $footerContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  paddingVertical: spacing.lg,
  gap: spacing.sm,
});

const $loadingText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
});

const $emptyContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  paddingVertical: spacing.xl * 2,
  paddingHorizontal: spacing.lg,
});

const $emptyContentContainer: ThemedStyle<ViewStyle> = () => ({
  flexGrow: 1,
  justifyContent: "center",
});

const $emptyTitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 18,
  fontWeight: "600",
  color: colors.text,
  marginTop: spacing.md,
  marginBottom: spacing.sm,
});

const $emptyText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
  textAlign: "center",
  lineHeight: 20,
});
