import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ViewStyle,
  TextStyle,
  ImageStyle,
} from "react-native";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { Ionicons } from "@expo/vector-icons";

/**
 * 알림 타입 정의
 */
export enum NotificationType {
  LIKE = "LIKE", // 좋아요
  COMMENT = "COMMENT", // 댓글
  FOLLOW = "FOLLOW", // 팔로우
  MENTION = "MENTION", // 멘션
  POST = "POST", // 새 게시물
  SYSTEM = "SYSTEM", // 시스템 알림
}

/**
 * 알림 데이터 인터페이스
 */
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  user?: {
    id: string;
    nickname: string;
    profileImageUrl?: string;
  };
  post?: {
    id: string;
    title?: string;
    content: string;
  };
  actionUrl?: string; // 클릭 시 이동할 URL
}

interface NotificationItemProps {
  notification: Notification;
  onPress?: (notification: Notification) => void;
  onMarkAsRead?: (notificationId: string) => void;
}

/**
 * 알림 타입별 아이콘과 색상 반환
 */
const getNotificationStyle = (type: NotificationType) => {
  switch (type) {
    case NotificationType.LIKE:
      return { icon: "heart", color: "#EF4444" };
    case NotificationType.COMMENT:
      return { icon: "chatbubble", color: "#3B82F6" };
    case NotificationType.FOLLOW:
      return { icon: "person-add", color: "#10B981" };
    case NotificationType.MENTION:
      return { icon: "at", color: "#F59E0B" };
    case NotificationType.POST:
      return { icon: "document-text", color: "#8B5CF6" };
    case NotificationType.SYSTEM:
      return { icon: "notifications", color: "#6B7280" };
    default:
      return { icon: "notifications", color: "#6B7280" };
  }
};

/**
 * 시간 포맷팅 함수
 */
const formatTimeAgo = (dateString: string): string => {
  const now = new Date();
  const notificationDate = new Date(dateString);
  const diffMinutes = Math.floor(
    (now.getTime() - notificationDate.getTime()) / (1000 * 60)
  );

  if (diffMinutes < 1) return "방금 전";
  if (diffMinutes < 60) return `${diffMinutes}분 전`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}일 전`;

  return notificationDate.toLocaleDateString("ko-KR");
};

/**
 * 개별 알림 아이템 컴포넌트
 */
export default function NotificationItem({
  notification,
  onPress,
  onMarkAsRead,
}: NotificationItemProps) {
  const { themed, theme } = useAppTheme();
  const router = useRouter();

  const notificationStyle = getNotificationStyle(notification.type);

  /**
   * 알림 클릭 핸들러
   */
  const handlePress = () => {
    // 읽지 않은 알림이면 읽음 처리
    if (!notification.isRead && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }

    // 커스텀 핸들러가 있으면 실행
    if (onPress) {
      onPress(notification);
      return;
    }

    // 기본 네비게이션 처리
    if (notification.actionUrl) {
      router.push(notification.actionUrl as any);
    } else if (notification.post) {
      router.push({
        pathname: "/post/[postId]",
        params: { postId: notification.post.id },
      });
    } else if (notification.user) {
      router.push({
        pathname: "/profile/[userId]",
        params: { userId: notification.user.id },
      });
    }
  };

  return (
    <TouchableOpacity
      style={[
        themed($container),
        !notification.isRead && themed($unreadContainer),
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* 읽지 않은 알림 표시 점 */}
      {!notification.isRead && <View style={themed($unreadDot)} />}

      {/* 알림 아이콘 */}
      <View
        style={[
          themed($iconContainer),
          { backgroundColor: notificationStyle.color + "20" },
        ]}
      >
        <Ionicons
          name={notificationStyle.icon as any}
          size={20}
          color={notificationStyle.color}
        />
      </View>

      {/* 사용자 프로필 이미지 (있는 경우) */}
      {notification.user && (
        <Image
          source={{
            uri:
              notification.user.profileImageUrl ||
              `https://i.pravatar.cc/150?u=${notification.user.id}`,
          }}
          style={themed($profileImage)}
        />
      )}

      {/* 알림 내용 */}
      <View style={themed($contentContainer)}>
        <Text style={themed($title)} numberOfLines={1}>
          {notification.title}
        </Text>
        <Text style={themed($message)} numberOfLines={2}>
          {notification.message}
        </Text>
        <Text style={themed($timeText)}>
          {formatTimeAgo(notification.createdAt)}
        </Text>
      </View>

      {/* 화살표 아이콘 */}
      <Ionicons
        name="chevron-forward"
        size={16}
        color={theme.colors.textDim}
        style={themed($chevron)}
      />
    </TouchableOpacity>
  );
}

// --- 스타일 정의 ---
const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
  backgroundColor: colors.background,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
  position: "relative",
});

const $unreadContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tint + "05",
});

const $unreadDot: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: "absolute",
  left: 8,
  top: "50%",
  marginTop: -4,
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: colors.tint,
  zIndex: 1,
});

const $iconContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  width: 40,
  height: 40,
  borderRadius: 20,
  justifyContent: "center",
  alignItems: "center",
  marginRight: spacing.sm,
});

const $profileImage: ThemedStyle<ImageStyle> = ({ spacing }) => ({
  width: 32,
  height: 32,
  borderRadius: 16,
  marginRight: spacing.sm,
  marginLeft: -spacing.xs,
});

const $contentContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $title: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  fontWeight: "600",
  color: colors.text,
  marginBottom: 2,
});

const $message: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 14,
  color: colors.textDim,
  lineHeight: 20,
  marginBottom: spacing.xs,
});

const $timeText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
});

const $chevron: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginLeft: spacing.sm,
});
