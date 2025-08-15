import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ViewStyle,
  TextStyle,
  ImageStyle,
  ActivityIndicator,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useLazyQuery, useMutation } from "@apollo/client";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { User, getSession } from "@/lib/auth";
import {
  SEARCH_USERS_FOR_CHAT,
  CREATE_OR_GET_PRIVATE_CHAT,
  GET_USER_PRIVATE_CHATS,
  SearchUsersResponse,
  CreatePrivateChatResponse,
  SearchUser,
} from "@/lib/graphql/user-chat";
import { showToast } from "@/components/CustomToast";

/**
 * 1대1 개인 채팅 시작 모달 화면
 *
 * 사용자를 검색하고 1대1 채팅을 시작할 수 있는 화면입니다.
 */
export default function StartPrivateChatModal() {
  const { themed, theme } = useAppTheme();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);

  // GraphQL 쿼리 및 뮤테이션
  const [searchUsers, { loading: searchLoading, error: searchError }] =
    useLazyQuery<SearchUsersResponse>(SEARCH_USERS_FOR_CHAT, {
      fetchPolicy: "cache-and-network",
      onCompleted: (data) => {
        setSearchResults(data.searchUsersForChat.users);
      },
      onError: (error) => {
        console.error("사용자 검색 실패:", error);
        showToast({
          type: "error",
          title: "검색 실패",
          message: "사용자 검색 중 오류가 발생했습니다.",
          duration: 3000,
        });
      },
    });

  const [createOrGetPrivateChat, { loading: createLoading }] =
    useMutation<CreatePrivateChatResponse>(CREATE_OR_GET_PRIVATE_CHAT, {
      refetchQueries: [
        { query: GET_USER_PRIVATE_CHATS, variables: { page: 1, limit: 100 } },
      ],
      onCompleted: (data) => {
        const chatRoom = data.createOrGetPrivateChat;
        showToast({
          type: "success",
          title: "채팅방 생성",
          message: `${chatRoom.name} 채팅방이 준비되었습니다.`,
          duration: 2000,
        });

        // 채팅방으로 이동 (1대1 채팅이므로 상대방 이름을 제목으로 사용)
        const displayName =
          chatRoom.participants.find((p) => p.id !== currentUser.id)
            ?.nickname || chatRoom.name;

        router.replace({
          pathname: "/(details)/chat/[roomId]",
          params: {
            roomId: chatRoom.id,
            roomName: displayName,
          },
        });
      },
      onError: (error) => {
        console.error("채팅방 생성 실패:", error);
        showToast({
          type: "error",
          title: "채팅방 생성 실패",
          message: error.message || "채팅방을 생성하는 중 오류가 발생했습니다.",
          duration: 3000,
        });
      },
    });

  // 사용자 정보 로드
  useEffect(() => {
    const loadUser = async () => {
      const { user } = await getSession();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  // 검색 실행
  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    searchUsers({
      variables: {
        searchQuery: searchQuery.trim(),
        page: 1,
        limit: 50,
      },
    });
  };

  // 검색어 변경 시 자동 검색 (디바운싱)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // 사용자 선택하여 채팅 시작
  const handleStartChat = async (targetUser: SearchUser) => {
    if (!currentUser) {
      showToast({
        type: "error",
        title: "로그인 필요",
        message: "로그인이 필요합니다.",
        duration: 2000,
      });
      return;
    }

    await createOrGetPrivateChat({
      variables: {
        targetUserId: targetUser.id,
      },
    });
  };

  // 뒤로가기
  const handleClose = () => {
    router.back();
  };

  // 사용자 아이템 렌더링
  const renderUserItem = ({ item }: { item: SearchUser }) => (
    <TouchableOpacity
      style={themed($userItem)}
      onPress={() => handleStartChat(item)}
      disabled={createLoading}
    >
      <View style={themed($userInfo)}>
        {/* 프로필 이미지 */}
        <View style={themed($avatarContainer)}>
          {item.profileImageUrl ? (
            <Image
              source={{ uri: item.profileImageUrl }}
              style={themed($avatar)}
            />
          ) : (
            <View style={themed($avatarPlaceholder)}>
              <Ionicons name="person" size={24} color={theme.colors.textDim} />
            </View>
          )}
        </View>

        {/* 사용자 정보 */}
        <View style={themed($userDetails)}>
          <Text style={themed($userName)}>{item.nickname}</Text>
          <View style={themed($userMeta)}>
            <Text style={themed($userRole)}>
              {item.role === "ADMIN"
                ? "관리자"
                : item.role === "INFLUENCER"
                  ? "인플루언서"
                  : "사용자"}
            </Text>
            {!item.isActive && (
              <Text style={themed($inactiveLabel)}>비활성</Text>
            )}
          </View>
        </View>
      </View>

      {/* 채팅 시작 버튼 */}
      <TouchableOpacity
        style={themed($chatButton)}
        onPress={() => handleStartChat(item)}
        disabled={createLoading}
      >
        {createLoading ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Ionicons name="chatbubble" size={20} color="white" />
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={themed($container)}>
      {/* 헤더 */}
      <View style={themed($header)}>
        <TouchableOpacity onPress={handleClose} style={themed($closeButton)}>
          <Ionicons name="close" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={themed($headerTitle)}>새 채팅 시작</Text>
        <View style={themed($headerSpacer)} />
      </View>

      {/* 검색 입력 */}
      <View style={themed($searchContainer)}>
        <View style={themed($searchInputContainer)}>
          <Ionicons
            name="search"
            size={20}
            color={theme.colors.textDim}
            style={themed($searchIcon)}
          />
          <TextInput
            style={themed($searchInput)}
            placeholder="사용자 닉네임을 검색하세요"
            placeholderTextColor={theme.colors.textDim}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={themed($clearButton)}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={theme.colors.textDim}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 검색 결과 */}
      <View style={themed($resultsContainer)}>
        {searchLoading ? (
          <View style={themed($loadingContainer)}>
            <ActivityIndicator size="large" color={theme.colors.tint} />
            <Text style={themed($loadingText)}>사용자를 검색하는 중...</Text>
          </View>
        ) : searchQuery.trim() === "" ? (
          <View style={themed($emptyContainer)}>
            <Ionicons name="search" size={64} color={theme.colors.textDim} />
            <Text style={themed($emptyTitle)}>사용자 검색</Text>
            <Text style={themed($emptyDescription)}>
              채팅을 시작할 사용자의 닉네임을 검색해보세요
            </Text>
          </View>
        ) : searchResults.length === 0 ? (
          <View style={themed($emptyContainer)}>
            <Ionicons
              name="person-outline"
              size={64}
              color={theme.colors.textDim}
            />
            <Text style={themed($emptyTitle)}>검색 결과 없음</Text>
            <Text style={themed($emptyDescription)}>
              "{searchQuery}"와 일치하는 사용자를 찾을 수 없습니다
            </Text>
          </View>
        ) : (
          <FlatList
            data={searchResults}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.id}
            style={themed($userList)}
            contentContainerStyle={themed($userListContent)}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
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
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.lg,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $closeButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.xs,
});

const $headerTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
  fontWeight: "600",
  color: colors.text,
});

const $headerSpacer: ThemedStyle<ViewStyle> = () => ({
  width: 32,
});

const $searchContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
});

const $searchInputContainer: ThemedStyle<ViewStyle> = ({
  colors,
  spacing,
}) => ({
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: colors.card,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.border,
  paddingHorizontal: spacing.md,
});

const $searchIcon: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginRight: spacing.sm,
});

const $searchInput: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  flex: 1,
  fontSize: 16,
  color: colors.text,
  paddingVertical: spacing.md,
});

const $clearButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.xs,
});

const $resultsContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
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

const $userList: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $userListContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.md,
});

const $userItem: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  backgroundColor: colors.card,
  borderRadius: 12,
  padding: spacing.md,
  marginBottom: spacing.sm,
  borderWidth: 1,
  borderColor: colors.border,
});

const $userInfo: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  flex: 1,
  gap: spacing.md,
});

const $avatarContainer: ThemedStyle<ViewStyle> = () => ({
  width: 48,
  height: 48,
});

const $avatar: ThemedStyle<ImageStyle> = () => ({
  width: 48,
  height: 48,
  borderRadius: 24,
});

const $avatarPlaceholder: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 48,
  height: 48,
  borderRadius: 24,
  backgroundColor: colors.border,
  justifyContent: "center",
  alignItems: "center",
});

const $userDetails: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  gap: spacing.xs,
});

const $userName: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  fontWeight: "600",
  color: colors.text,
});

const $userMeta: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
});

const $userRole: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
});

const $inactiveLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.error,
  fontWeight: "500",
});

const $chatButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.tint,
  width: 40,
  height: 40,
  borderRadius: 20,
  justifyContent: "center",
  alignItems: "center",
});
