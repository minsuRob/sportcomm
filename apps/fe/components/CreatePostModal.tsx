import React, { useState } from "react";
import {
  View,
  Modal,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ViewStyle,
  TextStyle,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@apollo/client";
import { showToast } from "@/components/CustomToast";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";

import { CREATE_POST } from "@/lib/graphql";
import { PostType } from "./PostCard";

// 미디어 아이템 타입
interface MediaItem {
  id: string;
  url: string;
  type: "image" | "video" | "audio";
}

// 게시물 타입 옵션
interface PostTypeOption {
  value: PostType;
  label: string;
  icon: React.ReactNode;
}

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * 게시물 작성 모달 컴포넌트
 * 사용자가 새 게시물을 작성할 수 있는 모달 폼을 제공합니다
 */
export default function CreatePostModal({
  visible,
  onClose,
  onSuccess,
}: CreatePostModalProps) {
  // 상태 관리
  const { themed, theme } = useAppTheme();
  const [content, setContent] = useState("");
  const [selectedType, setSelectedType] = useState<PostType | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // GraphQL 뮤테이션
  const [executeCreatePost] = useMutation(CREATE_POST);

  // 게시물 타입 옵션
  const postTypeOptions: PostTypeOption[] = [
    {
      value: PostType.ANALYSIS,
      label: "분석",
      icon: <Ionicons name="analytics" color={theme.colors.text} size={20} />,
    },
    {
      value: PostType.HIGHLIGHT,
      label: "하이라이트",
      icon: <Ionicons name="image" color={theme.colors.text} size={20} />,
    },
    {
      value: PostType.CHEERING,
      label: "응원",
      icon: <Ionicons name="megaphone" color={theme.colors.text} size={20} />,
    },
  ];

  /**
   * 닫기 확인 핸들러
   */
  const handleCloseConfirm = () => {
    if (content.trim() || selectedMedia) {
      Alert.alert(
        "작성 취소",
        "작성 중인 게시물이 있습니다. 작성을 취소하시겠습니까?",
        [
          {
            text: "계속 작성",
            style: "cancel",
          },
          {
            text: "작성 취소",
            style: "destructive",
            onPress: () => {
              setContent("");
              setSelectedMedia(null);
              setSelectedType(null);
              onClose();
            },
          },
        ],
        { cancelable: true },
      );
    } else {
      onClose();
    }
  };

  /**
   * 게시물 타입 선택 핸들러
   */
  const handleTypeSelect = (type: PostType) => {
    setSelectedType(selectedType === type ? null : type);
  };

  /**
   * 게시물 작성 핸들러
   */
  const handleSubmit = async () => {
    if (!content.trim()) {
      showToast({
        type: "error",
        title: "내용 필요",
        message: "게시물 내용을 입력해주세요",
        duration: 3000,
      });
      return;
    }

    if (!selectedType) {
      showToast({
        type: "error",
        title: "타입 선택 필요",
        message: "게시물 타입을 선택해주세요",
        duration: 3000,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { errors } = await executeCreatePost({
        variables: {
          input: {
            content: content.trim(),
            type: selectedType,
            // 이미지가 있으면 포함
            ...(selectedMedia && { mediaUrls: [selectedMedia.url] }),
          },
        },
      });

      if (errors) {
        throw new Error(errors[0].message);
      }

      showToast({
        type: "success",
        title: "게시물 작성 완료",
        message: "게시물이 성공적으로 작성되었습니다",
        duration: 3000,
      });

      // 성공 후 초기화 및 닫기
      setContent("");
      setSelectedMedia(null);
      setSelectedType(null);
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("게시물 작성 실패:", error);
      showToast({
        type: "error",
        title: "게시물 작성 실패",
        message:
          error instanceof Error
            ? error.message
            : "알 수 없는 오류가 발생했습니다",
        duration: 3000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleCloseConfirm}
    >
      <View style={themed($container)}>
        {/* 헤더 */}
        <View style={themed($header)}>
          <TouchableOpacity onPress={handleCloseConfirm}>
            <Ionicons name="close" color={theme.colors.text} size={24} />
          </TouchableOpacity>
          <Text style={themed($headerTitle)}>새 게시물 작성</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting || !content.trim() || !selectedType}
            style={[
              themed($submitButton),
              {
                opacity:
                  isSubmitting || !content.trim() || !selectedType ? 0.5 : 1,
              },
            ]}
          >
            <Ionicons name="send" color="#fff" size={20} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={themed($scrollView)}
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* 게시물 내용 입력 */}
            <TextInput
              style={themed($contentInput)}
              placeholder="무슨 생각을 하고 계신가요?"
              placeholderTextColor={theme.colors.textDim}
              value={content}
              onChangeText={setContent}
              multiline
              maxLength={500}
              editable={!isSubmitting}
            />

            {/* 게시물 타입 선택 */}
            <View style={themed($typeSelector)}>
              <Text style={themed($sectionTitle)}>게시물 타입</Text>
              <View style={themed($typeOptions)}>
                {postTypeOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      themed($typeOption),
                      selectedType === option.value &&
                        themed($selectedTypeOption),
                    ]}
                    onPress={() => handleTypeSelect(option.value)}
                  >
                    {option.icon}
                    <Text
                      style={[
                        themed($typeLabel),
                        selectedType === option.value &&
                          themed($selectedTypeLabel),
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// --- 스타일 정의 ---
const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
});

const $header: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  padding: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $headerTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
  fontWeight: "600",
  color: colors.text,
});

const $submitButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.tint,
  padding: spacing.sm,
  borderRadius: 8,
});

const $scrollView: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  padding: spacing.md,
});

const $contentInput: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  fontSize: 16,
  lineHeight: 24,
  minHeight: 120,
  textAlignVertical: "top",
});

const $typeSelector: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.lg,
});

const $sectionTitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 16,
  fontWeight: "600",
  color: colors.text,
  marginBottom: spacing.sm,
});

const $typeOptions: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  marginHorizontal: -spacing.xs,
});

const $typeOption: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: colors.separator,
  paddingVertical: spacing.xs,
  paddingHorizontal: spacing.sm,
  borderRadius: 16,
  marginHorizontal: spacing.xs,
  marginBottom: spacing.sm,
});

const $selectedTypeOption: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tint,
});

const $typeLabel: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.text,
  marginLeft: spacing.xs,
  fontSize: 14,
});

const $selectedTypeLabel: ThemedStyle<TextStyle> = () => ({
  color: "white",
});
