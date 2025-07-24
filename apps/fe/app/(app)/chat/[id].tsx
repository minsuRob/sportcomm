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

  /**
   * 메시지 로드 함수
   */
  const loadMessages = async () => {
    try {
      setIsLoading(true);

      // 로컬 모드로 동작
      let messageData = await chatService.getMessages(channelId);

      setMessages(messageData);
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

      if (moreMessages.length > 0) {
        setMessages((prev) => [...moreMessages, ...prev]);
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
      setMessages((prevMessages) => [...prevMessages, message]);
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

  return (
    <View style={themed($container)}>
      {/* 헤더 */}
      <View style={themed($header)}>
        <TouchableOpacity style={themed($backButton)} onPress={router.back}>
          <ArrowLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>

        <View style={themed($headerCenter)}>
          <Text style={themed($headerTitle)} numberOfLines={1}>
            {channelName || "채팅"}
          </Text>
        </View>

        <TouchableOpacity style={themed($headerButton)}>
          <MoreVertical color={theme.colors.text} size={24} />
        </TouchableOpacity>
      </View>

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
          />
        </View>

        {/* 채팅 입력 */}
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={!currentUser || isLoading}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
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

const $header: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: spacing?.md || 16,
  paddingVertical: spacing?.md || 16,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
  backgroundColor: colors.background,
});

const $backButton: ThemedStyle<ViewStyle> = () => ({
  padding: 4,
});

const $headerCenter: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  alignItems: "center",
});

const $headerTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
  fontWeight: "600",
  color: colors.text,
});

const $headerButton: ThemedStyle<ViewStyle> = () => ({
  padding: 4,
});

const $chatContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $messagesContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});
