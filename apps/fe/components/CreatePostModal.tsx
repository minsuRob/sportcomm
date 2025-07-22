import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ViewStyle,
  TextStyle,
  Alert,
} from "react-native";
import { X, Send, Image, Camera, Mic, Hash } from "lucide-react-native";
import { useMutation } from "urql";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { useTranslation, TRANSLATION_KEYS } from "@/lib/i18n/useTranslation";
import { CREATE_POST } from "@/lib/graphql";
import { PostType } from "./PostCard";
import { User } from "@/lib/auth";

// --- 타입 정의 ---
interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  currentUser: User | null;
  onPostCreated?: () => void;
}

interface PostTypeOption {
  type: PostType;
  label: string;
  color: string;
  icon: string;
}

/**
 * 글 작성 모달 컴포넌트
 * 확장 가능한 텍스트 에디터와 게시물 타입 선택 기능을 제공합니다
 */
export default function CreatePostModal({
  visible,
  onClose,
  currentUser,
  onPostCreated,
}: CreatePostModalProps) {
  const { themed, theme } = useAppTheme();
  const { t } = useTranslation();

  // 상태 관리
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedType, setSelectedType] = useState<PostType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // GraphQL 뮤테이션
  const [, executeCreatePost] = useMutation(CREATE_POST);

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

  /**
   * 모달 닫기 핸들러
   */
  const handleClose = () => {
    if (isSubmitting) return;

    // 내용이 있으면 확인 후 닫기
    if (title.trim() || content.trim() || selectedType) {
      Alert.alert(
        "작성 취소",
        "작성 중인 내용이 있습니다. 정말 취소하시겠습니까?",
        [
          { text: "계속 작성", style: "cancel" },
          {
            text: "취소",
            style: "destructive",
            onPress: () => {
              resetForm();
              onClose();
            },
          },
        ]
      );
    } else {
      onClose();
    }
  };

  /**
   * 폼 초기화
   */
  const resetForm = () => {
    setTitle("");
    setContent("");
    setSelectedType(null);
    setIsSubmitting(false);
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
    if (!currentUser) {
      Alert.alert("오류", "로그인이 필요합니다.");
      return;
    }

    if (!title.trim()) {
      Alert.alert("오류", "제목을 입력해주세요.");
      return;
    }

    if (!content.trim()) {
      Alert.alert("오류", t(TRANSLATION_KEYS.CREATE_POST_PLACEHOLDER));
      return;
    }

    if (!selectedType) {
      Alert.alert("오류", t(TRANSLATION_KEYS.CREATE_POST_SELECT_TYPE));
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await executeCreatePost({
        input: {
          title: title.trim(),
          content: content.trim(),
          type: selectedType,
        },
      });

      if (result.error) {
        console.error("게시물 작성 실패:", result.error);
        Alert.alert("오류", "게시물 작성에 실패했습니다.");
        return;
      }

      // 성공
      Alert.alert("성공", "게시물이 작성되었습니다!");
      resetForm();
      onClose();
      onPostCreated?.();
    } catch (error) {
      console.error("게시물 작성 오류:", error);
      Alert.alert("오류", "게시물 작성 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentUser) {
    return null;
  }

  const avatarUrl =
    currentUser.profileImageUrl ||
    `https://i.pravatar.cc/150?u=${currentUser.id}`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={themed($container)}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* 헤더 */}
        <View style={themed($header)}>
          <TouchableOpacity onPress={handleClose} style={themed($closeButton)}>
            <X color={theme.colors.text} size={24} />
          </TouchableOpacity>
          <Text style={themed($headerTitle)}>
            {t(TRANSLATION_KEYS.CREATE_POST_TITLE)}
          </Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={
              !title.trim() || !content.trim() || !selectedType || isSubmitting
            }
            style={[
              themed($publishButton),
              {
                opacity:
                  !title.trim() ||
                  !content.trim() ||
                  !selectedType ||
                  isSubmitting
                    ? 0.5
                    : 1,
              },
            ]}
          >
            <Text style={themed($publishButtonText)}>
              {isSubmitting
                ? t(TRANSLATION_KEYS.CREATE_POST_PUBLISHING)
                : t(TRANSLATION_KEYS.CREATE_POST_PUBLISH)}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={themed($scrollContainer)}
          showsVerticalScrollIndicator={false}
        >
          {/* 사용자 정보 */}
          <View style={themed($userSection)}>
            <View style={themed($userInfo)}>
              <Text style={themed($username)}>{currentUser.nickname}</Text>
              <Text style={themed($userHandle)}>
                @{currentUser.nickname.toLowerCase()}
              </Text>
            </View>
          </View>

          {/* 게시물 타입 선택 */}
          <View style={themed($typeSection)}>
            <Text style={themed($sectionTitle)}>
              {t(TRANSLATION_KEYS.CREATE_POST_SELECT_TYPE)}
            </Text>
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
            <TextInput
              style={themed($titleInput)}
              placeholder="제목을 입력하세요"
              placeholderTextColor={theme.colors.textDim}
              value={title}
              onChangeText={setTitle}
              maxLength={200}
              editable={!isSubmitting}
            />
          </View>

          {/* 텍스트 입력 영역 */}
          <View style={themed($contentSection)}>
            <TextInput
              style={themed($textInput)}
              placeholder={t(TRANSLATION_KEYS.CREATE_POST_PLACEHOLDER)}
              placeholderTextColor={theme.colors.textDim}
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
              maxLength={2000}
              editable={!isSubmitting}
            />
            <View style={themed($characterCount)}>
              <Text style={themed($characterCountText)}>
                {content.length}/2000
              </Text>
            </View>
          </View>

          {/* 미디어 옵션 (향후 확장용) */}
          <View style={themed($mediaSection)}>
            <TouchableOpacity style={themed($mediaButton)} disabled>
              <Image color={theme.colors.textDim} size={24} />
            </TouchableOpacity>
            <TouchableOpacity style={themed($mediaButton)} disabled>
              <Camera color={theme.colors.textDim} size={24} />
            </TouchableOpacity>
            <TouchableOpacity style={themed($mediaButton)} disabled>
              <Mic color={theme.colors.textDim} size={24} />
            </TouchableOpacity>
            <TouchableOpacity style={themed($mediaButton)} disabled>
              <Hash color={theme.colors.textDim} size={24} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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

const $publishButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.tint,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderRadius: 20,
});

const $publishButtonText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 16,
  fontWeight: "600",
});

const $scrollContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $userSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
});

const $userInfo: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "column",
});

const $username: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  fontWeight: "bold",
  color: colors.text,
});

const $userHandle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 14,
  color: colors.textDim,
  marginTop: spacing.xxxs,
});

const $typeSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
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

const $contentSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
});

const $textInput: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 18,
  color: colors.text,
  minHeight: 200,
  textAlignVertical: "top",
  paddingVertical: spacing.sm,
});

const $characterCount: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "flex-end",
  marginTop: spacing.sm,
});

const $characterCountText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
});

const $mediaSection: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.lg,
  borderTopWidth: 1,
  borderTopColor: colors.border,
  gap: spacing.lg,
});

const $mediaButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.sm,
  opacity: 0.5, // 비활성화 상태
});

const $titleSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
});

const $titleInput: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 20,
  fontWeight: "600",
  color: colors.text,
  paddingVertical: spacing.sm,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});
