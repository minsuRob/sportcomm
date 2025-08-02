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

  // 임시 메시지 데이터
  const mockMessages: Message[] = [
    {
      id: "1",
      content: "안녕하세요! 이 채팅방에 오신 것을 환영합니다.",
      created_at: new Date(Date.now() - 3600000).toISOString(),
      user_id: "system",
      user: {
        id: "system",
        nickname: "시스템",
        profileImageUrl: undefined,
      },
      isSystem: true,
    },
    {
      id: "2",
      content: "오늘 경기 어떻게 보셨나요?",
      created_at: new Date(Date.now() - 1800000).toISOString(),
      user_id: "user1",
      user: {
        id: "user1",
        nickname: "축구팬123",
        profileImageUrl: undefined,
      },
    },
    {
      id: "3",
      content: "정말 흥미진진한 경기였어요! 특히 후반전이 대박이었죠.",
      created_at: new Date(Date.now() - 1200000).toISOString(),
      user_id: "user2",
      user: {
        id: "user2",
        nickname: "스포츠매니아",
        profileImageUrl: undefined,
      },
    },
    {
      id: "4",
      content: "맞아요! 마지막 골이 정말 환상적이었습니다 ⚽",
      created_at: new Date(Date.now() - 600000).toISOString(),
      user_id: "user3",
      user: {
        id: "user3",
        nickname: "골키퍼",
        profileImageUrl: undefined,
      },
    },
  ];

  // 사용자 정보 로드
  useEffect(() => {
    const loadUser = async () => {
      const { user } = await getSession();
      setCurrentUser(user);

      // 임시 메시지 데이터 설정
      setMessages(mockMessages);
    };
    loadUser();
  }, []);

  // 임시로 메시지 로딩 상태 관리
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<any>(null);

  // 임시 메시지 새로고침 함수
  const refetchMessages = async () => {
    setMessagesLoading(true);
    // 임시로 1초 후 로딩 완료
    setTimeout(() => {
      setMessagesLoading(false);
    }, 1000);
  };

  // 임시 메시지 전송 상태
  const [sendLoading, setSendLoading] = useState(false);

  // 임시 메시지 전송 함수
  const sendMessage = async (messageContent: string) => {
    if (!currentUser) return;

    setSendLoading(true);

    // 임시로 1초 후 메시지 추가
    setTimeout(() => {
      const newMessage: Message = {
        id: Date.now().toString(),
        content: messageContent,
        created_at: new Date().toISOString(),
        user_id: currentUser.id,
        user: {
          id: currentUser.id,
          nickname: currentUser.nickname,
          profileImageUrl: currentUser.profileImageUrl,
        },
        isSystem: false,
      };

      setMessages((prev) => [...prev, newMessage]);
      setMessageText("");
      setSendLoading(false);

      showToast({
        type: "success",
        title: "메시지 전송",
        message: "메시지가 전송되었습니다.",
        duration: 1000,
      });
    }, 1000);
  };

  // 임시로 읽음 처리 및 실시간 구독 비활성화
  // (백엔드 연동 시 다시 활성화)

  // 임시로 에러 처리 비활성화

  // 메시지 전송 핸들러
  const handleSendMessage = async () => {
    if (!messageText.trim() || sendLoading) return;

    await sendMessage(messageText.trim());
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
