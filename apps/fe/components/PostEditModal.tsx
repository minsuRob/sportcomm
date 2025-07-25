import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ViewStyle,
  TextStyle,
  Alert,
} from "react-native";
import { X, Save } from "lucide-react-native";
import { useMutation } from "@apollo/client";
import { showToast } from "@/components/CustomToast";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { useTranslation, TRANSLATION_KEYS } from "@/lib/i18n/useTranslation";
import { UPDATE_POST } from "@/lib/graphql";
import { PostType } from "@/components/shared/PostHeader";

// --- 타입 정의 ---
interface PostTypeOption {
  type: PostType;
  label: string;
  color: string;
  icon: string;
}

interface PostEditModalProps {
  visible: boolean;
  onClose: () => void;
  post: {
    id: string;
    title?: string;
    content: string;
    type: PostType;
  };
  onPostUpdated?: (updatedPost: any) => void;
}

/**
 * 게시물 수정 모달 컴포넌트
 */
export default function PostEditModal({
  visible,
  onClose,
  post,
  onPostUpdated,
}: PostEditModalProps) {
  const { themed, theme } = useAppTheme();
  const { t } = useTranslation();

  // 상태 관리
  const [title, setTitle] = useState(post.title || "");
  const [content, setContent] = useState(post.content);
  const [selectedType, setSelectedType] = useState<PostType>(post.type);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // GraphQL 뮤테이션
  const [executeUpdatePost] = useMutation(UPDATE_POST);

  // 게시물 타입 옵션
  const postTypeOptions: PostTypeOption[] = [
    {
      type: PostType.ANALYSIS,
      label: t(TRANSLATION_KEYS.POST_TYPE_ANALYSIS),
      color: "#6366f1",
      icon: "📊",
    },
    {
      type: PostType.HIGHLIGHT,
      label: t(TRANSLATION_KEYS.POST_TYPE_HIGHLIGHT),
      color: "#f59e0b",
      icon: "⭐",
    },
    {
      type: PostType.CHEERING,
      label: t(TRANSLATION_KEYS.POST_TYPE_CHEERING),
      color: "#10b981",
      icon: "📣",
    },
  ];

  // 모달이 열릴 때마다 초기 데이터로 리셋
  useEffect(() => {
    if (visible) {
      setTitle(post.title || "");
      setContent(post.content);
      setSelectedType(post.type);
    }
  }, [visible, post]);

  /**
   * 변경사항이 있는지 확인
   */
  const hasChanges = () => {
    return (
      title.trim() !== (post.title || "").trim() ||
      content.trim() !== post.content.trim() ||
      selectedType !== post.type
    );
  };

  /**
   * 모달 닫기 핸들러
   */
  const handleClose = () => {
    if (hasChanges()) {
      Alert.alert("수정 취소", "변경사항이 있습니다. 정말 취소하시겠습니까?", [
        { text: "계속 수정", style: "cancel" },
        {
          text: "취소",
          style: "destructive",
          onPress: () => onClose(),
        },
      ]);
    } else {
      onClose();
    }
  };

  /**
   * 게시물 타입 선택 핸들러
   */
  const handleTypeSelect = (type: PostType) => {
    setSelectedType(selectedType === type ? post.type : type);
  };

  /**
   * 게시물 수정 제출 핸들러
   */
  const handleSubmit = async () => {
    if (!title.trim()) {
      showToast({
        type: "error",
        title: "제목 필요",
        message: "제목을 입력해주세요.",
        duration: 3000,
      });
      return;
    }

    if (!content.trim()) {
      showToast({
        type: "error",
        title: "내용 필요",
        message: "내용을 입력해주세요.",
        duration: 3000,
      });
      return;
    }

    if (!hasChanges()) {
      showToast({
        type: "info",
        title: "변경사항 없음",
        message: "수정할 내용이 없습니다.",
        duration: 2000,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await executeUpdatePost({
        variables: {
          input: {
            id: post.id,
            title: title.trim(),
            content: content.trim(),
            type: selectedType,
          },
        },
      });

      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      showToast({
        type: "success",
        title: "수정 완료",
        message: "게시물이 성공적으로 수정되었습니다!",
        duration: 3000,
      });

      // 부모 컴포넌트에 수정된 게시물 정보 전달
      if (onPostUpdated && result.data?.updatePost) {
        onPostUpdated(result.data.updatePost);
      }

      onClose();
    } catch (error) {
      console.error("게시물 수정 오류:", error);

      let errorMessage = "게시물 수정 중 예상치 못한 오류가 발생했습니다.";

      if (error instanceof Error) {
        errorMessage = error.message;
      }

      showToast({
        type: "error",
        title: "수정 실패",
        message: errorMessage,
        duration: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <KeyboardAvoidingView
      style={themed($modalOverlay)}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={themed($modalContent)}>
        {/* 헤더 */}
        <View style={themed($header)}>
          <TouchableOpacity onPress={handleClose} style={themed($closeButton)}>
            <X color={theme.colors.text} size={24} />
          </TouchableOpacity>
          <Text style={themed($headerTitle)}>게시물 수정</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!hasChanges() || isSubmitting}
            style={[
              themed($saveButton),
              {
                opacity: !hasChanges() || isSubmitting ? 0.5 : 1,
              },
            ]}
          >
            <Save color="white" size={20} />
            <Text style={themed($saveButtonText)}>
              {isSubmitting ? "저장 중..." : "저장"}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={themed($scrollContainer)}
          showsVerticalScrollIndicator={false}
        >
          {/* 게시물 타입 선택 */}
          <View style={themed($typeSection)}>
            <Text style={themed($sectionTitle)}>게시물 유형</Text>
            <View style={themed($typeOptions)}>
              {postTypeOptions.map((option) => (
                <TouchableOpacity
                  key={option.type}
                  style={[
                    themed($typeOption),
                    {
                      borderColor:
                        selectedType === option.type
                          ? option.color
                          : theme.colors.border,
                      backgroundColor:
                        selectedType === option.type
                          ? option.color + "20"
                          : "transparent",
                    },
                  ]}
                  onPress={() => handleTypeSelect(option.type)}
                >
                  <Text style={themed($typeIcon)}>{option.icon}</Text>
                  <Text
                    style={[
                      themed($typeLabel),
                      {
                        color:
                          selectedType === option.type
                            ? option.color
                            : theme.colors.text,
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 제목 입력 영역 */}
          <View style={themed($titleSection)}>
            <Text style={themed($sectionTitle)}>제목</Text>
            <TextInput
              style={themed($titleInput)}
              placeholder="게시물 제목을 입력하세요"
              placeholderTextColor={theme.colors.textDim}
              value={title}
              onChangeText={setTitle}
              maxLength={200}
              editable={!isSubmitting}
            />
            <View style={themed($characterCount)}>
              <Text style={themed($characterCountText)}>
                {title.length}/200
              </Text>
            </View>
          </View>

          {/* 내용 입력 영역 */}
          <View style={themed($contentSection)}>
            <Text style={themed($sectionTitle)}>내용</Text>
            <TextInput
              style={themed($textInput)}
              placeholder="게시물 내용을 입력하세요"
              placeholderTextColor={theme.colors.textDim}
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
              maxLength={10000}
              editable={!isSubmitting}
            />
            <View style={themed($characterCount)}>
              <Text style={themed($characterCountText)}>
                {content.length}/10000
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

// --- 스타일 정의 ---
const $modalOverlay: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  justifyContent: "center",
  alignItems: "center",
});

const $modalContent: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.background,
  borderRadius: 20,
  width: "90%",
  maxHeight: "80%",
});

const $header: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $closeButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.xs,
});

const $headerTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
  fontWeight: "bold",
  color: colors.text,
});

const $saveButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: colors.tint,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderRadius: 20,
  gap: spacing.xs,
});

const $saveButtonText: ThemedStyle<TextStyle> = ({ spacing }) => ({
  color: "white",
  fontSize: 14,
  fontWeight: "600",
  marginLeft: spacing.xs,
});

const $scrollContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $typeSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
});

const $sectionTitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 16,
  fontWeight: "600",
  color: colors.text,
  marginBottom: spacing.sm,
});

const $typeOptions: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.sm,
});

const $typeOption: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.sm,
  borderWidth: 2,
  borderRadius: 12,
});

const $typeIcon: ThemedStyle<TextStyle> = ({ spacing }) => ({
  fontSize: 20,
  marginRight: spacing.xs,
});

const $typeLabel: ThemedStyle<TextStyle> = () => ({
  fontSize: 14,
  fontWeight: "600",
});

const $titleSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
});

const $titleInput: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 16,
  color: colors.text,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 8,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  backgroundColor: colors.background,
});

const $contentSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
});

const $textInput: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 16,
  color: colors.text,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 8,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  minHeight: 200,
  textAlignVertical: "top",
  backgroundColor: colors.background,
});

const $characterCount: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "flex-end",
  marginTop: spacing.sm,
});

const $characterCountText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
});
