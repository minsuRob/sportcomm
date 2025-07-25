import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  ViewStyle,
  TextStyle,
  Keyboard,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { ArrowLeft, MoreVertical, Users } from "lucide-react-native";
import { getSession } from "@/lib/auth";
import { chatService } from "@/lib/chat/chatService";
import ChatList from "@/components/chat/ChatList";
import ChatInput from "@/components/chat/ChatInput";
import { Message } from "@/components/chat/ChatMessage";
import { useQuery } from "@apollo/client";
import { GET_BLOCKED_USERS } from "@/lib/graphql";

/**
 * 채팅 상세 화면
 * 특정 채팅방의 메시지를 보여주고 새 메시지 전송 기능을 제공합니다.
 */
export default function ChatDetailScreen() {
  const { themed, theme } = useAppTheme();
  const router = useRouter();
  const { id, name } = useLocalSearchParams();
  const channelId = id as string;
  const channelName = name as string;

  // 상태 관리
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);

  // 차단된 사용자 목록 조회
  const { data: blockedUsersData } = useQuery<{ getBlockedUsers: string[] }>(
    GET_BLOCKED_USERS,
    {
      skip: !currentUser, // 로그인하지 않은 경우 실행하지 않음
    },
  );

  // 실시간 메시지 수신 구독 참조
  const subscribedRef = useRef(false);

  // 초기 데이터 로드
  useEffect(() => {
    const initChat = async () => {
      try {
        const { user } = await getSession();
        if (!user) {
          Alert.alert("알림", "로그인이 필요합니다.");
          router.back();
          return;
        }

        setCurrentUser(user);
        await loadMessages();

        // 실시간 메시지 구독 (중복 구독 방지)
        if (!subscribedRef.current) {
          subscribeToMessages();
          subscribedRef.current = true;
        }
      } catch (error) {
        console.error("채팅 초기화 오류:", error);
        Alert.alert("오류", "채팅 데이터를 불러오는데 실패했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    initChat();

    // 컴포넌트 언마운트 시 구독 해제
    return () => {
      chatService.unsubscribeFromMessages();
      subscribedRef.current = false;
    };
  }, [channelId, router]);

  // 차단된 사용자 목록 업데이트
  useEffect(() => {
    if (blockedUsersData?.getBlockedUsers) {
      const newBlockedUserIds = blockedUsersData.getBlockedUsers;
      setBlockedUserIds(newBlockedUserIds);

      // 기존 메시지에서 차단된 사용자 메시지 제거
      setMessages((prevMessages) =>
        prevMessages.filter(
          (message) => !newBlockedUserIds.includes(message.user_id),
        ),
      );
    }
  }, [blockedUsersData]);

  /**
   * 메시지 로드 함수
   */
  const loadMessages = async () => {
    try {
      setIsLoading(true);

      // 로컬 모드로 동작
      let messageData = await chatService.getMessages(channelId);

      // 차단된 사용자 메시지 필터링
      const filteredMessages = messageData.filter(
        (message) => !blockedUserIds.includes(message.user_id),
      );

      setMessages(filteredMessages);
      setHasMoreMessages(messageData.length >= 50);
    } catch (error) {
      console.error("메시지 로드 오류:", error);
      Alert.alert("오류", "메시지를 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 이전 메시지 로드 (페이지네이션)
   */
  const loadMoreMessages = async () => {
    if (isLoadingMore || !hasMoreMessages || messages.length === 0) return;

    try {
      setIsLoadingMore(true);
      const oldestMessage = messages[0];

      // 로컬 모드로 동작
      let moreMessages = await chatService.getMessages(
        channelId,
        50,
        oldestMessage.created_at,
      );

      // 차단된 사용자 메시지 필터링
      const filteredMoreMessages = moreMessages.filter(
        (message) => !blockedUserIds.includes(message.user_id),
      );

      if (filteredMoreMessages.length > 0) {
        setMessages((prev) => [...filteredMoreMessages, ...prev]);
      }

      setHasMoreMessages(moreMessages.length >= 50);
    } catch (error) {
      console.error("이전 메시지 로드 오류:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  /**
   * 실시간 메시지 구독
   */
  const subscribeToMessages = () => {
    // 로컬 모드에서는 실시간 구독 설정
    chatService.subscribeToMessages(channelId, handleNewMessage);
  };

  /**
   * 새 메시지 수신 처리
   */
  const handleNewMessage = (message: Message) => {
    // 내가 보낸 메시지가 아닌 경우에만 추가
    // (내가 보낸 메시지는 sendMessage에서 이미 추가)
    if (message.user_id !== currentUser?.id) {
      // 차단된 사용자의 메시지는 추가하지 않음
      if (!blockedUserIds.includes(message.user_id)) {
        setMessages((prevMessages) => [...prevMessages, message]);
      }
    }
  };

  /**
   * 메시지 전송 처리
   */
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !currentUser) return;

    try {
      let newMessage;

      // 로컬 모드에서 메시지 전송
      const replyId = replyingTo?.id;
      newMessage = await chatService.sendMessage(channelId, text, replyId);

      // 로컬 메시지 목록에 추가
      if (newMessage) {
        setMessages((prev) => [...prev, newMessage]);
      }

      // 답장 모드 초기화
      if (replyingTo) {
        setReplyingTo(null);
      }

      Keyboard.dismiss();
    } catch (error) {
      console.error("메시지 전송 오류:", error);
      Alert.alert("오류", "메시지 전송에 실패했습니다.");
    }
  };

  /**
   * 메시지 길게 누르기 처리 (답장 등)
   */
  const handleLongPressMessage = (message: Message) => {
    if (message.is_system) return;

    Alert.alert(
      "메시지 옵션",
      "선택하세요",
      [
        {
          text: "답장",
          onPress: () => {
            setReplyingTo({
              id: message.id,
              content: message.content,
              user: message.user.nickname,
            });
          },
        },
        {
          text: "취소",
          style: "cancel",
        },
      ],
      { cancelable: true },
    );
  };

  /**
   * '+' 버튼 클릭 핸들러
   */
  const handleAddOption = () => {
    Alert.alert(
      "옵션 선택",
      "추가 옵션을 선택하세요",
      [
        { text: "사진 보내기", onPress: () => console.log("사진 보내기") },
        { text: "파일 보내기", onPress: () => console.log("파일 보내기") },
        { text: "위치 공유", onPress: () => console.log("위치 공유") },
        { text: "취소", style: "cancel" },
      ],
      { cancelable: true },
    );
  };

  /**
   * 이모지 버튼 클릭 핸들러
   */
  const handleEmoji = () => {
    setShowEmojiPicker(!showEmojiPicker);
    // 여기에 이모지 선택 UI 표시 로직 구현
    Alert.alert("이모지 선택", "이모지 기능이 곧 추가될 예정입니다.", [
      { text: "확인" },
    ]);
  };

  return (
    <View style={themed($container)}>
      {/* 헤더 - ChatList 컴포넌트에서 표시할 것이므로 여기서는 제거 */}

      {/* 채팅 목록 */}
      <KeyboardAvoidingView
        style={themed($chatContainer)}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        <View style={themed($messagesContainer)}>
          <ChatList
            messages={messages}
            currentUser={currentUser}
            isLoading={isLoading}
            onRefresh={loadMessages}
            onLoadMore={loadMoreMessages}
            onLongPressMessage={handleLongPressMessage}
            hasMoreMessages={hasMoreMessages}
            onBack={router.back}
            title={channelName || "채팅"}
          />
        </View>

        {/* 채팅 입력 */}
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={!currentUser || isLoading}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          onAddOption={handleAddOption}
          onEmoji={handleEmoji}
        />
      </KeyboardAvoidingView>
    </View>
  );
}

// --- 스타일 정의 ---
const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
});

// 헤더 관련 스타일은 ChatList 컴포넌트로 이동됨

const $chatContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $messagesContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});
