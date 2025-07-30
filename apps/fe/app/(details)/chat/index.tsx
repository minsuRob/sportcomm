import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from "react-native";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { Ionicons } from "@expo/vector-icons";
import { getSession } from "@/lib/auth";
import { chatService, ChatChannel } from "@/lib/chat/chatService";
import dayjs from "dayjs";

/**
 * 채팅 채널 목록 화면
 * 사용자가 참여 중인 채팅방 목록을 표시합니다.
 */
export default function ChatListScreen() {
  const { themed, theme } = useAppTheme();
  const router = useRouter();
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 채팅방 목록 가져오기
  useEffect(() => {
    loadChannels();
  }, []);

  /**
   * 채팅방 목록 로드 함수
   */
  const loadChannels = async () => {
    try {
      setIsLoading(true);

      // 사용자 세션 확인
      const { user } = await getSession();
      if (!user) {
        // 로그인 필요 시 처리
        return;
      }

      // 채팅방 목록 가져오기
      const channelData = await chatService.getChannels();
      setChannels(channelData);
    } catch (error) {
      console.error("채팅방 목록 로드 오류:", error);

      // 테스트 데이터를 사용하는 대신 chatService에서 채널 목록 다시 가져오기
      const mockChannels = await chatService.getChannels();
      setChannels(mockChannels);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 채팅방으로 이동하는 함수
   */
  const navigateToChat = (channelId: string, channelName: string) => {
    router.push({
      pathname: "/chat/[id]",
      params: { id: channelId, name: channelName },
    });
  };

  /**
   * 새 채팅방 생성 화면으로 이동
   */
  const navigateToCreateChannel = () => {
    router.push("/chat/create");
  };

  /**
   * 시간 포맷 함수
   */
  const formatTime = (time: string | undefined) => {
    if (!time) return "";

    const messageTime = dayjs(time);
    const now = dayjs();

    if (now.diff(messageTime, "day") === 0) {
      return messageTime.format("HH:mm");
    } else if (now.diff(messageTime, "day") === 1) {
      return "어제";
    } else if (now.diff(messageTime, "week") < 1) {
      return messageTime.format("ddd"); // 요일
    } else {
      return messageTime.format("YYYY.MM.DD");
    }
  };

  /**
   * 채팅방 아이템 렌더링 함수
   */
  const renderChannelItem = ({ item }: { item: ChatChannel }) => (
    <TouchableOpacity
      style={themed($channelItem)}
      onPress={() => navigateToChat(item.id, item.name)}
    >
      <View style={themed($channelIcon)}>
        <Ionicons name="chatbubbles" size={24} color={theme.colors.tint} />
      </View>

      <View style={themed($channelInfo)}>
        <View style={themed($channelHeader)}>
          <Text style={themed($channelName)} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={themed($channelTime)}>
            {formatTime(item.last_message_at)}
          </Text>
        </View>

        <View style={themed($channelFooter)}>
          <Text style={themed($lastMessage)} numberOfLines={1}>
            {item.last_message || item.description || "새로운 채팅방입니다."}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={theme.colors.textDim}
          />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={themed($container)}>
      {/* 헤더 */}
      <View style={themed($header)}>
        <Text style={themed($headerTitle)}>채팅</Text>
        <TouchableOpacity
          style={themed($createButton)}
          onPress={navigateToCreateChannel}
        >
          <Ionicons name="add" color="white" size={20} />
        </TouchableOpacity>
      </View>

      {/* 채팅방 목록 */}
      {isLoading ? (
        <View style={themed($loadingContainer)}>
          <ActivityIndicator size="large" color={theme.colors.tint} />
          <Text style={themed($loadingText)}>채팅방 목록을 불러오는 중...</Text>
        </View>
      ) : (
        <FlatList
          data={channels}
          renderItem={renderChannelItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={themed($listContainer)}
          ListEmptyComponent={
            <View style={themed($emptyContainer)}>
              <Ionicons
                name="chatbubbles"
                size={40}
                color={theme.colors.textDim}
              />
              <Text style={themed($emptyTitle)}>채팅방이 없습니다</Text>
              <Text style={themed($emptyText)}>
                새로운 채팅방을 만들어 대화를 시작해보세요.
              </Text>
              <TouchableOpacity
                style={themed($createChatButton)}
                onPress={navigateToCreateChannel}
              >
                <Text style={themed($createChatButtonText)}>
                  새 채팅방 만들기
                </Text>
              </TouchableOpacity>
            </View>
          }
          onRefresh={loadChannels}
          refreshing={isLoading}
        />
      )}
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
  padding: spacing?.md || 16,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $headerTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 24,
  fontWeight: "bold",
  color: colors.text,
});

const $createButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing?.xs || 8,
});

const $loadingContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
});

const $loadingText: ThemedStyle<TextStyle> = ({ colors }) => ({
  marginTop: 16,
  color: colors.textDim,
});

const $listContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing?.sm || 12,
  flexGrow: 1,
});

const $channelItem: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: spacing?.md || 16,
  paddingHorizontal: spacing?.md || 16,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $channelIcon: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  width: 48,
  height: 48,
  borderRadius: 24,
  backgroundColor: colors.border + "30",
  justifyContent: "center",
  alignItems: "center",
  marginRight: spacing?.md || 16,
});

const $channelInfo: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $channelHeader: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 6,
});

const $channelName: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  fontWeight: "600",
  color: colors.text,
  flex: 1,
});

const $channelTime: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
  marginLeft: 8,
});

const $channelFooter: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
});

const $lastMessage: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
  flex: 1,
});

const $emptyContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: spacing?.lg || 24,
  paddingVertical: spacing?.xl || 32,
});

const $emptyTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
  fontWeight: "600",
  color: colors.text,
  marginTop: 16,
  marginBottom: 8,
});

const $emptyText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
  textAlign: "center",
  marginBottom: 24,
});

const $createChatButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingVertical: spacing?.md || 16,
  paddingHorizontal: spacing?.lg || 24,
  backgroundColor: colors.tint,
  borderRadius: 8,
});

const $createChatButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  fontWeight: "600",
  color: colors.background,
});
