import React, { useCallback } from "react";
import {
  Modal,
  View,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  ViewStyle,
  Pressable,
  AccessibilityInfo,
} from "react-native";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { PostDetailContent } from "./PostDetailContent";
import { isWeb } from "@/lib/platform";

/**
 * PostDetailModal
 * 하단에서 슬라이드되어 나타나는 게시물 상세 모달 컴포넌트
 * - 별도의 페이지 전환 없이 빠른 상세 확인 경험 제공
 * - 재사용 가능한 PostDetailContent 를 내부에 포함
 *
 * 확장 아이디어:
 * 1) Gesture(드래그 다운) 지원 - react-native-gesture-handler + reanimated
 * 2) Context Provider 도입으로 여러 PostCard 가 하나의 모달 공유
 * 3) URL 쿼리 (?modal=1) 와 동기화하여 웹 환경에서 히스토리 관리
 */
export interface PostDetailModalProps {
  visible: boolean; // 모달 표시 여부
  postId: string; // 대상 게시물 ID
  onClose: () => void; // 닫기 콜백
  onPostUpdated?: () => Promise<void> | void; // 게시물 수정/댓글 후 상위 통지
  enableBackdropPress?: boolean; // 오버레이 터치 닫기 활성화 여부
  testID?: string; // 테스트 식별자
  /**
   * 피드(목록)에서 이미 가져온 게시물 요약 데이터
   * - 느린 상세 쿼리 로딩 전에 낙관적(프리) 렌더를 위해 사용
   * - teamId 필드 추가 (PostDetailContent initialPost 스키마와 동기화)
   */
  initialPost?: {
    id: string;
    title?: string;
    content: string;
    author?: { id: string; nickname: string; profileImageUrl?: string };
    createdAt?: string;
    teamId?: string;
    likeCount?: number;
    commentCount?: number;
    viewCount?: number;
    isLiked?: boolean;
    isBookmarked?: boolean;
    media?: Array<{ id: string; url: string; type: "image" | "video" }>;
    tags?: Array<{ id: string; name: string; color?: string }>;
  };
}

export const PostDetailModal: React.FC<PostDetailModalProps> = ({
  visible,
  postId,
  onClose,
  onPostUpdated,
  enableBackdropPress = true,
  testID = "post-detail-modal",
  initialPost, // 아직 내부 PostDetailContent 에 직접 전달되지는 않음 (후속 구현에서 활용)
}) => {
  const { themed } = useAppTheme();

  /**
   * 백드롭(오버레이) 터치 시 닫기
   * - 접근성 고려: modal 이 열렸을 때는 스크린 리더에게 주요 영역 안내 가능
   */
  const handleBackdropPress = useCallback(() => {
    if (!enableBackdropPress) return;
    onClose();
    // 스크린 리더 사용자에게 닫혔음을 간단히 알림 (필요 시 문구 지역화)
    AccessibilityInfo.announceForAccessibility?.("게시물 상세 닫힘");
  }, [enableBackdropPress, onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={themed($overlay)} testID={testID}>
        {/* 백드롭 터치 영역 */}
        <TouchableWithoutFeedback
          onPress={handleBackdropPress}
          disabled={!enableBackdropPress}
        >
          <View style={themed($backdropTouchable)} />
        </TouchableWithoutFeedback>

        <KeyboardAvoidingView
          style={themed($sheetWrapper)}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable
            style={themed($sheet)}
            accessibilityHint="게시물 상세 모달"
          >
            {/* 상단 드래그 핸들 (시각적 힌트) */}
            <View style={themed($handleWrapper)}>
              <View style={themed($handle)} />
            </View>

            {/* 실제 상세 컨텐츠 (모달 variant) */}
            <PostDetailContent
              postId={postId}
              variant="modal"
              onClose={onClose}
              onPostUpdated={onPostUpdated}
              initialPost={initialPost}
            />
          </Pressable>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

/* ================= 스타일 정의 ================= */

const $overlay: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.55)",
  justifyContent: "flex-end",
});

const $backdropTouchable: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $sheetWrapper: ThemedStyle<ViewStyle> = () => ({
  width: "100%",
  alignSelf: "stretch",
  maxHeight: "85%",
  minHeight: "85%",
  flexShrink: 0,
});

const $sheet: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.background,
  borderTopLeftRadius: 28,
  borderTopRightRadius: 28,
  flex: 1, // 래퍼($sheetWrapper)의 높이 제약 내에서만 확장
  overflow: "hidden",
  // iOS shadow
  shadowColor: "#000",
  shadowOffset: { width: 0, height: -4 },
  shadowOpacity: 0.12,
  shadowRadius: 12,
  // Android elevation
  elevation: 12,

  // 웹 환경에서 최대 폭 제한 및 중앙 정렬 (GlobalWebLayout 과 동일한 640px 기준)
  ...(isWeb() && {
    maxWidth: 640,
    width: "100%",
    alignSelf: "center",
    marginHorizontal: 16,
    paddingHorizontal: 20, // 웹에서 좌우 여백 추가 (내용이 가장자리와 붙는 문제 해결)
    paddingTop: 4,
    paddingBottom: 8,
  }),
});

const $handleWrapper: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  width: "100%",
  paddingTop: spacing.sm,
  paddingBottom: spacing.xs,
  alignItems: "center",
});

const $handle: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 56,
  height: 6,
  borderRadius: 3,
  backgroundColor: colors.border,
  opacity: 0.85,
});

export default PostDetailModal;
