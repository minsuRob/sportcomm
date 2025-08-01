import React, { useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  ViewStyle,
  TextStyle,
  Image,
  ImageStyle,
} from "react-native";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { Ionicons } from "@expo/vector-icons";
import { Notification, NotificationType } from "./NotificationItem";
import { useNewNotificationToast } from "@/lib/notifications";

interface NotificationToastProps {
  onPress?: (notification: Notification) => void;
  position?: "top" | "bottom";
  duration?: number; // 자동 숨김 시간 (ms)
}

/**
 * 알림 타입별 아이콘 반환
 */
const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case NotificationType.LIKE:
      return "heart";
    case NotificationType.COMMENT:
      return "chatbubble";
    case NotificationType.FOLLOW:
      return "person-add";
    case NotificationType.MENTION:
      return "at";
    case NotificationType.POST:
      return "document-text";
    case NotificationType.SYSTEM:
      return "notifications";
    default:
      return "notifications";
  }
};

/**
 * 실시간 알림 토스트 컴포넌트
 * 새로운 알림이 도착했을 때 화면 상단에 표시되는 토스트
 */
export default function NotificationToast({
  onPress,
  position = "top",
  duration = 4000,
}: NotificationToastProps) {
  const { themed, theme } = useAppTheme();
  const { latestNotification, showToast, dismissToast } =
    useNewNotificationToast();
  const slideAnim = new Animated.Value(-100);
  const opacityAnim = new Animated.Value(0);

  /**
   * 토스트 표시 애니메이션
   */
  const showToastAnimation = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  /**
   * 토스트 숨김 애니메이션
   */
  const hideToastAnimation = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: position === "top" ? -100 : 100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      dismissToast();
    });
  };

  /**
   * 토스트 클릭 핸들러
   */
  const handlePress = () => {
    if (latestNotification && onPress) {
      onPress(latestNotification);
    }
    hideToastAnimation();
  };

  /**
   * 토스트 닫기 핸들러
   */
  const handleDismiss = () => {
    hideToastAnimation();
  };

  // 토스트 표시/숨김 효과
  useEffect(() => {
    if (showToast && latestNotification) {
      showToastAnimation();

      // 자동 숨김 타이머
      const timer = setTimeout(() => {
        hideToastAnimation();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [showToast, latestNotification, duration]);

  // 알림이 없으면 렌더링하지 않음
  if (!showToast || !latestNotification) {
    return null;
  }

  const iconName = getNotificationIcon(latestNotification.type);

  return (
    <Animated.View
      style={[
        themed($container),
        position === "top" ? themed($containerTop) : themed($containerBottom),
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <TouchableOpacity
        style={themed($toastContent)}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        {/* 알림 아이콘 */}
        <View style={themed($iconContainer)}>
          <Ionicons
            name={iconName as any}
            size={20}
            color={theme.colors.tint}
          />
        </View>

        {/* 사용자 프로필 이미지 (있는 경우) */}
        {latestNotification.user && (
          <Image
            source={{
              uri:
                latestNotification.user.profileImageUrl ||
                `https://i.pravatar.cc/150?u=${latestNotification.user.id}`,
            }}
            style={themed($profileImage)}
          />
        )}

        {/* 알림 내용 */}
        <View style={themed($contentContainer)}>
          <Text style={themed($title)} numberOfLines={1}>
            {latestNotification.title}
          </Text>
          <Text style={themed($message)} numberOfLines={2}>
            {latestNotification.message}
          </Text>
        </View>

        {/* 닫기 버튼 */}
        <TouchableOpacity
          style={themed($closeButton)}
          onPress={handleDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={16} color={theme.colors.textDim} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

// --- 스타일 정의 ---
const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  position: "absolute",
  left: spacing.md,
  right: spacing.md,
  zIndex: 1000,
});

const $containerTop: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  top: spacing.xl + 20, // 상태바 + 여백
});

const $containerBottom: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  bottom: spacing.xl + 20, // 하단 여백
});

const $toastContent: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: colors.background,
  borderRadius: 12,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
  shadowColor: "#000",
  shadowOffset: {
    width: 0,
    height: 4,
  },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 8,
  borderWidth: 1,
  borderColor: colors.border,
});

const $iconContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  width: 32,
  height: 32,
  borderRadius: 16,
  backgroundColor: colors.tint + "20",
  justifyContent: "center",
  alignItems: "center",
  marginRight: spacing.sm,
});

const $profileImage: ThemedStyle<ImageStyle> = ({ spacing }) => ({
  width: 28,
  height: 28,
  borderRadius: 14,
  marginRight: spacing.sm,
  marginLeft: -spacing.xs,
});

const $contentContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $title: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  fontWeight: "600",
  color: colors.text,
  marginBottom: 2,
});

const $message: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
  lineHeight: 16,
});

const $closeButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.xs,
  marginLeft: spacing.sm,
});
