import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useSubscription } from "@apollo/client";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { User, getSession } from "@/lib/auth";
import ChatList from "@/components/chat/ChatList";
import { showToast } from "@/components/CustomToast";
import {
  GET_CHAT_MESSAGES,
  SEND_CHAT_MESSAGE,
  ON_NEW_CHAT_MESSAGE,
  MARK_CHANNEL_AS_READ,
} from "@/lib/graphql/chat";

// 메시지 타입 (ChatList와 호환)
interface Message {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user: {
    id: string;
    nickname: string;
    profileImageUrl?: string;
  };
  replyTo?: {
    id: string;
    content: string;
    user: {
      nickname: string;
    };
  };
  isSystem?: boolean;
}

// GraphQL 응답 타입
interface ChatMessagesResponse {
  chatMessages: {
    id: string;
    channelId: string;
    userId: string;
    user: {
      id: string;
      nickname: string;
      profileImageUrl?: string;
    };
    content: string;
    createdAt: string;
    replyTo?: {
      id: string;
      content: string;
      user: {
        nickname: string;
      };
    };
    isSystem: boolean;
  }[];
}

/**
 * 채팅방 화면
 *
 * 특정 채팅방의 메시지를 표시하고 새 메시지를 전송할 수 있습니다.
 */
export default function ChatRoomScreen() {
  const { themed, theme } = useAppTheme();
  const router = useRouter();
  const { roomId, roomName } = useLocalSearchParams<{
    roomId: string;
    roomName: string;
  }>();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const inputRef = useRef<TextInput>(null);

  // 사용자 정보 로드
  useEffect(() => {
    const loadUser = async () => {
      const { user } = await getSession();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  // 메시지 목록 조회
  const {
    data: messagesData,
    loading: messagesLoading,
    error: messagesError,
    refetch: refetchMessages,
  } = useQuery<ChatMessagesResponse>(GET_CHAT_MESSAGES, {
    variables: {
      filter: {
        channelId: roomId,
        limit: 50,
      },
    },
    skip: !roomId,
    fetchPolicy: "cache-and-network",
    onCompleted: (data) => {
      // GraphQL 응답을 ChatList 컴포넌트가 기대하는 형태로 변환
      const transformedMessages: Message[] = data.chatMessages.map((msg) => ({
        id: msg.id,
        content: msg.content,
        created_at: msg.createdAt,
        user_id: msg.userId,
        user: msg.user,
        replyTo: msg.replyTo,
        isSystem: msg.isSystem,
      }));
      setMessages(transformedMessages);
    },
  });

  // 메시지 전송 뮤테이션
  const [sendMessage, { loading: sendLoading }] = useMutation(
    SEND_CHAT_MESSAGE,
    {
      onCompleted: (data) => {
        // 새 메시지를 로컬 상태에 추가
        const newMessage = data.sendChatMessage.message;
        const transformedMessage: Message = {
          id: newMessage.id,
          content: newMessage.content,
          created_at: newMessage.createdAt,
          user_id: newMessage.userId,
          user: newMessage.user,
          replyTo: newMessage.replyTo,
          isSystem: newMessage.isSystem,
        };
        setMessages((prev) => [...prev, transformedMessage]);
        setMessageText("");
      },
      onError: (error) => {
        console.error("메시지 전송 실패:", error);
        showToast({
          type: "error",
          title: "전송 실패",
          message: error.message || "메시지 전송 중 오류가 발생했습니다.",
          duration: 3000,
        });
      },
    }
  );

  // 읽음 처리 뮤테이션
  const [markAsRead] = useMutation(MARK_CHANNEL_AS_READ);

  // 실시간 메시지 구독
  useSubscription(ON_NEW_CHAT_MESSAGE, {
    variables: { channelId: roomId },
    skip: !roomId,
    onData: ({ data }) => {
      if (data.data?.onNewChatMessage) {
        const newMessage = data.data.onNewChatMessage;
        // 자신이 보낸 메시지가 아닌 경우에만 추가 (중복 방지)
        if (newMessage.userId !== currentUser?.id) {
          const transformedMessage: Message = {
            id: newMessage.id,
            content: newMessage.content,
            created_at: newMessage.createdAt,
            user_id: newMessage.userId,
            user: newMessage.user,
            replyTo: newMessage.replyTo,
            isSystem: newMessage.isSystem,
          };
          setMessages((prev) => [...prev, transformedMessage]);
        }
      }
    },
  });

  // 화면 진입 시 읽음 처리
  useEffect(() => {
    if (roomId && currentUser) {
      markAsRead({ variables: { channelId: roomId } });
    }
  }, [roomId, currentUser, markAsRead]);

  // 에러 처리
  useEffect(() => {
    if (messagesError) {
      console.error("메시지 로드 실패:", messagesError);
      showToast({
        type: "error",
        title: "데이터 로드 실패",
        message:
          messagesError.message || "메시지를 불러오는 중 오류가 발생했습니다.",
        duration: 3000,
      });
    }
  }, [messagesError]);

  // 메시지 전송 핸들러
  const handleSendMessage = async () => {
    if (!messageText.trim() || sendLoading || !roomId) return;

    try {
      await sendMessage({
        variables: {
          input: {
            channelId: roomId,
            content: messageText.trim(),
          },
        },
      });
    } catch (error) {
      // 에러는 onError에서 처리됨
    }
  };

  // 뒤로가기 핸들러
  const handleBack = () => {
    router.back();
  };

  // 메시지 새로고침 핸들러
  const handleRefresh = async () => {
    await refetchMessages();
  };

  // 메시지 길게 누르기 핸들러
  const handleLongPressMessage = (message: Message) => {
    // TODO: 메시지 옵션 (답장, 복사, 신고 등) 구현
    console.log("Long press message:", message.id);
  };

  return (
    <KeyboardAvoidingView
      style={themed($container)}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* 채팅 메시지 목록 */}
      <ChatList
        messages={messages}
        currentUser={currentUser}
        isLoading={messagesLoading}
        onRefresh={handleRefresh}
        onLongPressMessage={handleLongPressMessage}
        onBack={handleBack}
        title={roomName || "채팅방"}
      />

      {/* 메시지 입력 영역 */}
      <View style={themed($inputContainer)}>
        <View style={themed($inputWrapper)}>
          <TextInput
            ref={inputRef}
            style={themed($textInput)}
            value={messageText}
            onChangeText={setMessageText}
            placeholder="메시지를 입력하세요..."
            placeholderTextColor={theme.colors.textDim}
            multiline
            maxLength={1000}
            returnKeyType="send"
            onSubmitEditing={handleSendMessage}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[
              themed($sendButton),
              {
                opacity: messageText.trim() && !sendLoading ? 1 : 0.5,
              },
            ]}
            onPress={handleSendMessage}
            disabled={!messageText.trim() || sendLoading}
          >
            <Ionicons
              name={sendLoading ? "hourglass" : "send"}
              color="white"
              size={20}
            />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// --- 스타일 정의 ---
const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
});

const $inputContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  backgroundColor: colors.background,
  borderTopWidth: 1,
  borderTopColor: colors.border,
});

const $inputWrapper: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "flex-end",
  gap: spacing.sm,
});

const $textInput: ThemedStyle<any> = ({ colors, spacing }) => ({
  flex: 1,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 20,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  fontSize: 16,
  color: colors.text,
  backgroundColor: colors.card,
  maxHeight: 100,
  minHeight: 40,
});

const $sendButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: colors.tint,
  justifyContent: "center",
  alignItems: "center",
});
