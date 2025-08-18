import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { User } from "@/lib/auth";
import { ChatRoom } from "@/lib/chat/chatUtils";
import ChatRoomCard from "./ChatRoomCard";
import ChatRoomHeader from "./ChatRoomHeader";

interface ChatRoomListProps {
  currentUser: User | null;
  showHeader?: boolean;
  rooms: ChatRoom[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onAddRoom?: () => void;
  cardSize?: "small" | "medium" | "large";
  emptyMessage?: string;
  emptyDescription?: string;
}

/**
 * 채팅방 목록 컴포넌트
 *
 * 사용자가 참여할 수 있는 채팅방 목록을 표시합니다.
 */
export default function ChatRoomList({
  currentUser,
  showHeader = false,
  rooms = [],
  isLoading = false,
  onRefresh,
  onAddRoom,
  cardSize = "medium",
  emptyMessage = "참여 중인 채팅방이 없습니다",
  emptyDescription = "새로운 채팅방을 찾아보세요",
}: ChatRoomListProps) {
  const { themed, theme } = useAppTheme();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState<boolean>(false);

  // 채팅방 입장 핸들러
  const handleEnterRoom = async (room: ChatRoom) => {
    router.push({
      pathname: "/(details)/chat/[roomId]",
      params: {
        roomId: room.id,
        roomName: room.name,
      },
    });
  };

  // 새로고침 핸들러
  const handleRefresh = async () => {
    if (onRefresh) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
  };

  // 채팅방 아이템 렌더링
  const renderChatRoom = ({ item }: { item: ChatRoom }) => (
    <ChatRoomCard
      room={item}
      onPress={handleEnterRoom}
      currentUserName={currentUser?.nickname}
      size={cardSize}
    />
  );

  if (isLoading && rooms.length === 0) {
    return (
      <View style={themed($loadingContainer)}>
        <ActivityIndicator size="large" color={theme.colors.tint} />
        <Text style={themed($loadingText)}>채팅방 목록을 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <View style={themed($container)}>
      {/* 헤더 (옵션) */}
      {showHeader && (
        <ChatRoomHeader
          title="채팅"
          showAddButton={!!onAddRoom}
          onAdd={onAddRoom}
        />
      )}

      {/* 채팅방 목록 */}
      <FlatList
        data={rooms.filter((room) => room.isRoomActive !== false)}
        renderItem={renderChatRoom}
        keyExtractor={(item) => item.id}
        style={themed($flatList)}
        contentContainerStyle={themed($contentContainer)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isLoading}
            onRefresh={handleRefresh}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={themed($emptyContainer)}>
              <Ionicons
                name="chatbubbles-outline"
                color={theme.colors.textDim}
                size={48}
              />
              <Text style={themed($emptyTitle)}>{emptyMessage}</Text>
              <Text style={themed($emptyDescription)}>{emptyDescription}</Text>
              {onAddRoom && (
                <TouchableOpacity
                  style={themed($createButton)}
                  onPress={onAddRoom}
                >
                  <Ionicons name="add" color="white" size={16} />
                  <Text style={themed($createButtonText)}>채팅방 찾기</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null
        }
      />
    </View>
  );
}

// === 스타일 정의 ===

const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
});

const $flatList: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $contentContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.sm,
});

const $loadingContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  gap: spacing.md,
});

const $loadingText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
});

const $emptyContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: spacing.lg,
  gap: spacing.sm,
  paddingVertical: spacing.xl,
});

const $emptyTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  fontWeight: "600",
  color: colors.text,
  textAlign: "center",
});

const $emptyDescription: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
  textAlign: "center",
  lineHeight: 20,
});

const $createButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: colors.tint,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderRadius: 16,
  gap: spacing.xs,
});

const $createButtonText: ThemedStyle<TextStyle> = () => ({
  fontSize: 12,
  color: "white",
  fontWeight: "600",
});
