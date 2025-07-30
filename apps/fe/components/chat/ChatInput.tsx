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
import { Ionicons } from "@expo/vector-icons";
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
  const [inputHeight, setInputHeight] = useState(40); // 동적 입력창 높이
  const inputRef = useRef<TextInput>(null);

  /**
   * 메시지 전송 핸들러
   * 특별 메시지 모드에 따라 다르게 처리
   */
  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && !disabled) {
      // 특별 메시지 모드가 활성화된 경우 💌 이모지 추가
      const finalMessage = isEmojiActive
        ? `💌 ${trimmedMessage}`
        : trimmedMessage;
      onSendMessage(finalMessage);
      setMessage("");

      // 메시지 전송 후 입력창 높이 초기화
      setInputHeight(40);

      // 특별 메시지 전송 후 토글 상태 해제 (선택적)
      if (isEmojiActive) {
        setIsEmojiActive(false);
      }

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
   * 이모지 버튼 토글 핸들러
   * 특별 메시지 모드를 활성화/비활성화
   */
  const handleEmojiToggle = () => {
    if (disabled) return;

    // 토글 상태 변경
    setIsEmojiActive(!isEmojiActive);

    // 부모 컴포넌트에 상태 변경 알림 (선택적)
    if (onEmoji) {
      onEmoji();
    }
  };

  /**
   * 입력창 내용 크기 변경 핸들러
   * 웹에서 동적 높이 조정을 위해 사용
   */
  const handleContentSizeChange = (event: any) => {
    const { height } = event.nativeEvent.contentSize;
    const minHeight = 40;
    const maxHeight = 90;

    // 빈 텍스트일 때는 기본 높이 사용
    if (!message.trim()) {
      setInputHeight(minHeight);
      return;
    }

    // 내용이 있을 때만 동적 높이 계산
    // 패딩(20px)을 고려하되, 최소 높이보다 작으면 기본값 사용
    const calculatedHeight = height + 20;
    const newHeight = Math.max(
      minHeight,
      Math.min(maxHeight, calculatedHeight),
    );

    // 계산된 높이가 기본 높이와 크게 다르지 않으면 기본값 유지
    if (calculatedHeight <= minHeight + 5) {
      setInputHeight(minHeight);
    } else {
      setInputHeight(newHeight);
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
            <Ionicons name="close" size={18} color={theme.colors.textDim} />
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
          <Ionicons
            name="add"
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
            <Ionicons
              name="attach"
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
          style={[
            themed($input),
            isEmojiActive ? themed($inputSpecial) : null,
            { height: inputHeight }, // 동적 높이 적용
          ]}
          placeholder={
            isEmojiActive ? "💌 특별한 메시지를 입력하세요..." : placeholder
          }
          placeholderTextColor={
            isEmojiActive ? theme.colors.tint : theme.colors.textDim
          }
          value={message}
          onChangeText={setMessage}
          onContentSizeChange={handleContentSizeChange} // 내용 크기 변경 감지
          multiline={true}
          numberOfLines={1} // 초기 줄 수
          maxLength={1000}
          onSubmitEditing={handleSubmitEditing}
          editable={!disabled}
          returnKeyType="default" // 멀티라인에서는 default가 더 적합
          scrollEnabled={inputHeight >= 120} // 최대 높이 도달 시만 스크롤 활성화
          textBreakStrategy="simple" // Android에서 텍스트 줄바꿈 최적화
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
          <Ionicons
            name="send"
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
  alignItems: "flex-end", // 입력 필드 하단 기준으로 정렬
  paddingHorizontal: spacing?.sm || 12,
  paddingVertical: spacing?.md || 16, // 패딩 증가로 더 넓은 공간
  borderTopWidth: 1,
  borderTopColor: colors.border,
  backgroundColor: colors.background,
  position: "relative", // 절대 위치 요소들의 기준점
  minHeight: 60, // 최소 높이 보장
});

const $input: ThemedStyle<TextStyle> = ({ colors }) => ({
  flex: 1,
  // height는 동적으로 설정되므로 minHeight/maxHeight 제거
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 20, // 더 둥근 모서리
  paddingHorizontal: 16, // 좌우 패딩 증가
  paddingVertical: 10, // 상하 패딩 증가
  paddingRight: 80, // 이모지 버튼과 전송 버튼 공간 확보
  fontSize: 16, // 폰트 크기 약간 증가
  color: colors.text,
  backgroundColor: colors.background,
  textAlignVertical: "top", // 멀티라인에서 상단 정렬이 더 자연스러움
  lineHeight: 20, // 줄 간격 설정
});

const $inputSpecial: ThemedStyle<TextStyle> = ({ colors }) => ({
  borderColor: colors.tint,
  borderWidth: 2,
  backgroundColor: colors.tint + "10", // 10% 투명도로 배경색 적용
});

const $addButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing?.xs || 8,
  marginRight: spacing?.xs || 8,
  marginBottom: 8, // 입력 필드와 정렬을 위한 조정 (증가)
});

const $attachButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing?.xs || 8,
  marginRight: spacing?.xs || 8,
  marginBottom: 8, // 입력 필드와 정렬을 위한 조정 (증가)
});

const $emojiButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  position: "absolute",
  right: 56, // 전송 버튼과 겹치지 않도록 조정
  bottom: (spacing?.md || 16) + 8, // 입력 필드와 정렬을 위해 조정 (증가)
  height: 32, // 버튼 크기 약간 증가
  width: 32,
  borderRadius: 16,
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
  fontSize: 22, // 이모지 크기 약간 증가
});

const $sendButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  position: "absolute",
  right: spacing?.md || 16,
  bottom: (spacing?.md || 16) + 8, // 입력 필드와 정렬을 위해 조정 (증가)
  width: 32, // 버튼 크기 약간 증가
  height: 32,
  borderRadius: 16,
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
