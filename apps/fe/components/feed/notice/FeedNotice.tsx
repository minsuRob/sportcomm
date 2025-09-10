import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  TextInput,
  Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import AppDialog from "@/components/ui/AppDialog";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "@apollo/client";
import { GET_HIGHLIGHT_NOTICE, CREATE_NOTICE } from "@/lib/graphql/notices";
import { getSession, User } from "@/lib/auth";

/**
 * Feed 상단(or 특정 위치)에 표시할 닫기 가능한 공지 컴포넌트
 * - 닫기(X)를 누르면 AsyncStorage에 플래그를 저장하여 이후 재방문 시 숨김
 * - props.children 을 제공하면 기본 메시지 대신 렌더
 * - version(또는 storageKey 변경) 을 통해 강제 재노출 가능
 *
 * 예시 사용:
 * <FeedNotice defaultMessage="새 기능을 준비중입니다. 의견을 남겨주세요!" />
 */

export interface FeedNoticeProps {
  /** AsyncStorage Key (버전 변경 시 Suffix 조정) */
  storageKey?: string;
  /** 기본 문구 (children 지정 시 무시) */
  defaultMessage?: string;
  /** Ionicons 아이콘 이름 */
  iconName?: keyof typeof Ionicons.glyphMap;
  /** 강제로 항상 표시 (스토리지 무시) */
  forceShow?: boolean;
  /** 표시 비활성화 (조건부 렌더 외부 제어) */
  disabled?: boolean;
  /** 공지를 탭하면 상세(또는 공지 목록)으로 이동할지 여부 (기본 true) */
  navigateOnPress?: boolean;
  /** 닫기 후 콜백 */
  onDismiss?: () => void;
  /** 커스텀 접근성 라벨 */
  accessibilityLabel?: string;
  /** 테스트용 ID */
  testID?: string;
  /** 외부 스타일 확장 (컨테이너) */
  containerStyle?: Partial<ViewStyle>;
  /** 외부 스타일 확장 (내부 아이템) */
  contentStyle?: Partial<ViewStyle>;
  /** 텍스트 스타일 확장 */
  textStyle?: Partial<TextStyle>;
  /** children 전달 시 메시지 대체 */
  children?: React.ReactNode;
}

const DEFAULT_STORAGE_KEY = "feed_notice_hidden";

/**
 * 내부 표시 상태:
 * - checking: AsyncStorage 조회 전 -> null 렌더(깜빡임 방지)
 * - visible: 표시
 * - hidden: 숨김
 */
export const FeedNotice: React.FC<FeedNoticeProps> = ({
  storageKey = DEFAULT_STORAGE_KEY,
  defaultMessage = "[공지] 임시 안내: 새로운 커뮤니티 기능을 준비 중입니다. 의견을 남겨주세요!",
  iconName = "megaphone-outline",
  forceShow = false,
  disabled = false,
  navigateOnPress = true,
  onDismiss,
  accessibilityLabel = "피드 공지",
  testID = "feed-notice",
  containerStyle,
  contentStyle,
  textStyle,
  children,
}) => {
  const { themed, theme } = useAppTheme();
  const router = useRouter();
  const [checking, setChecking] = useState<boolean>(true);
  const [visible, setVisible] = useState<boolean>(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);

  // GraphQL: 강조 배너 공지 1건 (없으면 null)
  const {
    data: highlightData,
    loading: highlightLoading,
    error: highlightError,
    refetch: refetchHighlight,
  } = useQuery(GET_HIGHLIGHT_NOTICE, {
    fetchPolicy: "cache-first",
  });

  const bannerNotice = highlightData?.highlightNotice || null;

  // 관리자 전용: 공지 작성 모달 상태 및 입력값
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [nTitle, setNTitle] = useState<string>("");
  const [nContent, setNContent] = useState<string>("");
  const [nCategory, setNCategory] = useState<
    "GENERAL" | "FEATURE" | "EVENT" | "MAINTENANCE" | "POLICY"
  >("GENERAL");
  const [submitting, setSubmitting] = useState<boolean>(false);

  // 현재 사용자 세션 확인 (ADMIN 권한 체크)
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const { user } = await getSession();
        setCurrentUser(user);
      } catch (e) {
        console.warn("[FeedNotice] 세션 조회 실패", e);
      }
    })();
  }, []);

  const isAdmin = !!(currentUser?.role === "ADMIN" || currentUser?.isAdmin);

  // 공지 생성 Mutation 훅
  const [createNotice] = useMutation(CREATE_NOTICE);

  // 공지 생성 제출 핸들러
  const handleSubmitCreateNotice = useCallback(async () => {
    if (!nTitle.trim() || !nContent.trim()) {
      return;
    }
    setSubmitting(true);
    try {
      await createNotice({
        variables: {
          input: {
            title: nTitle.trim(),
            content: nContent.trim(),
            category: nCategory,
          },
        },
      });
      setShowCreateModal(false);
      setNTitle("");
      setNContent("");
      await refetchHighlight?.();
    } catch (e) {
      console.error("공지 생성 실패:", e);
    } finally {
      setSubmitting(false);
    }
  }, [nTitle, nContent, nCategory, createNotice, refetchHighlight]);

  /**
   * AsyncStorage에서 숨김 여부 로드
   * forceShow = true인 경우 무조건 표시
   */
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (disabled) {
        if (mounted) {
          setVisible(false);
          setChecking(false);
        }
        return;
      }
      if (forceShow) {
        if (mounted) {
          setVisible(true);
          setChecking(false);
        }
        return;
      }
      try {
        const flag = await AsyncStorage.getItem(storageKey);
        if (mounted) {
          setVisible(!flag); // flag 없으면 표시
        }
      } catch (e) {
        // 조회 실패 시: 사용자에게 정보 보여주는 것이 낫다고 판단하여 표시
        if (mounted) setVisible(true);
        console.warn("[FeedNotice] failed to read storage", e);
      } finally {
        if (mounted) setChecking(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [storageKey, forceShow, disabled]);

  /**
   * 닫기 버튼 클릭 핸들러
   */
  const handleClosePress = useCallback(() => {
    setShowConfirmDialog(true);
  }, []);

  /**
   * 닫기 확인 핸들러
   */
  const handleConfirmDismiss = useCallback(async () => {
    setShowConfirmDialog(false);
    setVisible(false);
    try {
      if (!forceShow) {
        await AsyncStorage.setItem(storageKey, "1");
      }
    } catch (e) {
      console.warn("[FeedNotice] failed to store dismiss flag", e);
    }
    onDismiss?.();
  }, [storageKey, forceShow, onDismiss]);

  /**
   * 취소 핸들러
   */
  const handleCancelDismiss = useCallback(() => {
    setShowConfirmDialog(false);
  }, []);

  /**
   * 공지 영역 클릭 → 상세 또는 목록 이동
   */
  const handlePressNotice = useCallback(() => {
    if (!navigateOnPress) return;
    if (bannerNotice) {
      router.push({
        pathname: "/(details)/notice/[noticeId]",
        params: { noticeId: bannerNotice.id },
      });
    } else {
      router.push("/(details)/notice");
    }
  }, [navigateOnPress, bannerNotice, router]);

  // 초기 조회 중이거나 표시 조건이 아니면 렌더하지 않음
  if (checking || !visible || disabled) return null;

  return (
    <View
      style={[themed($noticeContainer), containerStyle]}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      {isAdmin && (
        <View style={themed($adminBar)}>
          <TouchableOpacity
            onPress={() => setShowCreateModal(true)}
            style={themed($adminButton)}
            accessibilityLabel="공지 작성"
            accessibilityRole="button"
          >
            <Ionicons name="create" size={14} color={theme.colors.tint} />
            <Text style={themed($adminButtonText)}>공지 작성</Text>
          </TouchableOpacity>
        </View>
      )}
      <TouchableOpacity
        style={[themed($noticeItem), contentStyle]}
        activeOpacity={0.85}
        onPress={handlePressNotice}
        accessibilityRole="button"
        accessibilityLabel="공지 상세 보기로 이동"
      >
        <Ionicons name={iconName} size={16} color={theme.colors.tint} />
        <Text
          style={[themed($noticeText), textStyle]}
          numberOfLines={2}
          accessibilityRole="text"
        >
          {children ||
            (highlightLoading
              ? "공지 로딩 중..."
              : bannerNotice
                ? bannerNotice.title
                : highlightError
                  ? defaultMessage
                  : defaultMessage)}
        </Text>
        <TouchableOpacity
          onPress={(e: any) => {
            e?.stopPropagation?.();
            handleClosePress();
          }}
          style={themed($noticeCloseButton)}
          accessibilityLabel="공지 닫기"
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={16} color={theme.colors.textDim} />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* 공지 닫기 확인 다이얼로그 */}
      <AppDialog
        visible={showConfirmDialog}
        onClose={handleCancelDismiss}
        title="공지 닫기"
        description="이 공지를 닫으시겠습니까? 다시 표시되지 않습니다."
        confirmText="닫기"
        cancelText="취소"
        onConfirm={handleConfirmDismiss}
      />
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={themed($modalBackdrop)}>
          <View style={themed($modalSheet)}>
            <View style={themed($modalHeader)}>
              <TouchableOpacity
                onPress={() => setShowCreateModal(false)}
                style={themed($modalIconButton)}
                accessibilityLabel="닫기"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={20} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={themed($modalTitle)}>공지 작성</Text>
              <TouchableOpacity
                onPress={handleSubmitCreateNotice}
                disabled={submitting || !nTitle.trim() || !nContent.trim()}
                style={[
                  themed($publishButtonSm),
                  {
                    opacity:
                      submitting || !nTitle.trim() || !nContent.trim()
                        ? 0.5
                        : 1,
                  },
                ]}
              >
                <Ionicons name="paper-plane" size={16} color="white" />
                <Text style={themed($publishButtonSmText)}>
                  {submitting ? "게시 중..." : "게시"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={themed($modalBody)}>
              <Text style={themed($label)}>카테고리</Text>
              <View style={themed($categoryRow)}>
                {(
                  [
                    "GENERAL",
                    "FEATURE",
                    "EVENT",
                    "MAINTENANCE",
                    "POLICY",
                  ] as const
                ).map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      themed($categoryPill),
                      nCategory === cat && themed($categoryPillActive),
                    ]}
                    onPress={() => setNCategory(cat)}
                  >
                    <Text style={themed($categoryPillText)}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={themed($label)}>제목</Text>
              <TextInput
                style={themed($input)}
                placeholder="공지 제목"
                placeholderTextColor={theme.colors.textDim}
                value={nTitle}
                onChangeText={setNTitle}
                editable={!submitting}
              />

              <Text style={themed($label)}>내용</Text>
              <TextInput
                style={[themed($input), themed($textarea)]}
                placeholder="공지 내용을 입력하세요"
                placeholderTextColor={theme.colors.textDim}
                value={nContent}
                onChangeText={setNContent}
                multiline
                textAlignVertical="top"
                editable={!submitting}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// -------- 스타일 정의 --------
const $noticeContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.backgroundAlt,
  borderBottomColor: colors.border,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.xs,
});

const $noticeItem: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
  justifyContent: "center",
  minHeight: 32,
});

const $noticeText: ThemedStyle<TextStyle> = ({ colors }) => ({
  flex: 1,
  color: colors.textDim,
  fontSize: 13,
  fontWeight: "600",
});

const $noticeCloseButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  width: 28,
  height: 28,
  borderRadius: 14,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: colors.background,
  marginLeft: spacing.xs,
});

// 관리자 전용 버튼 / 모달 스타일
const $adminBar: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "flex-end",
  paddingBottom: spacing.xs,
});

const $adminButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderWidth: 1,
  borderColor: colors.tint,
  borderRadius: 16,
  backgroundColor: colors.tint + "10",
  gap: spacing.xxxs,
});

const $adminButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  fontWeight: "600",
  color: colors.tint,
});

// 모달
const $modalBackdrop: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.4)",
  justifyContent: "flex-end",
});

const $modalSheet: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  borderTopLeftRadius: 16,
  borderTopRightRadius: 16,
  paddingBottom: spacing.lg,
});

const $modalHeader: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: spacing.md,
  paddingTop: spacing.md,
  paddingBottom: spacing.sm,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $modalTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  fontWeight: "700",
  color: colors.text,
});

const $modalIconButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.xs,
});

const $publishButtonSm: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: colors.tint,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.xs,
  borderRadius: 16,
  gap: spacing.xxxs,
});

const $publishButtonSmText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 13,
  fontWeight: "600",
  marginLeft: 4,
});

const $modalBody: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
  gap: spacing.sm,
});

const $label: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 13,
  fontWeight: "600",
  color: colors.textDim,
});

const $input: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 14,
  color: colors.text,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 8,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  backgroundColor: colors.background,
});

const $textarea: ThemedStyle<TextStyle> = () => ({
  minHeight: 140,
  textAlignVertical: "top",
});

const $categoryRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.xs,
});

const $categoryPill: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 999,
  backgroundColor: colors.backgroundAlt,
});

const $categoryPillActive: ThemedStyle<ViewStyle> = ({ colors }) => ({
  borderColor: colors.tint,
  backgroundColor: colors.tint + "15",
});

const $categoryPillText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  fontWeight: "600",
  color: colors.text,
});

// 기본 내보내기
export default FeedNotice;

/**
 * 변경 요약 (GraphQL 전환):
 * - 목업 NOTICE_MOCKS 제거, highlightNotice GraphQL Query 연동
 * - 로딩/에러 상태 최소 처리 (로딩 시 텍스트, 에러 시 기본 메시지)
 * - 기존 dismiss 로직 및 네비게이션 동작 유지
 */
