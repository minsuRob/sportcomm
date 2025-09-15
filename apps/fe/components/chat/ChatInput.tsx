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
import ChatOptionsModal, { type ChatOption } from "./ChatOptionsModal";

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
  isKeyboardVisible?: boolean; // 키보드 표시 상태
  keyboardHeight?: number; // 키보드 높이
}

/**
 * 채팅 입력 컴포넌트
 * 메시지 입력 및 전송 기능을 제공합니다.
 * 키보드가 올라갈 때 자연스럽게 위치하도록 최적화되었습니다.
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
  isKeyboardVisible = false,
  keyboardHeight = 0,
}: ChatInputProps) {
  const { themed, theme } = useAppTheme();
  const [message, setMessage] = useState("");
  const [isEmojiActive, setIsEmojiActive] = useState(false); // 이모지 버튼 활성화 상태
  const [inputHeight, setInputHeight] = useState(40); // 동적 입력창 높이
  const [optionsModalVisible, setOptionsModalVisible] = useState(false); // 옵션 모달 상태
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
   * 옵션 모달을 열거나 특별 메시지 모드를 활성화/비활성화
   */
  const handleEmojiToggle = () => {
    if (disabled) return;

    // 옵션 모달 열기
    setOptionsModalVisible(true);

    // 부모 컴포넌트에 상태 변경 알림 (선택적)
    if (onEmoji) {
      onEmoji();
    }
  };

  /**
   * 채팅 옵션 선택 핸들러
   * 선택된 옵션을 메시지에 적용
   */
  const handleSelectOption = (option: ChatOption) => {
    let newMessage = message;

    switch (option.type) {
      case "emoji":
      case "sticker":
        // 이모지나 스티커는 현재 메시지에 추가
        newMessage = message + option.content;
        break;
      case "effect":
        // 특수 효과는 메시지를 감싸거나 앞에 추가
        newMessage = `${option.content} ${message}`.trim();
        break;
      case "template":
        // 템플릿은 메시지를 완전히 대체
        newMessage = option.content;
        break;
    }

    setMessage(newMessage);

    // 효과나 템플릿 선택 시 특별 모드 활성화
    if (option.type === "effect" || option.type === "template") {
      setIsEmojiActive(true);
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

  /**
   * 입력창 포커스 핸들러
   * 키보드가 올라올 때 자연스러운 스크롤을 위해 사용
   */
  const handleInputFocus = () => {
    // 입력창 포커스 시 키보드가 올라오는 것을 감지
    if (!isKeyboardVisible) {
      // 키보드가 아직 올라오지 않은 경우 약간의 지연 후 스크롤
      setTimeout(() => {
        // 부모 컴포넌트에 포커스 이벤트 알림
        //console.log("입력창 포커스 - 키보드 올라오는 중");
      }, 100);
    }
  };

  /**
   * 입력창 블러 핸들러
   * 키보드가 내려갈 때 자연스러운 처리를 위해 사용
   */
  const handleInputBlur = () => {
    // 입력창에서 포커스가 벗어날 때 처리
    //console.log("입력창 블러 - 키보드 내려가는 중");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      enabled={false} // 부모 컴포넌트에서 처리하므로 비활성화
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

      {/* 하단 입력 바: 좌측 아이콘들 + 모드 pill + 입력 + 우측 전송 CTA */}
      <View
        style={[
          themed($container),
          isKeyboardVisible &&
            Platform.OS === "android" && {
              paddingBottom: Math.max(keyboardHeight - 20, 0),
            },
        ]}
      >
        <View style={themed($bar)}>
          {/* 좌측 + 버튼 */}
          {onAddOption && (
            <TouchableOpacity
              style={themed($leftIconButton)}
              onPress={onAddOption}
              disabled={disabled}
              accessibilityRole="button"
            >
              <Ionicons
                name="add-outline"
                size={20}
                color={
                  disabled ? theme.colors.textDim + "80" : theme.colors.textDim
                }
              />
            </TouchableOpacity>
          )}

          {/* 좌측 첨부 버튼 */}
          {onAttachment && (
            <TouchableOpacity
              style={themed($leftIconButton)}
              onPress={onAttachment}
              disabled={disabled}
              accessibilityRole="button"
            >
              <Ionicons
                name="attach-outline"
                size={20}
                color={
                  disabled ? theme.colors.textDim + "80" : theme.colors.textDim
                }
              />
            </TouchableOpacity>
          )}

          {/* 채팅 옵션 버튼 */}
          {onEmoji && (
            <TouchableOpacity
              style={[
                themed($optionsButton),
                isEmojiActive ? themed($optionsButtonActive) : null,
              ]}
              onPress={handleEmojiToggle}
              disabled={disabled}
              accessibilityRole="button"
              activeOpacity={0.7}
            >
              <Ionicons
                name="happy-outline"
                color={isEmojiActive ? theme.colors.tint : theme.colors.textDim}
                size={20}
              />
            </TouchableOpacity>
          )}

          {/* 메시지 입력 필드 */}
          <TextInput
            ref={inputRef}
            style={[themed($inputFlex), { height: inputHeight }]}
            placeholder={
              isEmojiActive ? "💌 특별한 메시지를 입력하세요..." : placeholder
            }
            placeholderTextColor={
              isEmojiActive ? theme.colors.tint : theme.colors.textDim
            }
            value={message}
            onChangeText={setMessage}
            onContentSizeChange={handleContentSizeChange}
            multiline={true}
            numberOfLines={1}
            maxLength={1000}
            onSubmitEditing={handleSubmitEditing}
            editable={!disabled}
            returnKeyType="default"
            scrollEnabled={inputHeight >= 120}
            textBreakStrategy="simple"
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            // 키보드 최적화 설정
            keyboardType="default"
            autoCapitalize="sentences"
            autoCorrect={true}
            blurOnSubmit={false}
          />

          {/* 전송 CTA */}
          <TouchableOpacity
            style={[
              themed($sendCta),
              !message.trim() || disabled ? themed($sendCtaDisabled) : null,
            ]}
            onPress={handleSend}
            disabled={!message.trim() || disabled}
            accessibilityRole="button"
          >
            <Ionicons
              name="send"
              size={18}
              color={
                !message.trim() || disabled
                  ? theme.colors.textDim + "80"
                  : theme.colors.card
              }
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* 채팅 옵션 모달 */}
      <ChatOptionsModal
        visible={optionsModalVisible}
        onClose={() => setOptionsModalVisible(false)}
        onSelectOption={handleSelectOption}
      />
    </KeyboardAvoidingView>
  );
}

// --- 스타일 정의 ---
const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing?.md || 16,
  paddingVertical: spacing?.sm || 12,
  borderTopWidth: 1,
  borderTopColor: colors.border,
  backgroundColor: colors.background,
});

// 바 컨테이너 (둥근 입력바)
const $bar: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: colors.card,
  borderRadius: 28,
  borderWidth: 1,
  borderColor: colors.border,
  paddingHorizontal: spacing?.sm || 12,
  paddingVertical: spacing?.xs || 8,
});

const $leftIconButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing?.xs || 8,
  paddingVertical: spacing?.xs || 8,
});

const $optionsButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: colors.backgroundAlt,
  justifyContent: "center",
  alignItems: "center",
  marginRight: spacing?.sm || 12,
  borderWidth: 1,
  borderColor: colors.border,
});

const $optionsButtonActive: ThemedStyle<ViewStyle> = ({ colors }) => ({
  borderColor: colors.tint,
  backgroundColor: colors.tint + "15",
});

const $inputFlex: ThemedStyle<TextStyle> = ({ colors }) => ({
  flex: 1,
  paddingHorizontal: 12,
  paddingVertical: 8,
  fontSize: 16,
  color: colors.text,
  backgroundColor: colors.card,
  textAlignVertical: "top",
  lineHeight: 20,
});

const $sendCta: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing?.md || 16,
  paddingVertical: spacing?.sm || 10,
  backgroundColor: colors.tint,
  borderRadius: 18,
  marginLeft: spacing?.sm || 12,
});

const $sendCtaDisabled: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.border,
});

// 답장 영역 스타일은 그대로 유지

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
