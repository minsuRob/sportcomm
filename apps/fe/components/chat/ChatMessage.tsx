import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  ImageStyle,
  Image,
} from "react-native";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import dayjs from "dayjs";
import { Ionicons } from "@expo/vector-icons";
import UserAvatar from "@/components/users/UserAvatar";

/**
 * 메시지 타입 정의
 */
export type Message = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  channel_id?: string; // 채널 ID 추가
  user: {
    id: string;
    nickname: string;
    avatar_url?: string;
  };
  is_system?: boolean; // 시스템 메시지 여부
  is_special?: boolean; // 특별 메시지 여부 (노란색 스타일)
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
  onModerationAction?: (message: Message) => void; // 신고/차단 액션 콜백
  onMorePress?: (message: Message) => void;
  userMeta?: { age?: number; teamLogos?: string[] };
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
  onModerationAction,
  onMorePress,
  userMeta,
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

  // 특별 메시지 처리 (노란색 스타일) - 💌 이모지가 포함된 메시지
  const isSpecialMessage = message.is_special || message.content.includes("💌");

  if (isSpecialMessage) {
    return (
      <View style={themed($specialMessageContainer)}>
        <View style={themed($specialMessageBox)}>
          <Text style={themed($specialMessageText)}>{message.content}</Text>
          {showDate && (
            <Text style={themed($specialMessageDate)}>
              {dayjs(message.created_at).format("HH:mm")}
            </Text>
          )}
        </View>
      </View>
    );
  }

  // 길게 누르기 핸들러
  const handleLongPress = () => {
    if (onLongPress) {
      onLongPress(message);
    } else if (onModerationAction && !message.isMe) {
      // 기본 동작: 다른 사용자의 메시지인 경우 신고/차단 옵션 표시
      onModerationAction(message);
    }
  };

  // 일반 메시지
  return (
    <TouchableOpacity
      style={[
        themed($container),
        message.isMe
          ? themed($myMessageContainer)
          : themed($otherMessageContainer),
      ]}
      onLongPress={handleLongPress}
      activeOpacity={0.9}
    >
      {/* 상대방 메시지 레이아웃 */}
      {!message.isMe ? (
        <View style={themed($otherMessageLayout)}>
          {/* 왼쪽: 아바타 + 닉네임 + 배지/로고 + more 버튼 (한 줄) */}
          <View style={themed($leftSection)}>
            <View style={themed($avatarContainer)}>
              <UserAvatar
                imageUrl={message.user.avatar_url}
                name={message.user.nickname}
                size={28}
              />
            </View>
            <Text style={themed($nickname)}>{message.user.nickname}</Text>
            {/* 나의 메시지에만 사용자 메타(연령대 배지/팀 로고) 표시하도록 설계 */}
            {message.isMe && userMeta?.age ? (
              <View style={themed($ageBadge)}>
                <Text style={themed($ageBadgeText)}>
                  {(() => {
                    const age = userMeta.age as number;
                    if (age >= 40) return `40+ 🟪`;
                    if (age >= 30) return `30-35 🟦`;
                    if (age >= 26) return `26-29 🟩`;
                    if (age >= 21) return `20-25 🟨`;
                    if (age >= 16) return `16-20 🟧`;
                    if (age >= 10) return `10-15 🟥`;
                    return `${age}`;
                  })()}
                </Text>
              </View>
            ) : null}
            {message.isMe &&
              userMeta?.teamLogos &&
              userMeta.teamLogos.length > 0 && (
                <View style={themed($teamLogosRow)}>
                  {userMeta.teamLogos.slice(0, 3).map((url, idx) => (
                    <Image
                      key={`${url}-${idx}`}
                      source={{ uri: url }}
                      style={themed($teamLogoSmall)}
                    />
                  ))}
                </View>
              )}
            {!message.isMe && onMorePress && (
              <TouchableOpacity
                style={themed($moreButtonInline)}
                onPress={() => onMorePress(message)}
              >
                <Ionicons
                  name="ellipsis-horizontal"
                  size={16}
                  color={theme.colors.textDim}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* 오른쪽: 메시지 + 시간 */}
          <View style={themed($rightSection)}>
            <View
              style={[
                themed($messageBox),
                themed($otherMessageBox),
                highlightColor
                  ? { backgroundColor: `${highlightColor}20` }
                  : null,
              ]}
            >
              <Text style={themed($messageText)}>{message.content}</Text>
            </View>
            {showDate && (
              <Text style={themed($otherMessageDate)}>
                {dayjs(message.created_at).format("HH:mm")}
              </Text>
            )}
          </View>
        </View>
      ) : (
        /* 내 메시지는 기존 방식 유지 */
        <View style={themed($myMessageContent)}>
          {showDate && (
            <Text style={themed($myMessageDate)}>
              {dayjs(message.created_at).format("HH:mm")}
            </Text>
          )}
          <View
            style={[
              themed($messageBox),
              themed($myMessageBox),
              highlightColor
                ? { backgroundColor: `${highlightColor}20` }
                : null,
            ]}
          >
            <Text style={themed($myMessageText)}>{message.content}</Text>
          </View>
        </View>
      )}
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

// --- 새로운 레이아웃 스타일 ---
const $otherMessageLayout: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  alignItems: "flex-start",
  maxWidth: "85%",
});

const $leftSection: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  alignItems: "center",
  marginRight: 8,
  minWidth: 80, // 최소 너비 보장
});

const $rightSection: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  flexDirection: "column",
});

const $moreButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginLeft: spacing.xs,
  padding: spacing.xs,
  justifyContent: "center",
  alignItems: "center",
});

const $moreButtonInline: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginLeft: spacing.xs,
  padding: spacing.xs,
  justifyContent: "center",
  alignItems: "center",
});

const $avatarContainer: ThemedStyle<ViewStyle> = () => ({
  marginRight: 6,
});

const $avatar: ThemedStyle<ImageStyle> = () => ({
  width: 28,
  height: 28,
  borderRadius: 14,
});

const $noAvatar: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tint,
  justifyContent: "center",
  alignItems: "center",
});

const $avatarInitial: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.background,
  fontSize: 14,
  fontWeight: "bold",
});

const $nickname: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 11,
  fontWeight: "500",
  color: colors.tint,
  flexShrink: 1, // 긴 닉네임 처리
});

const $ageBadge: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  marginLeft: spacing.xs,
  paddingHorizontal: spacing.xs,
  paddingVertical: 2,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.card,
});

const $ageBadgeText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 10,
  color: colors.text,
  fontWeight: "600",
});

const $teamLogosRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xxs,
  marginLeft: spacing.xs,
});

const $teamLogoSmall: ThemedStyle<ImageStyle> = ({ colors }) => ({
  width: 14,
  height: 14,
  borderRadius: 7,
  borderWidth: 1,
  borderColor: colors.border,
});

const $myMessageContent: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  alignItems: "flex-end",
  justifyContent: "flex-end",
  maxWidth: "80%",
});

const $otherMessageContent: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "column",
  maxWidth: "80%",
});

const $messageBox: ThemedStyle<ViewStyle> = () => ({
  borderRadius: 16,
  paddingHorizontal: 12,
  paddingVertical: 8,
  maxWidth: "100%",
});

const $myMessageBox: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tint,
  borderTopRightRadius: 4,
});

const $myMessageText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 15,
  color: colors.background, // 내 메시지는 배경색과 대비되는 색상 사용
});

const $otherMessageBox: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.palette.neutral300,
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

const $myMessageDate: ThemedStyle<TextStyle> = ({ colors }) => ({
  marginRight: 6,
  fontSize: 10,
  color: colors.textDim,
});

const $otherMessageDate: ThemedStyle<TextStyle> = () => ({
  alignSelf: "flex-start",
  marginTop: 2,
  marginLeft: 4,
});

const $systemMessageContainer: ThemedStyle<ViewStyle> = () => ({
  alignItems: "center",
  marginVertical: 8,
});

const $systemMessageText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
  backgroundColor: colors.palette.neutral300,
  paddingHorizontal: 12,
  paddingVertical: 4,
  borderRadius: 12,
});

// --- 특별 메시지 스타일 (노란색) ---
const $specialMessageContainer: ThemedStyle<ViewStyle> = () => ({
  alignItems: "center",
  marginVertical: 16, // 일반 메시지(2)와 시스템 메시지(8) 사이의 적절한 값
  paddingHorizontal: 16,
});

const $specialMessageBox: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: "#FFD700", // 노란색 배경
  borderWidth: 2,
  borderColor: "#FFA500", // 주황색 테두리
  borderRadius: 16,
  paddingHorizontal: 16,
  paddingVertical: 12,
  maxWidth: "90%",
  minWidth: "60%",
  shadowColor: "#000",
  shadowOffset: {
    width: 0,
    height: 2,
  },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3, // Android 그림자
});

const $specialMessageText: ThemedStyle<TextStyle> = () => ({
  fontSize: 16,
  fontWeight: "600",
  color: "#8B4513", // 갈색 텍스트 (노란 배경과 대비)
  textAlign: "center",
  lineHeight: 22,
});

const $specialMessageDate: ThemedStyle<TextStyle> = () => ({
  fontSize: 10,
  color: "#8B4513",
  marginTop: 4,
  textAlign: "center",
  opacity: 0.8,
});
