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
import {
  ChatRoom,
  formatChatDate,
  getRoomTypeInfo,
  getMemberCount,
  hasUnreadMessages,
  formatUnreadCount,
  getChatRoomDisplayName,
} from "@/lib/chat/chatUtils";

/**
 * 채팅방 카드 컴포넌트 Props
 */
interface ChatRoomCardProps {
  room: ChatRoom;
  onPress: (room: ChatRoom) => void;
  currentUserName?: string;
  size?: "small" | "medium" | "large";
}

/**
 * 재사용 가능한 채팅방 카드 컴포넌트
 *
 * 채팅방 목록에서 사용되는 개별 채팅방 아이템을 표시합니다.
 */
export default function ChatRoomCard({
  room,
  onPress,
  currentUserName,
  size = "medium",
}: ChatRoomCardProps) {
  const { themed, theme } = useAppTheme();

  // 비활성화된 채팅방은 렌더링하지 않음
  if (room.isRoomActive === false) {
    return null;
  }

  const memberCount = getMemberCount(room);
  const hasUnread = hasUnreadMessages(room);
  const typeInfo = getRoomTypeInfo(room, theme.colors.tint);
  const displayName = getChatRoomDisplayName(room, currentUserName);

  const sizeStyles = getSizeStyles(size);

  return (
    <TouchableOpacity
      style={[themed($roomCard), sizeStyles.card]}
      onPress={() => onPress(room)}
    >
      <View style={themed($roomHeader)}>
        {/* 채팅방 아이콘 */}
        <View
          style={[
            themed($roomIconContainer),
            sizeStyles.iconContainer,
            { backgroundColor: typeInfo.color + "20" },
          ]}
        >
          {typeInfo.teamIcon ? (
            <Text style={[themed($teamIcon), sizeStyles.teamIcon]}>
              {typeInfo.teamIcon}
            </Text>
          ) : (
            <Ionicons
              name={typeInfo.icon as any}
              color={typeInfo.color}
              size={sizeStyles.iconSize}
            />
          )}
        </View>

        {/* 채팅방 정보 */}
        <View style={themed($roomContent)}>
          {/* 제목 행 */}
          <View style={themed($roomTitleRow)}>
            <Text
              style={[themed($roomName), sizeStyles.roomName]}
              numberOfLines={1}
            >
              {displayName}
            </Text>
            {room.lastMessageAt && (
              <Text style={[themed($roomTime), sizeStyles.roomTime]}>
                {formatChatDate(room.lastMessageAt)}
              </Text>
            )}
          </View>

          {/* 정보 행 */}
          <View style={themed($roomInfoRow)}>
            <Text
              style={[themed($roomLastMessage), sizeStyles.lastMessage]}
              numberOfLines={1}
            >
              {room.lastMessage || "메시지가 없습니다"}
            </Text>
            <View style={themed($roomBadges)}>
              {/* 채팅방 타입 표시 */}
              {room.type && size !== "small" && (
                <View
                  style={[
                    themed($typeBadge),
                    { backgroundColor: typeInfo.color + "20" },
                  ]}
                >
                  <Text style={[themed($typeText), { color: typeInfo.color }]}>
                    {typeInfo.label}
                  </Text>
                </View>
              )}

              {/* 멤버 수 표시 */}
              {size !== "small" && (
                <View style={themed($memberBadge)}>
                  <Ionicons
                    name="people"
                    color={theme.colors.textDim}
                    size={sizeStyles.badgeIconSize}
                  />
                  <Text style={[themed($memberCount), sizeStyles.memberCount]}>
                    {memberCount}
                    {room.maxParticipants && `/${room.maxParticipants}`}
                  </Text>
                </View>
              )}

              {/* 읽지 않은 메시지 수 */}
              {hasUnread && (
                <View style={themed($unreadBadge)}>
                  <Text style={[themed($unreadCount), sizeStyles.unreadCount]}>
                    {formatUnreadCount(room.unreadCount)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* 설명 (medium, large 사이즈에서만 표시) */}
          {room.description && size !== "small" && (
            <Text
              style={[themed($roomDescription), sizeStyles.description]}
              numberOfLines={1}
            >
              {room.description}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

/**
 * 크기별 스타일 반환
 */
function getSizeStyles(size: "small" | "medium" | "large") {
  switch (size) {
    case "small":
      return {
        card: { paddingVertical: 8, paddingHorizontal: 12 },
        iconContainer: { width: 32, height: 32 },
        iconSize: 16,
        teamIcon: { fontSize: 14 },
        roomName: { fontSize: 14 },
        roomTime: { fontSize: 10 },
        lastMessage: { fontSize: 11 },
        memberCount: { fontSize: 9 },
        unreadCount: { fontSize: 9 },
        description: { fontSize: 10 },
        badgeIconSize: 8,
      };
    case "large":
      return {
        card: { paddingVertical: 16, paddingHorizontal: 16 },
        iconContainer: { width: 48, height: 48 },
        iconSize: 24,
        teamIcon: { fontSize: 20 },
        roomName: { fontSize: 16 },
        roomTime: { fontSize: 12 },
        lastMessage: { fontSize: 14 },
        memberCount: { fontSize: 11 },
        unreadCount: { fontSize: 11 },
        description: { fontSize: 12 },
        badgeIconSize: 12,
      };
    default: // medium
      return {
        card: { paddingVertical: 12, paddingHorizontal: 12 },
        iconContainer: { width: 36, height: 36 },
        iconSize: 20,
        teamIcon: { fontSize: 18 },
        roomName: { fontSize: 14 },
        roomTime: { fontSize: 10 },
        lastMessage: { fontSize: 12 },
        memberCount: { fontSize: 10 },
        unreadCount: { fontSize: 10 },
        description: { fontSize: 10 },
        badgeIconSize: 10,
      };
  }
}

// === 스타일 정의 ===

const $roomCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.card,
  borderRadius: 8,
  marginBottom: spacing.xs,
  borderWidth: 1,
  borderColor: colors.border,
});

const $roomHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "flex-start",
  gap: spacing.sm,
});

const $roomIconContainer: ThemedStyle<ViewStyle> = () => ({
  borderRadius: 18,
  justifyContent: "center",
  alignItems: "center",
});

const $teamIcon: ThemedStyle<TextStyle> = () => ({
  // 동적 크기는 인라인으로 적용
});

const $roomContent: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $roomTitleRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.xs,
});

const $roomName: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontWeight: "600",
  color: colors.text,
  flex: 1,
});

const $roomTime: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
});

const $roomInfoRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.xs,
});

const $roomLastMessage: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  flex: 1,
});

const $roomBadges: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
});

const $typeBadge: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.xs,
  paddingVertical: 2,
  borderRadius: 8,
});

const $typeText: ThemedStyle<TextStyle> = () => ({
  fontSize: 9,
  fontWeight: "500",
});

const $memberBadge: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: colors.border + "50",
  paddingHorizontal: spacing.xs,
  paddingVertical: 2,
  borderRadius: 8,
  gap: 2,
});

const $memberCount: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
});

const $unreadBadge: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.tint,
  paddingHorizontal: spacing.xs,
  paddingVertical: 2,
  borderRadius: 8,
  minWidth: 16,
  alignItems: "center",
});

const $unreadCount: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontWeight: "600",
});

const $roomDescription: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  fontStyle: "italic",
});
