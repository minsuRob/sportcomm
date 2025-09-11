import React, { useEffect } from "react";
import { View, ViewStyle } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@apollo/client";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { useAuth } from "@/lib/auth/context/AuthContext";
import { GET_USER_PRIVATE_CHATS } from "@/lib/graphql/user-chat";
import { showToast } from "@/components/CustomToast";
import ChatRoomList from "@/components/chat/ChatRoomList";
import ChatRoomHeader from "@/components/chat/ChatRoomHeader";
import { ChatRoom } from "@/lib/chat/chatUtils";

/**
 * 1대1 개인 채팅 목록 화면
 *
 * 사용자의 개인 채팅방 목록을 표시하고 새로운 1대1 채팅을 시작할 수 있습니다.
 */
export default function PrivateChatScreen() {
  const { themed } = useAppTheme();
  const router = useRouter();
  const { user: currentUser } = useAuth(); // 전역 AuthContext에서 사용자 정보 획득

  // (제거됨) 개별 getSession 호출 로직: AuthProvider 가 전역에서 세션/사용자 부트스트랩 처리

  // 1대1 개인 채팅방 목록 조회
  const { data, loading, error, refetch } = useQuery(GET_USER_PRIVATE_CHATS, {
    variables: { page: 1, limit: 100 },
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });

  // 에러 처리
  useEffect(() => {
    if (error) {
      console.error("개인 채팅방 목록 로드 실패:", error);
      showToast({
        type: "error",
        title: "데이터 로드 실패",
        message:
          error.message ||
          "개인 채팅방 목록을 불러오는 중 오류가 발생했습니다.",
        duration: 3000,
      });
    }
  }, [error]);

  // 채팅방 데이터 변환
  const chatRooms: ChatRoom[] = (
    data?.getUserPrivateChats?.chatRooms || []
  ).map((room) => ({
    id: room.id,
    name: room.name,
    description: room.description,
    isPrivate: room.type === "PRIVATE",
    type: room.type,
    isRoomActive: room.isRoomActive,
    maxParticipants: room.maxParticipants,
    currentParticipants: room.currentParticipants,
    lastMessage: room.lastMessageContent,
    lastMessageAt: room.lastMessageAt,
    unreadCount: 0, // TODO: 실제 읽지 않은 메시지 수 구현
    members: room.participants.map((p) => ({
      userId: p.id,
      user: {
        id: p.id,
        nickname: p.nickname,
        profileImageUrl: p.profileImageUrl,
      },
      isAdmin: false,
      joinedAt: room.createdAt,
      lastReadAt: room.createdAt,
    })),
    createdAt: room.createdAt,
    team: room.team,
  }));

  // 새로고침 핸들러
  const handleRefresh = async () => {
    await refetch();
  };

  // 새 채팅 시작 핸들러
  const handleStartNewChat = () => {
    router.push("/(modals)/start-private-chat");
  };

  // 뒤로가기 핸들러
  const handleBack = () => {
    router.back();
  };

  return (
    <View style={themed($container)}>
      <ChatRoomHeader
        title="개인 채팅"
        showBackButton
        onBack={handleBack}
        actions={[
          {
            icon: "person-add-outline",
            onPress: handleStartNewChat,
            label: "새 채팅",
          },
        ]}
      />

      <ChatRoomList
        currentUser={currentUser}
        rooms={chatRooms}
        isLoading={loading}
        onRefresh={handleRefresh}
        onAddRoom={handleStartNewChat}
        cardSize="medium"
        emptyMessage="개인 채팅방이 없습니다"
        emptyDescription="다른 사용자와 1대1 채팅을 시작해보세요"
      />
    </View>
  );
}

// === 스타일 정의 ===

const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
});
