import React, { useState, useRef } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ViewStyle,
  TextStyle,
  Keyboard,
  Text,
} from "react-native";
import { Send, Paperclip, X, Plus } from "lucide-react-native";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";

/**
 * 채팅 입력창 Props 타입 정의
 */
interface ChatInputProps {
  onSendMessage: (text: string) => void;
  onAttachment?: () => void; // 첨부 파일 기능 (선택적)
  onAddOption?: () => void; // + 버튼 클릭 시 호출될 함수
  onEmoji?: () => void; // 이모지 버튼 클릭 시 호출될 함수
  disabled?: boolean;
  placeholder?: string;
  replyingTo?: {
    id: string;
    content: string;
    user: string;
  } | null; // 답장 중인 메시지 (선택적)
  onCancelReply?: () => void; // 답장 취소
}

/**
 * 채팅 입력 컴포넌트
 * 메시지 입력 및 전송 기능을 제공합니다.
 */
export default function ChatInput({
  onSendMessage,
  onAttachment,
  onAddOption,
  onEmoji,
  disabled = false,
  placeholder = "메시지를 입력하세요...",
  replyingTo = null,
  onCancelReply,
}: ChatInputProps) {
  const { themed, theme } = useAppTheme();
  const [message, setMessage] = useState("");
  const [isEmojiActive, setIsEmojiActive] = useState(false); // 이모지 버튼 활성화 상태
  const inputRef = useRef<TextInput>(null);

  /**
   * 메시지 전송 핸들러
   */
  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && !disabled) {
      onSendMessage(trimmedMessage);
      setMessage("");
      Keyboard.dismiss();
    }
  };

  /**
   * 엔터키로 메시지 전송 (React Native에서는 onSubmitEditing만 사용)
   */
  const handleSubmitEditing = () => {
    if (message.trim() && !disabled) {
      handleSend();
    }
  };

  /**
   * 이모지 버튼 클릭 핸들러
   * 💌 특별 메시지를 전송하고 시각적 피드백 제공
   */
  const handleEmojiToggle = () => {
    if (disabled) return;

    // 💌 특별 메시지 전송 (노란색 스타일로 표시됨)
    onSendMessage("💌 특별한 메시지입니다!");

    // 시각적 피드백을 위한 잠시 활성화 상태 표시
    setIsEmojiActive(true);

    // 0.3초 후 비활성화 상태로 복원 (시각적 피드백)
    setTimeout(() => {
      setIsEmojiActive(false);
    }, 300);

    // 부모 컴포넌트에 상태 변경 알림 (선택적)
    if (onEmoji) {
      onEmoji();
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* 답장 모드일 때 표시 */}
      {replyingTo && (
        <View style={themed($replyContainer)}>
          <View style={themed($replyContent)}>
            <View style={themed($replyIndicator)} />
            <View style={themed($replyTextContainer)}>
              <Text style={themed($replyToText)}>
                {replyingTo.user}에게 답장
              </Text>
              <Text style={themed($replyMessageText)} numberOfLines={1}>
                {replyingTo.content}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={themed($cancelReplyButton)}
            onPress={onCancelReply}
          >
            <X size={18} color={theme.colors.textDim} />
          </TouchableOpacity>
        </View>
      )}

      <View style={themed($container)}>
        {/* + 버튼 */}
        <TouchableOpacity
          style={themed($addButton)}
          onPress={onAddOption}
          disabled={disabled}
        >
          <Plus
            size={22}
            color={
              disabled ? theme.colors.textDim + "80" : theme.colors.textDim
            }
          />
        </TouchableOpacity>

        {/* 첨부 파일 버튼 */}
        {onAttachment && (
          <TouchableOpacity
            style={themed($attachButton)}
            onPress={onAttachment}
            disabled={disabled}
          >
            <Paperclip
              size={22}
              color={
                disabled ? theme.colors.textDim + "80" : theme.colors.textDim
              }
            />
          </TouchableOpacity>
        )}

        {/* 메시지 입력 필드 */}
        <TextInput
          ref={inputRef}
          style={themed($input)}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textDim}
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={1000}
          onSubmitEditing={handleSubmitEditing}
          editable={!disabled}
          returnKeyType="send"
          blurOnSubmit={false}
        />

        {/* 이모지 버튼 */}
        {onEmoji && (
          <TouchableOpacity
            style={[
              themed($emojiButton),
              isEmojiActive ? themed($emojiButtonActive) : null,
            ]}
            onPress={handleEmojiToggle}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Text style={themed($emojiText)}>💌</Text>
          </TouchableOpacity>
        )}

        {/* 전송 버튼 */}
        <TouchableOpacity
          style={[
            themed($sendButton),
            !message.trim() || disabled ? themed($sendButtonDisabled) : null,
          ]}
          onPress={handleSend}
          disabled={!message.trim() || disabled}
        >
          <Send
            size={20}
            color={
              !message.trim() || disabled
                ? theme.colors.textDim + "50"
                : theme.colors.background
            }
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// --- 스타일 정의 ---
const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing?.sm || 12,
  paddingVertical: spacing?.sm || 12,
  borderTopWidth: 1,
  borderTopColor: colors.border,
  backgroundColor: colors.background,
});

const $input: ThemedStyle<TextStyle> = ({ colors }) => ({
  flex: 1,
  minHeight: 36,
  maxHeight: 100,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 18,
  paddingHorizontal: 12,
  paddingVertical: 8,
  paddingRight: 80, // 이모지 버튼과 전송 버튼 공간 확보
  fontSize: 15,
  color: colors.text,
  backgroundColor: colors.background,
});

const $addButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing?.xs || 8,
  marginRight: spacing?.xs || 8,
});

const $attachButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing?.xs || 8,
  marginRight: spacing?.xs || 8,
});

const $emojiButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  position: "absolute",
  right: 56, // 전송 버튼과 겹치지 않도록 조정
  bottom: spacing?.sm || 12,
  height: 30,
  width: 30,
  borderRadius: 15,
  justifyContent: "center",
  alignItems: "center",
  borderWidth: 1,
  borderColor: "transparent",
  backgroundColor: "transparent",
  zIndex: 10,
  elevation: 10,
});

const $emojiButtonActive: ThemedStyle<ViewStyle> = ({ colors }) => ({
  borderColor: colors.tint,
  backgroundColor: colors.tint + "20", // 20% 투명도로 배경색 적용
});

const $emojiText: ThemedStyle<TextStyle> = () => ({
  fontSize: 20,
});

const $sendButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  position: "absolute",
  right: spacing?.md || 16,
  bottom: spacing?.sm || 12,
  width: 30,
  height: 30,
  borderRadius: 15,
  backgroundColor: colors.tint,
  justifyContent: "center",
  alignItems: "center",
  zIndex: 5,
  elevation: 5,
});

const $sendButtonDisabled: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.border,
});

const $replyContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  paddingHorizontal: spacing?.sm || 12,
  paddingVertical: spacing?.xs || 8,
  backgroundColor: colors.background,
  borderTopWidth: 1,
  borderTopColor: colors.border,
  alignItems: "center",
});

const $replyContent: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
});

const $replyIndicator: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 2,
  height: 36,
  backgroundColor: colors.tint,
  marginRight: 8,
});

const $replyTextContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $replyToText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  fontWeight: "600",
  color: colors.tint,
});

const $replyMessageText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 13,
  color: colors.textDim,
  marginTop: 2,
});

const $cancelReplyButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing?.xs || 8,
});
