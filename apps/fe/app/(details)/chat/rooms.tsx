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
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "@apollo/client";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { User, getSession } from "@/lib/auth";
import { showToast } from "@/components/CustomToast";

// 임시로 관리자 채팅방 조회 쿼리 사용 (실제로는 공개 채팅방 조회 쿼리가 필요)
import { GET_ADMIN_CHAT_ROOMS } from "@/lib/graphql/admin";
import { JOIN_CHAT_CHANNEL } from "@/lib/graphql/chat";

// 공개 채팅방 정보 타입
interface PublicChatRoom {
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
}

// GraphQL 응답 타입
interface PublicChatRoomsResponse {
  adminGetAllChatRooms: {
    chatRooms: PublicChatRoom[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * 공개 채팅방 찾기 화면
 *
 * 사용자가 참여할 수 있는 공개 채팅방 목록을 표시합니다.
 */
export default function ChatRoomsScreen() {
  const { themed, theme } = useAppTheme();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // GraphQL 쿼리 및 뮤테이션
  const { data, loading, error, refetch } = useQuery<PublicChatRoomsResponse>(
    GET_ADMIN_CHAT_ROOMS,
    {
      variables: { page: 1, limit: 50 },
      fetchPolicy: "cache-and-network",
      errorPolicy: "all",
    }
  );

  const [joinChatChannel, { loading: joinLoading }] = useMutation(
    JOIN_CHAT_CHANNEL,
    {
      onCompleted: (data) => {
        if (data.addChatChannelMembers.success) {
          showToast({
            type: "success",
            title: "채팅방 참여",
            message: "채팅방에 성공적으로 참여했습니다.",
            duration: 2000,
          });
        }
      },
      onError: (error) => {
        console.error("채팅방 참여 실패:", error);
        showToast({
          type: "error",
          title: "참여 실패",
          message: error.message || "채팅방 참여 중 오류가 발생했습니다.",
          duration: 3000,
        });
      },
    }
  );

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
  }, [error]);

  // 공개 채팅방만 필터링 (활성화된 것만)
  const publicRooms = (data?.adminGetAllChatRooms?.chatRooms || []).filter(
    (room) =>
      room.type === "PUBLIC" &&
      room.isRoomActive &&
      (searchQuery === "" ||
        room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // 채팅방 참여 핸들러 (임시로 자동 참여 기능 비활성화)
  const handleJoinRoom = async (room: PublicChatRoom) => {
    if (!currentUser) {
      showToast({
        type: "error",
        title: "로그인 필요",
        message: "채팅방에 참여하려면 로그인이 필요합니다.",
        duration: 3000,
      });
      return;
    }

    // 임시로 바로 채팅방으로 이동
    router.push({
      pathname: "/(details)/chat/[roomId]",
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

  // 채팅방 아이템 렌더링
  const renderChatRoom = ({ item }: { item: PublicChatRoom }) => {
    const isNearFull = item.currentParticipants / item.maxParticipants > 0.8;

    return (
      <TouchableOpacity
        style={themed($roomCard)}
        onPress={() => handleJoinRoom(item)}
        disabled={joinLoading}
      >
        <View style={themed($roomHeader)}>
          <View style={themed($roomIconContainer)}>
            <Ionicons name="globe-outline" color="#3B82F6" size={24} />
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

            {item.description && (
              <Text style={themed($roomDescription)} numberOfLines={2}>
                {item.description}
              </Text>
            )}

            <View style={themed($roomInfoRow)}>
              <View style={themed($roomStats)}>
                <View style={themed($statItem)}>
                  <Ionicons
                    name="people"
                    color={theme.colors.textDim}
                    size={14}
                  />
                  <Text
                    style={[
                      themed($statText),
                      isNearFull && { color: "#EF4444" },
                    ]}
                  >
                    {item.currentParticipants}/{item.maxParticipants}
                  </Text>
                </View>

                <View style={themed($statItem)}>
                  <Ionicons
                    name="chatbubble"
                    color={theme.colors.textDim}
                    size={14}
                  />
                  <Text style={themed($statText)}>
                    {item.totalMessages.toLocaleString()}
                  </Text>
                </View>
              </View>

              <View style={themed($joinButton)}>
                <Ionicons
                  name="add-circle"
                  color={theme.colors.tint}
                  size={20}
                />
                <Text style={themed($joinButtonText)}>참여</Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !data) {
    return (
      <View style={themed($container)}>
        <View style={themed($header)}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" color={theme.colors.text} size={24} />
          </TouchableOpacity>
          <Text style={themed($headerTitle)}>채팅방 찾기</Text>
          <View style={{ width: 24 }} />
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
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={themed($headerTitle)}>채팅방 찾기</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* 검색 바 */}
      <View style={themed($searchContainer)}>
        <View style={themed($searchInputContainer)}>
          <Ionicons
            name="search"
            color={theme.colors.textDim}
            size={20}
            style={themed($searchIcon)}
          />
          <TextInput
            style={themed($searchInput)}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="채팅방 이름 또는 설명 검색..."
            placeholderTextColor={theme.colors.textDim}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={themed($clearButton)}
            >
              <Ionicons
                name="close-circle"
                color={theme.colors.textDim}
                size={20}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 채팅방 목록 */}
      <FlatList
        data={publicRooms}
        renderItem={renderChatRoom}
        keyExtractor={(item) => item.id}
        style={themed($flatList)}
        contentContainerStyle={themed($contentContainer)}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => refetch()} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={themed($emptyContainer)}>
              <Ionicons
                name="globe-outline"
                color={theme.colors.textDim}
                size={64}
              />
              <Text style={themed($emptyTitle)}>
                {searchQuery
                  ? "검색 결과가 없습니다"
                  : "참여 가능한 채팅방이 없습니다"}
              </Text>
              <Text style={themed($emptyDescription)}>
                {searchQuery
                  ? "다른 검색어로 시도해보세요"
                  : "관리자가 새로운 채팅방을 만들 때까지 기다려주세요"}
              </Text>
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
  fontSize: 20,
  fontWeight: "bold",
  color: colors.text,
});

const $searchContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
});

const $searchInputContainer: ThemedStyle<ViewStyle> = ({
  colors,
  spacing,
}) => ({
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: colors.card,
  borderRadius: 24,
  paddingHorizontal: spacing.md,
  borderWidth: 1,
  borderColor: colors.border,
});

const $searchIcon: ThemedStyle<any> = ({ spacing }) => ({
  marginRight: spacing.sm,
});

const $searchInput: ThemedStyle<any> = ({ colors, spacing }) => ({
  flex: 1,
  fontSize: 16,
  color: colors.text,
  paddingVertical: spacing.sm,
});

const $clearButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.xs,
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
  backgroundColor: "#3B82F620",
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

const $roomDescription: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 14,
  color: colors.textDim,
  marginBottom: spacing.sm,
  lineHeight: 20,
});

const $roomInfoRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
});

const $roomStats: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.lg,
});

const $statItem: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
});

const $statText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
});

const $joinButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: colors.tint + "20",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderRadius: 16,
  gap: spacing.xs,
});

const $joinButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.tint,
  fontWeight: "600",
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
