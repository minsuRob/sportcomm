import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Image,
  ImageStyle,
} from "react-native";
import { useQuery } from "@apollo/client";
import { useRouter } from "expo-router";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/ko";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { GET_USER_PRIVATE_CHATS } from "@/lib/graphql/user-chat";
import type { UserChatRoom } from "@/lib/graphql/user-chat";
import { User } from "@/lib/auth";
import { Ionicons } from "@expo/vector-icons";

dayjs.extend(relativeTime);
dayjs.locale("ko");

interface PrivateChatListProps {
  currentUser: User | null;
  onClosePopover: () => void;
}

export default function PrivateChatList({
  currentUser,
  onClosePopover,
}: PrivateChatListProps) {
  const { themed, theme } = useAppTheme();
  const router = useRouter();

  const {
    data,
    loading,
    error,
    refetch: refetchChats,
  } = useQuery(GET_USER_PRIVATE_CHATS, {
    variables: { page: 1, limit: 20 },
    fetchPolicy: "cache-and-network",
  });

  const handleChatItemPress = (chatRoom: UserChatRoom) => {
    if (!currentUser) return;

    const partner = chatRoom.participants.find((p) => p.id !== currentUser.id);
    const roomName = partner?.nickname || chatRoom.name;

    onClosePopover();
    router.push({
      pathname: "/(details)/chat/[roomId]",
      params: { roomId: chatRoom.id, roomName },
    });
  };

  const renderChatItem = ({ item }: { item: UserChatRoom }) => {
    if (!currentUser) return null;

    const partner = item.participants.find((p) => p.id !== currentUser.id);
    const lastMessageTime = item.lastMessageAt
      ? dayjs(item.lastMessageAt).fromNow()
      : "";

    return (
      <TouchableOpacity
        style={themed($chatItem)}
        onPress={() => handleChatItemPress(item)}
      >
        <Image
          source={{
            uri:
              partner?.profileImageUrl ||
              `https://avatar.iran.liara.run/username?username=${
                partner?.nickname || "User"
              }`,
          }}
          style={themed($avatar)}
        />
        <View style={themed($chatDetails)}>
          <View style={themed($chatHeader)}>
            <Text style={themed($chatPartnerName)} numberOfLines={1}>
              {partner?.nickname || "알 수 없는 사용자"}
            </Text>
            <Text style={themed($lastMessageTime)}>{lastMessageTime}</Text>
          </View>
          <Text style={themed($lastMessage)} numberOfLines={1}>
            {item.lastMessageContent || "메시지가 없습니다."}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={themed($centeredContainer)}>
        <ActivityIndicator color={theme.colors.tint} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={themed($centeredContainer)}>
        <Text style={themed($errorText)}>오류가 발생했습니다.</Text>
        <TouchableOpacity onPress={() => refetchChats()}>
          <Text style={themed($retryText)}>재시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const chatRooms = data?.getUserPrivateChats?.chatRooms || [];

  return (
    <View style={themed($container)}>
      <View style={themed($headerContainer)}>
        <Ionicons
          name="chatbubbles-outline"
          size={18}
          color={theme.colors.text}
        />
        <Text style={themed($title)}>개인 메시지</Text>
      </View>
      {chatRooms.length === 0 ? (
        <View style={themed($centeredContainer)}>
          <Text style={themed($emptyText)}>받은 메시지가 없습니다.</Text>
        </View>
      ) : (
        <FlatList
          data={chatRooms}
          renderItem={renderChatItem}
          keyExtractor={(item) => item.id}
          style={themed($list)}
        />
      )}
    </View>
  );
}

// --- 스타일 정의 ---
const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  maxHeight: 300,
  paddingTop: spacing.sm,
});

const $headerContainer: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.md,
  paddingBottom: spacing.sm,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
  gap: spacing.sm,
});

const $title: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  fontWeight: "600",
  color: colors.text,
});

const $list: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.xs,
});

const $centeredContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  justifyContent: "center",
  alignItems: "center",
  padding: spacing.lg,
});

const $errorText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
  marginBottom: 8,
});

const $retryText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  fontWeight: "600",
});

const $emptyText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
});

const $chatItem: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  flexDirection: "row",
  alignItems: "center",
  padding: spacing.sm,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $avatar: ThemedStyle<ImageStyle> = ({ spacing }) => ({
  width: 40,
  height: 40,
  borderRadius: 20,
  marginRight: spacing.sm,
});

const $chatDetails: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $chatHeader: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
});

const $chatPartnerName: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  fontWeight: "600",
  color: colors.text,
});

const $lastMessageTime: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
});

const $lastMessage: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 13,
  color: colors.textDim,
  marginTop: 2,
});
