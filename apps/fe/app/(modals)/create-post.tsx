import React, { useState } from "react";
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
import { useRouter } from "expo-router";
import { ArrowLeft, Send } from "lucide-react-native";
import { useMutation } from "urql";
import { showToast } from "@/components/CustomToast";
import Toast from "react-native-toast-message";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { useTranslation, TRANSLATION_KEYS } from "@/lib/i18n/useTranslation";
import { CREATE_POST } from "@/lib/graphql";
import { PostType } from "@/components/PostCard";
import { User, getSession } from "@/lib/auth";

// --- 타입 정의 ---
interface PostTypeOption {
  type: PostType;
  label: string;
  color: string;
  icon: string;
}

/**
 * 게시물 작성 페이지
 */
export default function CreatePostScreen() {
  const router = useRouter();
  const { themed, theme } = useAppTheme();
  const { t } = useTranslation();

  // 상태 관리
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedType, setSelectedType] = useState<PostType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // GraphQL 뮤테이션
  const [, executeCreatePost] = useMutation(CREATE_POST);

  // 사용자 세션 확인
  React.useEffect(() => {
    const checkSession = async () => {
      const { user } = await getSession();
      if (user) {
        setCurrentUser(user);
      } else {
        // 로그인되지 않은 경우 피드로 리다이렉트
        Alert.alert("로그인 필요", "게시물을 작성하려면 로그인이 필요합니다.", [
          { text: "확인", onPress: () => router.back() },
        ]);
      }
    };
    checkSession();
  }, [router]);

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
   * 뒤로 가기 핸들러
   */
  const handleGoBack = () => {
    if (title.trim() || content.trim() || selectedType) {
      Alert.alert(
        "작성 취소",
        "작성 중인 내용이 있습니다. 정말 취소하시겠습니까?",
        [
          { text: "계속 작성", style: "cancel" },
          {
            text: "취소",
            style: "destructive",
            onPress: () => router.back(),
          },
        ]
      );
    } else {
      router.back();
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
    if (!currentUser) {
      showToast({
        type: "error",
        title: "로그인 필요",
        message: "로그인이 필요합니다.",
        duration: 3000,
      });
      return;
    }

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
        message: t(TRANSLATION_KEYS.CREATE_POST_PLACEHOLDER),
        duration: 3000,
      });
      return;
    }

    if (!selectedType) {
      showToast({
        type: "error",
        title: "타입 선택 필요",
        message: t(TRANSLATION_KEYS.CREATE_POST_SELECT_TYPE),
        duration: 3000,
      });
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
        // GraphQL 에러에서 originalError 정보 추출
        const graphQLError = result.error.graphQLErrors[0];
        if (graphQLError?.extensions?.originalError) {
          const { message, error, statusCode } = graphQLError.extensions
            .originalError as {
            message: string;
            error: string;
            statusCode: number;
          };

          showToast({
            type: "error",
            title: "게시물 작성 실패",
            message: `${message} [${statusCode}: ${error}]`,
            duration: 5000,
          });
        } else {
          const errorMessage =
            graphQLError?.message || "게시물 작성에 실패했습니다.";
          showToast({
            type: "error",
            title: "게시물 작성 실패",
            message: errorMessage,
            duration: 4000,
          });
        }
        return;
      }

      // 성공
      showToast({
        type: "success",
        title: "게시물 작성 완료",
        message: "게시물이 성공적으로 작성되었습니다!",
        duration: 3000,
      });

      // 피드로 돌아가기
      router.back();
    } catch (error) {
      showToast({
        type: "error",
        title: "게시물 작성 오류",
        message: "게시물 작성 중 예상치 못한 오류가 발생했습니다.",
        duration: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentUser) {
    return null; // 로딩 중이거나 리다이렉트 중
  }

  return (
    <KeyboardAvoidingView
      style={themed($container)}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* 헤더 */}
      <View style={themed($header)}>
        <TouchableOpacity onPress={handleGoBack} style={themed($backButton)}>
          <ArrowLeft color={theme.colors.text} size={24} />
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
          <Send color="white" size={20} />
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
          <Text style={themed($username)}>{currentUser.nickname}</Text>
          <Text style={themed($userHandle)}>
            @{currentUser.nickname.toLowerCase()}
          </Text>
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
            <Text style={themed($characterCountText)}>{title.length}/200</Text>
          </View>
        </View>

        {/* 내용 입력 영역 */}
        <View style={themed($contentSection)}>
          <Text style={themed($sectionTitle)}>내용</Text>
          <TextInput
            style={themed($textInput)}
            placeholder={t(TRANSLATION_KEYS.CREATE_POST_PLACEHOLDER)}
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
    </KeyboardAvoidingView>
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
  backgroundColor: colors.background,
});

const $backButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.xs,
});

const $headerTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
  fontWeight: "bold",
  color: colors.text,
});

const $publishButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: colors.tint,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderRadius: 20,
  gap: spacing.xs,
});

const $publishButtonText: ThemedStyle<TextStyle> = ({ spacing }) => ({
  color: "white",
  fontSize: 14,
  fontWeight: "600",
  marginLeft: spacing.xs,
});

const $scrollContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $userSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: "#f0f0f0",
});

const $username: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
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
