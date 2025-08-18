import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";

/**
 * 채팅방 헤더 컴포넌트 Props
 */
interface ChatRoomHeaderProps {
  title: string;
  onBack?: () => void;
  onAdd?: () => void;
  actions?: Array<{
    icon: string;
    onPress: () => void;
    label?: string;
  }>;
  showBackButton?: boolean;
  showAddButton?: boolean;
}

/**
 * 재사용 가능한 채팅방 헤더 컴포넌트
 *
 * 채팅 관련 화면에서 사용되는 공통 헤더를 제공합니다.
 */
export default function ChatRoomHeader({
  title,
  onBack,
  onAdd,
  actions = [],
  showBackButton = false,
  showAddButton = false,
}: ChatRoomHeaderProps) {
  const { themed, theme } = useAppTheme();

  return (
    <View style={themed($header)}>
      {/* 왼쪽 영역 */}
      <View style={themed($leftSection)}>
        {showBackButton && onBack && (
          <TouchableOpacity style={themed($backButton)} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        )}
        <Text style={themed($headerTitle)}>{title}</Text>
      </View>

      {/* 오른쪽 영역 */}
      <View style={themed($rightSection)}>
        {/* 커스텀 액션들 */}
        {actions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={themed($actionButton)}
            onPress={action.onPress}
          >
            <Ionicons
              name={action.icon as any}
              size={24}
              color={theme.colors.text}
            />
            {action.label && (
              <Text style={themed($actionLabel)}>{action.label}</Text>
            )}
          </TouchableOpacity>
        ))}

        {/* 추가 버튼 */}
        {showAddButton && onAdd && (
          <TouchableOpacity style={themed($addButton)} onPress={onAdd}>
            <Ionicons name="add" color={theme.colors.tint} size={24} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// === 스타일 정의 ===

const $header: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.lg,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
  backgroundColor: colors.background,
});

const $leftSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  flex: 1,
  gap: spacing.md,
});

const $rightSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
});

const $backButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.xs,
});

const $headerTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 20,
  fontWeight: "bold",
  color: colors.text,
  flex: 1,
});

const $actionButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  padding: spacing.xs,
  gap: spacing.xs,
});

const $actionLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.text,
});

const $addButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.xs,
});
