import React, { useRef, useEffect, useState } from "react";
import {
  View,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Text,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import ChatMessage, { Message as ChatMessageType } from "./ChatMessage";
import { User } from "@/lib/auth";
import dayjs from "dayjs";
import {
  useModerationActions,
  ModerationTarget,
} from "@/hooks/useModerationActions";
import ReportModal from "../ReportModal";
import { useQuery } from "@apollo/client";
import { GET_BLOCKED_USERS } from "@/lib/graphql";
import UserContextMenu from "../shared/UserContextMenu";
import { createChatUserMeta } from "@/lib/utils/userMeta";
type MessageWithIsMe = Message & { isMe: boolean };

// ChatList에서 사용하는 Message 타입 (GraphQL 응답과 호환)
export interface Message {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user: {
    id: string;
    nickname: string;
    profileImageUrl?: string;
    age?: number;
    myTeamLogos?: string[];
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

/**
 * 채팅 목록 Props 타입 정의
 */
interface ChatListProps {
  messages: Message[];
  currentUser: User | null;
  isLoading?: boolean;
  onRefresh?: () => void;
  onLoadMore?: () => void;
  onLongPressMessage?: (message: Message) => void;
  hasMoreMessages?: boolean;
  onBack?: () => void; // 뒤로가기 버튼 클릭 시 호출될 함수
  title?: string; // 채팅방 제목
  isKeyboardVisible?: boolean; // 키보드 표시 상태
  keyboardHeight?: number; // 키보드 높이
}

/**
 * 날짜 구분선을 위한 데이터 타입
 */
type DateSeparator = {
  id: string;
  date: string;
  isDateSeparator: true;
};

/**
 * 목록에 표시될 아이템 타입
 * (메시지 또는 날짜 구분선)
 */
type ListItem = MessageWithIsMe | DateSeparator;

/**
 * 날짜 포맷팅 함수
 */
const formatDate = (date: string): string => {
  const now = dayjs();
  const messageDate = dayjs(date);

  if (now.isSame(messageDate, "day")) {
    return "오늘";
  } else if (now.subtract(1, "day").isSame(messageDate, "day")) {
    return "어제";
  } else {
    return messageDate.format("YYYY년 MM월 DD일");
  }
};

/**
 * 메시지 리스트에 날짜 구분선 추가하는 함수
 */
const addDateSeparators = (messages: MessageWithIsMe[]): ListItem[] => {
  if (messages.length === 0) return [];

  const result: ListItem[] = [];
  let currentDate = "";

  messages.forEach((message) => {
    // 날짜 변경 확인 (년/월/일)
    const messageDate = dayjs(message.created_at).format("YYYY-MM-DD");

    if (messageDate !== currentDate) {
      currentDate = messageDate;
      // 날짜 구분선 추가
      result.push({
        id: `date-${messageDate}`,
        date: formatDate(message.created_at),
        isDateSeparator: true,
      });
    }

    // 메시지 추가
    result.push(message);
  });

  return result;
};

/**
 * 메시지 목록 채팅 컴포넌트
 */
export default function ChatList({
  messages,
  currentUser,
  isLoading = false,
  onRefresh,
  onLoadMore,
  onLongPressMessage,
  hasMoreMessages = false,
  onBack,
  title = "채팅",
  isKeyboardVisible = false,
  keyboardHeight = 0,
}: ChatListProps) {
  const { themed, theme } = useAppTheme();
  const flatListRef = useRef<FlatList>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  // 차단 사용자 목록 조회
  const { data: blockedUsersData } = useQuery<{
    getBlockedUsers: string[];
  }>(GET_BLOCKED_USERS, { fetchPolicy: "cache-and-network" });

  useEffect(() => {
    if (blockedUsersData?.getBlockedUsers) {
      setBlockedUserIds(blockedUsersData.getBlockedUsers);
    }
  }, [blockedUsersData]);

  const handleBlockUser = (blockedUserId: string) => {
    setBlockedUserIds((prev) => [...prev, blockedUserId]);
    setContextMenuVisible(false);
  };

  // 신고/차단 기능
  const {
    showReportModal,
    reportTarget,
    closeReportModal,
    showModerationOptions,
  } = useModerationActions(handleBlockUser);

  // 차단된 사용자 메시지 필터링 및 isMe 추가
  const messagesWithIsMe: MessageWithIsMe[] = messages
    .filter((message) => !blockedUserIds.includes(message.user_id))
    .map((message) => ({
      ...message,
      isMe: currentUser?.id === message.user_id,
    }));

  /**
   * 메시지를 ChatMessage 컴포넌트 형식으로 변환
   */
  const convertToChatMessage = (
    message: MessageWithIsMe,
  ): ChatMessageType & { isMe: boolean } => {
    return {
      id: message.id,
      content: message.content,
      created_at: message.created_at,
      user_id: message.user_id,
      user: {
        id: message.user.id,
        nickname: message.user.nickname,
        avatar_url: message.user.profileImageUrl,
      },
      is_system: message.isSystem,
      isMe: message.isMe,
    };
  };

  /**
   * 메시지 신고/차단 핸들러
   */
  const handleModerationAction = (message: ChatMessageType) => {
    const target: ModerationTarget = {
      userId: message.user.id,
      userName: message.user.nickname,
      messageId: message.id,
      messageContent: message.content,
    };
    showModerationOptions(target);
  };

  const handleMorePress = (message: Message) => {
    setSelectedMessage(message);
    setContextMenuVisible(true);
  };

  // 날짜 구분선이 있는 최종 데이터
  const listData = addDateSeparators(messagesWithIsMe);

  // 메시지가 추가될 때 자동 스크롤 (키보드 상태 고려)
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      // 키보드가 보이는 경우 약간의 지연 후 스크롤
      const delay = isKeyboardVisible ? 300 : 100;
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, delay);
    }
  }, [messages.length, isKeyboardVisible]);

  // 키보드가 올라올 때 자동 스크롤
  useEffect(() => {
    if (isKeyboardVisible && flatListRef.current && messages.length > 0) {
      // 키보드 애니메이션과 동기화하여 스크롤
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [isKeyboardVisible, keyboardHeight]);

  /**
   * 키보드 상태에 따른 스크롤 위치 조정
   */
  const adjustScrollForKeyboard = () => {
    if (flatListRef.current && messages.length > 0) {
      // 키보드가 올라올 때 최신 메시지가 보이도록 스크롤
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  };

  // 키보드 상태 변화 시 스크롤 조정
  useEffect(() => {
    if (isKeyboardVisible) {
      adjustScrollForKeyboard();
    }
  }, [isKeyboardVisible]);

  /**
   * 새로고침 핸들러
   */
  const handleRefresh = async () => {
    if (onRefresh) {
      setRefreshing(true);
      await onRefresh();
      setRefreshing(false);

      // 새로고침 후 키보드가 보이는 경우 스크롤 조정
      if (isKeyboardVisible) {
        adjustScrollForKeyboard();
      }
    }
  };

  /**
   * 스크롤 이벤트 핸들러 (페이지네이션)
   */
  const handleOnScroll = (event: any) => {
    // 스크롤 위치가 상단에 가까워지면 추가 메시지 로드
    const { contentOffset } = event.nativeEvent;
    if (contentOffset.y < 100 && hasMoreMessages && !isLoading && onLoadMore) {
      onLoadMore();
    }
  };

  /**
   * 아이템 렌더링 함수
   */
  const renderItem = ({ item, index }: { item: ListItem; index: number }) => {
    // 날짜 구분선인 경우
    if ("isDateSeparator" in item) {
      return (
        <View style={themed($dateSeparator)}>
          <Text style={themed($dateSeparatorText)}>{item.date}</Text>
        </View>
      );
    }

    // 메시지인 경우
    const message = item as MessageWithIsMe;
    const convertedMessage = convertToChatMessage(message);

    // 사용자 메타 데이터 생성 (공통 유틸리티 사용)
    const userMeta = createChatUserMeta(message.user, currentUser as any);

    // 연속된 메시지인지 확인 (아바타 표시 여부 결정)
    const showAvatar = (() => {
      if (message.isMe) return false; // 내 메시지는 항상 아바타 숨김

      // 다음 메시지가 있고, 같은 사용자인지 확인
      const nextItem = listData[index + 1];
      if (nextItem && !("isDateSeparator" in nextItem)) {
        const nextMessage = nextItem as MessageWithIsMe;
        return nextMessage.user_id !== message.user_id;
      }
      return true; // 기본적으로 표시
    })();

    // 시간 표시 여부
    const showDate = true; // 항상 표시하거나, 연속된 짧은 시간 메시지라면 마지막에만 표시하는 로직 추가 가능

    return (
      <ChatMessage
        message={convertedMessage}
        showAvatar={showAvatar}
        showDate={showDate}
        onLongPress={
          onLongPressMessage ? () => onLongPressMessage(message) : undefined
        }
        onModerationAction={handleModerationAction}
        userMeta={userMeta}
        onMorePress={handleMorePress}
        isKeyboardVisible={isKeyboardVisible}
        keyboardHeight={keyboardHeight}
      />
    );
  };

  return (
    <View style={themed($container)}>
      {/* 헤더 */}
      {onBack && (
        <View style={themed($header)}>
          <TouchableOpacity style={themed($backButton)} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={themed($headerTitle)}>{title}</Text>
          <View style={{ width: 24 }} />
        </View>
      )}

      {/* 채팅 목록 */}
      {isLoading && listData.length === 0 ? (
        <View style={themed($loadingContainer)}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={themed($loadingText)}>채팅을 불러오는 중...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={listData}
          renderItem={renderItem}
          keyExtractor={(item) =>
            "isDateSeparator" in item ? item.id : item.id
          }
          style={themed($flatList)}
          contentContainerStyle={themed($contentContainer)}
          onScroll={handleOnScroll}
          scrollEventThrottle={400}
          inverted={false} // 정방향 표시 (최신 메시지가 아래)
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
              />
            ) : undefined
          }
          ListHeaderComponent={
            hasMoreMessages && isLoading ? (
              <View style={themed($loadMoreContainer)}>
                <ActivityIndicator size="small" color="#0000ff" />
                <Text style={themed($loadMoreText)}>
                  이전 메시지 불러오는 중...
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            !isLoading ? (
              <View style={themed($emptyContainer)}>
                <Text style={themed($emptyText)}>메시지가 없습니다</Text>
              </View>
            ) : null
          }
        />
      )}

      {/* 신고 모달 */}
      <ReportModal
        visible={showReportModal}
        onClose={closeReportModal}
        messageId={reportTarget?.messageId}
        messageContent={reportTarget?.messageContent}
        reportedUserId={reportTarget?.userId}
        reportedUserName={reportTarget?.userName}
      />

      {/* 사용자 컨텍스트 메뉴 */}
      {selectedMessage && (
        <UserContextMenu
          visible={contextMenuVisible}
          onClose={() => setContextMenuVisible(false)}
          targetUser={{
            id: selectedMessage.user.id,
            nickname: selectedMessage.user.nickname,
          }}
          currentUserId={currentUser?.id}
          onBlockUser={handleBlockUser}
        />
      )}
    </View>
  );
}

// --- 스타일 정의 ---
const $container: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $header: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: spacing?.md || 16,
  paddingVertical: spacing?.md || 16,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
  backgroundColor: colors.background,
});

const $backButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing?.xs || 8,
});

const $headerTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
  fontWeight: "600",
  color: colors.text,
  flex: 1,
  textAlign: "center",
});

const $flatList: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $contentContainer: ThemedStyle<ViewStyle> = () => ({
  flexGrow: 1,
  paddingVertical: 8,
});

const $loadingContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
});

const $loadingText: ThemedStyle<TextStyle> = ({ colors }) => ({
  marginTop: 8,
  color: colors.textDim,
});

const $loadMoreContainer: ThemedStyle<ViewStyle> = () => ({
  padding: 16,
  alignItems: "center",
});

const $loadMoreText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
  marginTop: 4,
});

const $emptyContainer: ThemedStyle<ViewStyle> = () => ({
  padding: 20,
  alignItems: "center",
});

const $emptyText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
});

const $dateSeparator: ThemedStyle<ViewStyle> = () => ({
  alignItems: "center",
  marginVertical: 16,
  paddingHorizontal: 16,
});

const $dateSeparatorText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
  backgroundColor: colors.border + "50",
  paddingHorizontal: 12,
  paddingVertical: 4,
  borderRadius: 12,
});
