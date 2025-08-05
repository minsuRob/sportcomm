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
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { User, getSession } from "@/lib/auth";
import ChatList from "@/components/chat/ChatList";
import ChatInput from "@/components/chat/ChatInput";
import { showToast } from "@/components/CustomToast";
import { chatService } from "@/lib/chat/chatService";

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
      content: "💌 우리 팀이 우승할 것 같아요! 정말 기대됩니다!",
      created_at: new Date(Date.now() - 1500000).toISOString(),
      user_id: "user4",
      user: {
        id: "user4",
        nickname: "열정팬",
        profileImageUrl: undefined,
      },
    },
    {
      id: "4",
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
      id: "5",
      content: "💌 이번 시즌 최고의 경기였습니다! 감동적이었어요 🏆",
      created_at: new Date(Date.now() - 900000).toISOString(),
      user_id: "user5",
      user: {
        id: "user5",
        nickname: "챔피언",
        profileImageUrl: undefined,
      },
    },
    {
      id: "6",
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

  // 사용자 정보 로드 및 메시지 데이터 조회
  useEffect(() => {
    const loadUserAndMessages = async () => {
      try {
        const { user } = await getSession();
        setCurrentUser(user);

        if (roomId && user) {
          // 실제 메시지 데이터 로드
          await loadMessages();
        } else {
          // 임시 메시지 데이터 설정
          setMessages(mockMessages);
        }
      } catch (error) {
        console.error("사용자 정보 및 메시지 로드 실패:", error);
        setMessages(mockMessages);
      }
    };
    loadUserAndMessages();
  }, [roomId]);

  // 메시지 로딩 상태 관리
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<any>(null);
  const [sendLoading, setSendLoading] = useState(false);

  /**
   * 메시지 목록 로드
   */
  const loadMessages = async () => {
    if (!roomId) return;

    setMessagesLoading(true);
    setMessagesError(null);

    try {
      const loadedMessages = await chatService.getChatMessages(roomId);
      setMessages(loadedMessages);
      console.log(
        `채팅방 ${roomId}의 메시지 ${loadedMessages.length}개 로드 완료`,
      );
    } catch (error) {
      console.error("메시지 로드 실패:", error);
      setMessagesError(error);
      // 에러 발생 시 임시 데이터 사용
      setMessages(mockMessages);
    } finally {
      setMessagesLoading(false);
    }
  };

  /**
   * 메시지 새로고침
   */
  const refetchMessages = async () => {
    await loadMessages();
  };

  /**
   * 실제 메시지 전송
   */
  const sendMessage = async (messageContent: string) => {
    if (!currentUser || !roomId) return;

    setSendLoading(true);

    try {
      const newMessage = await chatService.sendMessage(
        roomId,
        messageContent,
        currentUser,
      );

      if (newMessage) {
        // 새 메시지를 즉시 UI에 반영
        setMessages((prev) => [...prev, newMessage]);

        showToast({
          type: "success",
          title: "메시지 전송",
          message: "메시지가 전송되었습니다.",
          duration: 1000,
        });
      } else {
        throw new Error("메시지 전송 실패");
      }
    } catch (error) {
      console.error("메시지 전송 실패:", error);
      showToast({
        type: "error",
        title: "전송 실패",
        message: "메시지 전송에 실패했습니다.",
        duration: 2000,
      });
    } finally {
      setSendLoading(false);
    }
  };

  // 실시간 메시지 구독 설정
  useEffect(() => {
    if (!roomId || !currentUser) return;

    console.log(`실시간 구독 시작: 채팅방 ${roomId}`);

    // 실시간 메시지 구독
    const unsubscribe = chatService.subscribeToMessages(
      roomId,
      (newMessage: Message) => {
        console.log("새 메시지 수신:", newMessage);

        // 자신이 보낸 메시지가 아닌 경우에만 추가
        // (자신이 보낸 메시지는 sendMessage에서 이미 추가됨)
        if (newMessage.user_id !== currentUser.id) {
          setMessages((prev) => [...prev, newMessage]);
        }
      },
    );

    // 컴포넌트 언마운트 시 구독 해제
    return () => {
      console.log(`실시간 구독 해제: 채팅방 ${roomId}`);
      unsubscribe();
    };
  }, [roomId, currentUser]);

  // 채팅방 읽음 처리
  useEffect(() => {
    if (!roomId || !currentUser) return;

    const markAsRead = async () => {
      try {
        await chatService.markChannelAsRead(roomId);
        console.log(`채팅방 ${roomId} 읽음 처리 완료`);
      } catch (error) {
        console.error("읽음 처리 실패:", error);
      }
    };

    // 메시지가 로드된 후 읽음 처리
    if (messages.length > 0) {
      markAsRead();
    }
  }, [roomId, currentUser, messages.length]);

  // 메시지 전송 핸들러 (ChatInput에서 호출)
  const handleSendMessage = async (messageContent: string) => {
    if (!messageContent.trim() || sendLoading) return;

    await sendMessage(messageContent.trim());
  };

  // 뒤로가기 핸들러
  const handleBack = () => {
    router.back();
  };

  // 메시지 새로고침 핸들러
  const handleRefresh = async () => {
    console.log("채팅 메시지 새로고침 시작");
    await refetchMessages();
  };

  // 메시지 길게 누르기 핸들러
  const handleLongPressMessage = (message: Message) => {
    console.log("메시지 길게 누르기:", message.id);
    // TODO: 메시지 옵션 (답장, 복사, 신고 등) 구현
    showToast({
      type: "info",
      title: "메시지 옵션",
      message: "메시지 옵션 기능이 곧 추가될 예정입니다.",
      duration: 1500,
    });
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
        title={roomName || `채팅방 (${chatService.getDataSourceType()})`}
        hasMoreMessages={false}
        onLoadMore={() => {
          // TODO: 이전 메시지 로드 구현
          console.log("이전 메시지 로드 요청");
        }}
      />

      {/* 메시지 입력 영역 */}
      <ChatInput
        onSendMessage={handleSendMessage}
        disabled={sendLoading || !currentUser}
        placeholder={
          currentUser ? "메시지를 입력하세요..." : "로그인이 필요합니다..."
        }
        onEmoji={() => {
          console.log("이모지 버튼 클릭");
          showToast({
            type: "info",
            title: "이모지",
            message: "이모지 기능이 곧 추가될 예정입니다.",
            duration: 1500,
          });
        }}
        onAddOption={() => {
          console.log("추가 옵션 버튼 클릭");
          showToast({
            type: "info",
            title: "추가 옵션",
            message: "파일 첨부 등의 기능이 곧 추가될 예정입니다.",
            duration: 1500,
          });
        }}
      />
    </KeyboardAvoidingView>
  );
}

// --- 스타일 정의 ---
const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
});

// ChatInput 컴포넌트를 사용하므로 입력 관련 스타일 제거
