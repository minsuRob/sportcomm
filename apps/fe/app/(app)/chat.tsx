import React, { useState, useEffect } from "react";
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
import { useQuery, useMutation } from "@apollo/client";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { User, getSession } from "@/lib/auth";
import { GET_CHAT_ROOMS, JOIN_CHAT_CHANNEL } from "@/lib/graphql/chat";
import { GET_ADMIN_CHAT_ROOMS } from "@/lib/graphql/admin";
import { showToast } from "@/components/CustomToast";

// 채팅방 정보 타입
interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  type?: "PRIVATE" | "GROUP" | "PUBLIC";
  isRoomActive?: boolean;
  maxParticipants?: number;
  currentParticipants?: number;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  members: {
    userId: string;
    user: {
      id: string;
      nickname: string;
      profileImageUrl?: string;
    };
    isAdmin: boolean;
    joinedAt: string;
    lastReadAt: string;
  }[];
  createdAt: string;
}

// GraphQL 응답 타입
interface ChatRoomsResponse {
  chatChannels: ChatRoom[];
}

// 관리자 채팅방 응답 타입
interface AdminChatRoomsResponse {
  adminGetAllChatRooms: {
    chatRooms: {
      id: string;
      name: string;
      description?: string;
      type: "PRIVATE" | "GROUP" | "PUBLIC";
      isRoomActive: boolean;
      maxParticipants: number;
      currentParticipants: number;
      totalMessages: number;
      createdAt: string;
      updatedAt: string;
      lastMessageContent?: string;
      lastMessageAt?: string;
    }[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * 채팅방 목록 화면
 *
 * 사용자가 참여할 수 있는 채팅방 목록을 표시합니다.
 */
export default function ChatScreen() {
  const { themed, theme } = useAppTheme();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // GraphQL 쿼리 및 뮤테이션
  const { data, loading, error, refetch } = useQuery<ChatRoomsResponse>(
    GET_CHAT_ROOMS,
    {
      fetchPolicy: "cache-and-network",
      errorPolicy: "all",
    }
  );

  // 관리자 채팅방 쿼리 (공개 채팅방만)
  const {
    data: adminData,
    loading: adminLoading,
    error: adminError,
    refetch: refetchAdmin,
  } = useQuery<AdminChatRoomsResponse>(GET_ADMIN_CHAT_ROOMS, {
    variables: { page: 1, limit: 100 },
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });

  const [joinChatChannel] = useMutation(JOIN_CHAT_CHANNEL, {
    refetchQueries: [
      { query: GET_CHAT_ROOMS },
      { query: GET_ADMIN_CHAT_ROOMS, variables: { page: 1, limit: 100 } },
    ],
  });

  // 사용자 정보 로드
  useEffect(() => {
    const loadUser = async () => {
      const { user } = await getSession();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  // 에러 처리
  useEffect(() => {
    if (error) {
      console.error("채팅방 목록 로드 실패:", error);
      showToast({
        type: "error",
        title: "데이터 로드 실패",
        message:
          error.message || "채팅방 목록을 불러오는 중 오류가 발생했습니다.",
        duration: 3000,
      });
    }
    if (adminError) {
      console.error("관리자 채팅방 로드 실패:", adminError);
    }
  }, [error, adminError]);

  // 일반 채팅방과 관리자 채팅방 합치기
  const regularChatRooms = data?.chatChannels || [];
  const adminChatRooms = (adminData?.adminGetAllChatRooms?.chatRooms || [])
    .filter((room) => room.type === "PUBLIC" && room.isRoomActive) // 공개이고 활성화된 채팅방만
    .map((room) => ({
      id: room.id,
      name: room.name,
      description: room.description,
      isPrivate: false,
      type: room.type,
      isRoomActive: room.isRoomActive,
      maxParticipants: room.maxParticipants,
      currentParticipants: room.currentParticipants,
      lastMessage: room.lastMessageContent,
      lastMessageAt: room.lastMessageAt,
      unreadCount: 0, // 관리자 채팅방은 초기에 읽지 않은 메시지 0개
      members: [], // 빈 배열로 초기화 (자동 참여 처리)
      createdAt: room.createdAt,
    }));

  const chatRooms = [...regularChatRooms, ...adminChatRooms];

  // 채팅방 입장 핸들러 (임시로 자동 참여 기능 비활성화)
  const handleEnterRoom = async (room: ChatRoom) => {
    // 임시로 바로 채팅방으로 이동 (백엔드 뮤테이션 문제로 인해)
    router.push({
      pathname: "/(app)/chat/[roomId]",
      params: {
        roomId: room.id,
        roomName: room.name,
      },
    });
  };

  // 날짜 포맷팅
  const formatDate = (dateString?: string) => {
    if (!dateString) return "";

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "방금 전";
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;

    return date.toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
    });
  };

  // 채팅방 타입별 아이콘 및 색상 반환
  const getRoomTypeInfo = (room: ChatRoom) => {
    // 관리자가 생성한 채팅방인 경우 type 필드 사용
    if (room.type) {
      switch (room.type) {
        case "PUBLIC":
          return { icon: "globe-outline", color: "#3B82F6", label: "공개" };
        case "GROUP":
          return { icon: "people-outline", color: "#10B981", label: "그룹" };
        case "PRIVATE":
          return {
            icon: "lock-closed-outline",
            color: "#8B5CF6",
            label: "개인",
          };
        default:
          return {
            icon: "chatbubbles-outline",
            color: theme.colors.tint,
            label: "채팅",
          };
      }
    }

    // 기존 채팅방 (isPrivate 기반)
    return {
      icon: room.isPrivate ? "lock-closed" : "chatbubbles",
      color: theme.colors.tint,
      label: room.isPrivate ? "개인" : "채팅",
    };
  };

  // 채팅방 아이템 렌더링
  const renderChatRoom = ({ item }: { item: ChatRoom }) => {
    const memberCount = item.currentParticipants || item.members.length;
    const hasUnread = item.unreadCount > 0;
    const typeInfo = getRoomTypeInfo(item);

    // 비활성화된 채팅방은 표시하지 않음
    if (item.isRoomActive === false) {
      return null;
    }

    return (
      <TouchableOpacity
        style={themed($roomCard)}
        onPress={() => handleEnterRoom(item)}
      >
        <View style={themed($roomHeader)}>
          <View
            style={[
              themed($roomIconContainer),
              { backgroundColor: typeInfo.color + "20" },
            ]}
          >
            <Ionicons
              name={typeInfo.icon as any}
              color={typeInfo.color}
              size={24}
            />
          </View>

          <View style={themed($roomContent)}>
            <View style={themed($roomTitleRow)}>
              <Text style={themed($roomName)} numberOfLines={1}>
                {item.name}
              </Text>
              {item.lastMessageAt && (
                <Text style={themed($roomTime)}>
                  {formatDate(item.lastMessageAt)}
                </Text>
              )}
            </View>

            <View style={themed($roomInfoRow)}>
              <Text style={themed($roomLastMessage)} numberOfLines={1}>
                {item.lastMessage || "메시지가 없습니다"}
              </Text>
              <View style={themed($roomBadges)}>
                {/* 채팅방 타입 표시 */}
                {item.type && (
                  <View
                    style={[
                      themed($typeBadge),
                      { backgroundColor: typeInfo.color + "20" },
                    ]}
                  >
                    <Text
                      style={[themed($typeText), { color: typeInfo.color }]}
                    >
                      {typeInfo.label}
                    </Text>
                  </View>
                )}

                {/* 멤버 수 표시 */}
                <View style={themed($memberBadge)}>
                  <Ionicons
                    name="people"
                    color={theme.colors.textDim}
                    size={12}
                  />
                  <Text style={themed($memberCount)}>
                    {memberCount}
                    {item.maxParticipants && `/${item.maxParticipants}`}
                  </Text>
                </View>

                {/* 읽지 않은 메시지 수 */}
                {hasUnread && (
                  <View style={themed($unreadBadge)}>
                    <Text style={themed($unreadCount)}>
                      {item.unreadCount > 99 ? "99+" : item.unreadCount}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {item.description && (
              <Text style={themed($roomDescription)} numberOfLines={1}>
                {item.description}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // 새로고침 핸들러
  const handleRefresh = async () => {
    await Promise.all([refetch(), refetchAdmin()]);
  };

  if ((loading || adminLoading) && !data && !adminData) {
    return (
      <View style={themed($container)}>
        <View style={themed($header)}>
          <Text style={themed($headerTitle)}>채팅</Text>
        </View>
        <View style={themed($loadingContainer)}>
          <ActivityIndicator size="large" color={theme.colors.tint} />
          <Text style={themed($loadingText)}>채팅방 목록을 불러오는 중...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={themed($container)}>
      {/* 헤더 */}
      <View style={themed($header)}>
        <Text style={themed($headerTitle)}>채팅</Text>
        <TouchableOpacity onPress={() => router.push("/(app)/chat/rooms")}>
          <Ionicons name="add" color={theme.colors.tint} size={24} />
        </TouchableOpacity>
      </View>

      {/* 채팅방 목록 */}
      <FlatList
        data={chatRooms.filter((room) => room.isRoomActive !== false)} // 비활성화된 채팅방 제외
        renderItem={renderChatRoom}
        keyExtractor={(item) => item.id}
        style={themed($flatList)}
        contentContainerStyle={themed($contentContainer)}
        refreshControl={
          <RefreshControl
            refreshing={loading || adminLoading}
            onRefresh={handleRefresh}
          />
        }
        ListEmptyComponent={
          !loading && !adminLoading ? (
            <View style={themed($emptyContainer)}>
              <Ionicons
                name="chatbubbles-outline"
                color={theme.colors.textDim}
                size={64}
              />
              <Text style={themed($emptyTitle)}>
                참여 중인 채팅방이 없습니다
              </Text>
              <Text style={themed($emptyDescription)}>
                새로운 채팅방을 만들거나 기존 채팅방에 참여해보세요
              </Text>
              <TouchableOpacity
                style={themed($createButton)}
                onPress={() => router.push("/(app)/chat/rooms")}
              >
                <Ionicons name="add" color="white" size={20} />
                <Text style={themed($createButtonText)}>채팅방 찾기</Text>
              </TouchableOpacity>
            </View>
          ) : null
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

const $header: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.lg,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $headerTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 24,
  fontWeight: "bold",
  color: colors.text,
});

const $flatList: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $contentContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.md,
});

const $loadingContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  gap: spacing.md,
});

const $loadingText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  color: colors.textDim,
});

const $roomCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.card,
  borderRadius: 12,
  padding: spacing.md,
  marginBottom: spacing.sm,
  borderWidth: 1,
  borderColor: colors.border,
});

const $roomHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "flex-start",
  gap: spacing.md,
});

const $roomIconContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  width: 48,
  height: 48,
  borderRadius: 24,
  justifyContent: "center",
  alignItems: "center",
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
  fontSize: 16,
  fontWeight: "600",
  color: colors.text,
  flex: 1,
});

const $roomTime: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
});

const $roomInfoRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.xs,
});

const $roomLastMessage: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
  flex: 1,
});

const $roomBadges: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
});

const $memberBadge: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: colors.border + "50",
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 12,
  gap: spacing.xs,
});

const $memberCount: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
});

const $unreadBadge: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.tint,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 12,
  minWidth: 20,
  alignItems: "center",
});

const $unreadCount: ThemedStyle<TextStyle> = () => ({
  fontSize: 12,
  color: "white",
  fontWeight: "600",
});

const $roomDescription: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
  fontStyle: "italic",
});

const $emptyContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: spacing.xl,
  gap: spacing.md,
});

const $emptyTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
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
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
  borderRadius: 24,
  gap: spacing.sm,
});

const $createButtonText: ThemedStyle<TextStyle> = () => ({
  fontSize: 16,
  color: "white",
  fontWeight: "600",
});

const $typeBadge: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 12,
});

const $typeText: ThemedStyle<TextStyle> = () => ({
  fontSize: 11,
  fontWeight: "500",
});
