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
  Keyboard,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery } from "@apollo/client";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { useAuth } from "@/lib/auth/context/AuthContext";
import ChatList from "@/components/chat/ChatList";
import ChatInput from "@/components/chat/ChatInput";
import { showToast } from "@/components/CustomToast";
import { chatService } from "@/lib/chat/chatService";
import { GET_PRIVATE_CHAT_PARTNER } from "@/lib/graphql/user-chat";
import { getChatRoomDisplayName, isPrivateChat } from "@/lib/chat/chatUtils";

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
 * 키보드가 올라갈 때 채팅창과 채팅본문이 모두 자연스럽게 올라가도록 최적화되었습니다.
 */
export default function ChatRoomScreen() {
  const { themed, theme } = useAppTheme();
  const router = useRouter();
  const { roomId, roomName } = useLocalSearchParams<{
    roomId: string;
    roomName: string;
  }>();

  const { user: currentUser } = useAuth(); // 전역 AuthContext 사용 (세션 재조회 제거)
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const inputRef = useRef<TextInput>(null);

  // 키보드 상태 관리
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // 채팅방 정보 상태
  const [channelInfo, setChannelInfo] = useState<any>(null);
  const [chatRoomTitle, setChatRoomTitle] = useState<string>(
    roomName || "채팅방",
  );

  // 1대1 채팅방인 경우 상대방 정보 조회
  const { data: partnerData } = useQuery(GET_PRIVATE_CHAT_PARTNER, {
    variables: { roomId },
    skip: !roomId,
    fetchPolicy: "cache-and-network",
  });

  // 키보드 이벤트 리스너 설정
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setIsKeyboardVisible(true);
        //console.log("키보드 표시:", e.endCoordinates.height);
      },
    );

    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
        //console.log("키보드 숨김");
      },
    );

    // Android에서 키보드 높이 변화 감지
    const keyboardDidChangeFrameListener =
      Platform.OS === "android"
        ? Keyboard.addListener("keyboardDidChangeFrame", (e) => {
            if (e.endCoordinates.height > 0) {
              setKeyboardHeight(e.endCoordinates.height);
            }
          })
        : null;

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
      keyboardDidChangeFrameListener?.remove();
    };
  }, []);

  // 사용자/방 준비 후 메시지 & 채널 정보 로드 (getSession 제거 - AuthProvider 이용)
  useEffect(() => {
    if (!roomId || !currentUser) return;
    (async () => {
      try {
        await loadMessages();
        await loadChannelInfo();
      } catch (error) {
        console.error("초기 채팅 데이터 로드 실패:", error);
      }
    })();
  }, [roomId, currentUser]);

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
      //console.log(
      //   `채팅방 ${roomId}의 메시지 ${loadedMessages.length}개 로드 완료`,
      // );
    } catch (error) {
      console.error("메시지 로드 실패:", error);
      setMessagesError(error);
      // 에러 발생 시 빈 배열 설정
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  /**
   * 채팅방 정보 로드
   */
  const loadChannelInfo = async () => {
    if (!roomId) return;

    try {
      // 공개 채팅방 목록에서 현재 채팅방 정보 찾기
      const result = await chatService.getPublicChatRooms(1, 100);
      const currentChannel = result.chatRooms.find(
        (room) => room.id === roomId,
      );

      if (currentChannel) {
        setChannelInfo(currentChannel);

        // 채팅방 제목 설정 (1대1 채팅인 경우 상대방 이름 사용)
        const displayName = getChatRoomDisplayName(
          {
            ...currentChannel,
            type:
              (currentChannel.type as "PRIVATE" | "GROUP" | "PUBLIC") ||
              "PUBLIC",
            isPrivate: currentChannel.type === "PRIVATE",
            unreadCount: 0,
            members: [],
          },
          currentUser?.nickname,
        );
        setChatRoomTitle(displayName);

        //console.log(`채팅방 정보 로드 완료: ${displayName}`);
      }
    } catch (error) {
      console.error("채팅방 정보 로드 실패:", error);
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

    //console.log(`실시간 구독 시작: 채팅방 ${roomId}`);

    // 실시간 메시지 구독
    const unsubscribe = chatService.subscribeToMessages(
      roomId,
      (newMessage: Message) => {
        //console.log("새 메시지 수신:", newMessage);

        // 자신이 보낸 메시지가 아닌 경우에만 추가
        // (자신이 보낸 메시지는 sendMessage에서 이미 추가됨)
        if (newMessage.user_id !== currentUser.id) {
          setMessages((prev) => [...prev, newMessage]);
        }
      },
    );

    // 컴포넌트 언마운트 시 구독 해제
    return () => {
      //console.log(`실시간 구독 해제: 채팅방 ${roomId}`);
      unsubscribe();
    };
  }, [roomId, currentUser]);

  // 채팅방 읽음 처리
  useEffect(() => {
    if (!roomId || !currentUser) return;

    const markAsRead = async () => {
      try {
        await chatService.markChannelAsRead(roomId);
        //console.log(`채팅방 ${roomId} 읽음 처리 완료`);
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
    //console.log("채팅 메시지 새로고침 시작");
    await refetchMessages();
  };

  // 메시지 길게 누르기 핸들러
  const handleLongPressMessage = (message: Message) => {
    //console.log("메시지 길게 누르기:", message.id);
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
      enabled={true}
      // Android에서 더 부드러운 키보드 처리
      {...(Platform.OS === "android" && {
        android_softInputMode: "adjustResize",
      })}
    >
      {/* 채팅 메시지 목록 */}
      <ChatList
        messages={messages}
        currentUser={currentUser}
        isLoading={messagesLoading}
        onRefresh={handleRefresh}
        onLongPressMessage={handleLongPressMessage}
        onBack={handleBack}
        title={chatRoomTitle}
        hasMoreMessages={false}
        onLoadMore={() => {
          // TODO: 이전 메시지 로드 구현
          //console.log("이전 메시지 로드 요청");
        }}
        isKeyboardVisible={isKeyboardVisible}
        keyboardHeight={keyboardHeight}
      />

      {/* 메시지 입력 영역 */}
      <ChatInput
        onSendMessage={handleSendMessage}
        disabled={sendLoading || !currentUser}
        placeholder={
          !currentUser
            ? "로그인이 필요합니다..."
            : !roomId
              ? "채팅방 정보를 불러오는 중..."
              : "메시지를 입력하세요..."
        }
        onEmoji={() => {
          //console.log("이모지 버튼 클릭");
          showToast({
            type: "info",
            title: "이모지",
            message: "이모지 기능이 곧 추가될 예정입니다.",
            duration: 1500,
          });
        }}
        onAddOption={() => {
          //console.log("추가 옵션 버튼 클릭");
          showToast({
            type: "info",
            title: "추가 옵션",
            message: "파일 첨부 등의 기능이 곧 추가될 예정입니다.",
            duration: 1500,
          });
        }}
        isKeyboardVisible={isKeyboardVisible}
        keyboardHeight={keyboardHeight}
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
