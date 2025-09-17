import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ViewStyle,
  TextStyle,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";

interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  disabled?: boolean;
  suggestedTags?: string[];
}

/**
 * 태그 입력 컴포넌트
 * --> 주제로 변경, 1개만 허용.
 *
 * 사용자가 게시물에 태그를 추가하고 관리할 수 있는 컴포넌트입니다.
 * 자동완성, 추천 태그, 태그 제거 기능을 제공합니다.
 */
export default function TagInput({
  tags,
  onTagsChange,
  placeholder = "주제를 입력하세요 (예: 전술분석, 이적소식)",
  maxTags = 10,
  disabled = false,
  suggestedTags = [],
}: TagInputProps) {
  const { themed, theme } = useAppTheme();
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // 입력값을 기반으로 필터링된 추천 태그
  const filteredSuggestions = suggestedTags.filter(
    (suggestion) =>
      suggestion.toLowerCase().includes(inputValue.toLowerCase()) &&
      !tags.includes(suggestion) &&
      inputValue.length > 0,
  );

  /**
   * 태그 추가 핸들러
   */
  const addTag = (tagName: string) => {
    const trimmedTag = tagName.trim();

    if (!trimmedTag) return;
    if (tags.length >= maxTags) return;
    if (tags.includes(trimmedTag)) return;

    // 태그 유효성 검사
    if (trimmedTag.length > 50) return;
    if (!/^[가-힣a-zA-Z0-9_\s]+$/.test(trimmedTag)) return;

    onTagsChange([...tags, trimmedTag]);
    setInputValue("");
    setShowSuggestions(false);
  };

  /**
   * 태그 제거 핸들러
   */
  const removeTag = (index: number) => {
    const newTags = tags.filter((_, i) => i !== index);
    onTagsChange(newTags);
  };

  /**
   * 입력값 변경 핸들러
   */
  const handleInputChange = (text: string) => {
    setInputValue(text);
    setShowSuggestions(text.length > 0 && filteredSuggestions.length > 0);
  };

  /**
   * 키보드 입력 핸들러 (엔터, 스페이스, 쉼표로 태그 추가)
   */
  const handleKeyPress = (key: string) => {
    if (key === "Enter" || key === " " || key === ",") {
      if (inputValue.trim()) {
        addTag(inputValue);
      }
    }
  };

  /**
   * 추천 태그 선택 핸들러
   */
  const selectSuggestion = (suggestion: string) => {
    addTag(suggestion);
  };

  /**
   * 입력 필드 포커스 핸들러
   */
  const handleFocus = () => {
    if (inputValue.length > 0 && filteredSuggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  /**
   * 입력 필드 블러 핸들러
   */
  const handleBlur = () => {
    // 약간의 지연을 두어 추천 태그 클릭이 가능하도록 함
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  return (
    <View style={themed($container)}>
      {/* 태그 목록 */}
      {tags.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={themed($tagsContainer)}
          contentContainerStyle={themed($tagsContent)}
        >
          {tags.map((tag, index) => (
            <View key={index} style={themed($tagChip)}>
              <Text style={themed($tagText)}>#{tag}</Text>
              {!disabled && (
                <TouchableOpacity
                  onPress={() => removeTag(index)}
                  style={themed($removeButton)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={14} color={theme.colors.text} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* 입력 필드 */}
      <View style={themed($inputContainer)}>
        <TextInput
          ref={inputRef}
          style={themed($textInput)}
          value={inputValue}
          onChangeText={handleInputChange}
          onSubmitEditing={() => {
            if (inputValue.trim()) {
              addTag(inputValue);
            }
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={
            tags.length >= maxTags ? `최대 ${maxTags}개까지 가능` : placeholder
          }
          placeholderTextColor={theme.colors.textDim}
          editable={!disabled && tags.length < maxTags}
          returnKeyType="done"
          blurOnSubmit={false}
        />

        {inputValue.length > 0 && !disabled && (
          <TouchableOpacity
            onPress={() => addTag(inputValue)}
            style={themed($addButton)}
          >
            <Ionicons name="add" size={20} color={theme.colors.tint} />
          </TouchableOpacity>
        )}
      </View>

      {/* 태그 개수 표시 */}
      <View style={themed($infoRow)}>
        <Text style={themed($tagCount)}>
          {tags.length}/{maxTags}
        </Text>
        <Text style={themed($helpText)}>엔터로 주제 추가</Text>
      </View>

      {/* 추천 태그 */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <View style={themed($suggestionsContainer)}>
          <Text style={themed($suggestionsTitle)}>추천 주제</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={themed($suggestionsContent)}
          >
            {filteredSuggestions.slice(0, 5).map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => selectSuggestion(suggestion)}
                style={themed($suggestionChip)}
              >
                <Text style={themed($suggestionText)}>#{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* 인기 태그 (입력값이 없을 때만 표시) */}
      {!showSuggestions &&
        inputValue.length === 0 &&
        suggestedTags.length > 0 && (
          <View style={themed($popularTagsContainer)}>
            <Text style={themed($popularTagsTitle)}>추천 주제</Text>
            <View style={themed($popularTagsGrid)}>
              {suggestedTags.slice(0, 6).map((tag, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => addTag(tag)}
                  style={themed($popularTagChip)}
                  disabled={
                    disabled || tags.includes(tag) || tags.length >= maxTags
                  }
                >
                  <Text
                    style={[
                      themed($popularTagText),
                      {
                        opacity:
                          tags.includes(tag) || tags.length >= maxTags
                            ? 0.5
                            : 1,
                      },
                    ]}
                  >
                    #{tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
    </View>
  );
}

// --- 스타일 정의 ---
const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginVertical: spacing.sm,
});

const $tagsContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.sm,
});

const $tagsContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.xs,
  gap: spacing.xs,
});

const $tagChip: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: colors.tint + "15",
  borderWidth: 1,
  borderColor: colors.tint + "30",
  borderRadius: 16,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  marginRight: spacing.xs,
});

const $tagText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  fontWeight: "600",
  color: colors.tint,
});

const $removeButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginLeft: spacing.xs,
  padding: 2,
});

const $inputContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 8,
  paddingHorizontal: spacing.sm,
  backgroundColor: colors.background,
});

const $textInput: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  flex: 1,
  fontSize: 14,
  color: colors.text,
  paddingVertical: spacing.sm,
});

const $addButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.xs,
});

const $infoRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: spacing.xs,
});

const $tagCount: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
  fontWeight: "500",
});

const $helpText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
});

const $suggestionsContainer: ThemedStyle<ViewStyle> = ({
  colors,
  spacing,
}) => ({
  marginTop: spacing.sm,
  padding: spacing.sm,
  backgroundColor: colors.backgroundAlt,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.border,
});

const $suggestionsTitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 12,
  fontWeight: "600",
  color: colors.text,
  marginBottom: spacing.xs,
});

const $suggestionsContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.xs,
});

const $suggestionChip: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 12,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
});

const $suggestionText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.text,
});

const $popularTagsContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.sm,
});

const $popularTagsTitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 12,
  fontWeight: "600",
  color: colors.text,
  marginBottom: spacing.sm,
});

const $popularTagsGrid: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.xs,
});

const $popularTagChip: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.backgroundAlt,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 12,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
});

const $popularTagText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
});
