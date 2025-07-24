import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from "react-native";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import dayjs from "dayjs";
import { User } from "@/lib/auth";

/**
 * 메시지 타입 정의
 */
export type Message = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user: {
    id: string;
    nickname: string;
    avatar_url?: string;
  };
  is_system?: boolean; // 시스템 메시지 여부
  // 추가 필드 (확장성)
  reply_to?: string; // 답장 대상 메시지 ID
  attachments?: { url: string; type: string }[]; // 첨부 파일
};

/**
 * 메시지 타입 - 나의 메시지인지 확인용
 */
export type MessageWithIsMe = Message & {
  isMe: boolean; // 내가 보낸 메시지 여부
};

interface ChatMessageProps {
  message: MessageWithIsMe;
  showAvatar?: boolean; // 아바타 표시 여부 (연속된 메시지일 경우 숨김)
  showDate?: boolean; // 날짜 표시 여부
  onLongPress?: (message: Message) => void; // 길게 누를 때 콜백 (답장/삭제 등)
  highlightColor?: string; // 강조 색상 (필요시)
}

/**
 * 채팅 메시지 컴포넌트
 */
export default function ChatMessage({
  message,
  showAvatar = true,
  showDate = true,
  onLongPress,
  highlightColor,
}: ChatMessageProps) {
  const { themed, theme } = useAppTheme();

  // 시스템 메시지는 별도 처리
  if (message.is_system) {
    return (
      <View style={themed($systemMessageContainer)}>
        <Text style={themed($systemMessageText)}>{message.content}</Text>
        {showDate && (
          <Text style={themed($dateText)}>
            {dayjs(message.created_at).format("HH:mm")}
          </Text>
        )}
      </View>
    );
  }

  // 일반 메시지
  return (
    <TouchableOpacity
      style={[
        themed($container),
        message.isMe ? themed($myMessageContainer) : themed($otherMessageContainer),
      ]}
      onLongPress={() => onLongPress?.(message)}
      activeOpacity={0.9}
    >
      {/* 상대방 메시지인 경우 아바타 표시 */}
      {!message.isMe && showAvatar && (
        <View style={themed($avatarContainer)}>
          {message.user.avatar_url ? (
            <Image
              source={{ uri: message.user.avatar_url }}
              style={themed($avatar)}
            />
          ) : (
            <View style={[themed($avatar), themed($noAvatar)]}>
              <Text style={themed($avatarInitial)}>
                {message.user.nickname.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
      )}

      <View
        style={[
          message.isMe ? themed($myMessageContent) : themed($otherMessageContent),
        ]}
      >
        {/* 상대방 메시지인 경우 닉네임 표시 */}
        {!message.isMe && showAvatar && (
          <Text style={themed($nickname)}>{message.user.nickname}</Text>
        )}

        {/* 메시지 내용 */}
        <View
          style={[
            themed($messageBox),
            message.isMe ? themed($myMessageBox) : themed($otherMessageBox),
            highlightColor ? { backgroundColor: `${highlightColor}20` } : null,
          ]}
        >
          <Text style={themed($messageText)}>{message.content}</Text>
        </View>

        {/* 메시지 시간 */}
        {showDate && (
          <Text
            style={[
              themed($dateText),
              message.isMe ? themed($myMessageDate) : themed($otherMessageDate),
            ]}
          >
            {dayjs(message.created_at).format("HH:mm")}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// --- 스타일 정의 ---
const $container: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  marginVertical: 2,
  paddingHorizontal: 16,
  width: "100%",
});

const $myMessageContainer: ThemedStyle<ViewStyle> = () => ({
  justifyContent: "flex-end",
});

const $otherMessageContainer: ThemedStyle<ViewStyle> = () => ({
  justifyContent: "flex-start",
});

const $avatarContainer: ThemedStyle<ViewStyle> = () => ({
  marginRight: 8,
  alignSelf: "flex-end",
});

const $avatar: ThemedStyle<ViewStyle> = () => ({
  width: 32,
  height: 32,
  borderRadius: 16,
});

const $noAvatar: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.primary,
  justifyContent: "center",
  alignItems: "center",
});

const $avatarInitial: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.background,
  fontSize: 16,
  fontWeight: "bold",
});

const $myMessageContent: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  alignItems: "flex-end",
  maxWidth: "80%",
});

const $otherMessageContent: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "column",
  maxWidth: "80%",
});

const $nickname: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  fontWeight: "500",
  marginBottom: 4,
  color: colors.primary,
});

const $messageBox: ThemedStyle<ViewStyle> = () => ({
  borderRadius: 16,
  paddingHorizontal: 12,
  paddingVertical: 8,
  maxWidth: "100%",
});

const $myMessageBox: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.primary,
  borderTopRightRadius: 4,
});

const $otherMessageBox: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.card || colors.border + "40",
  borderTopLeftRadius: 4,
});

const $messageText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 15,
  color: colors.text,
});

const $dateText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 10,
  color: colors.textDim,
  marginTop: 2,
});

const $myMessageDate: ThemedStyle<TextStyle> = () => ({
  marginLeft: 6,
});

const $otherMessageDate: ThemedStyle<TextStyle> = () => ({
  alignSelf: "flex-end",
  marginTop: 4,
});

const $systemMessageContainer: ThemedStyle<ViewStyle> = () => ({
  alignItems: "center",
  marginVertical: 8,
});

const $systemMessageText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
  backgroundColor: colors.border + "40",
  paddingHorizontal: 12,
  paddingVertical: 4,
  borderRadius: 12,
});
