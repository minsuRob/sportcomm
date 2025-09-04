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
  visible: boolean;                        // 모달 표시 여부
  postId: string;                          // 대상 게시물 ID
  onClose: () => void;                     // 닫기 콜백
  onPostUpdated?: () => Promise<void> | void; // 게시물 수정/댓글 후 상위 통지
  enableBackdropPress?: boolean;           // 오버레이 터치 닫기 활성화 여부
  testID?: string;                         // 테스트 식별자
}

export const PostDetailModal: React.FC<PostDetailModalProps> = ({
  visible,
  postId,
  onClose,
  onPostUpdated,
  enableBackdropPress = true,
  testID = "post-detail-modal",
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
          <Pressable style={themed($sheet)} accessibilityHint="게시물 상세 모달">
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
});

const $sheet: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.background,
  borderTopLeftRadius: 28,
  borderTopRightRadius: 28,
  minHeight: "68%",
  // maxHeight: "90%",
  overflow: "hidden",
  // iOS shadow
  shadowColor: "#000",
  shadowOffset: { width: 0, height: -4 },
  shadowOpacity: 0.12,
  shadowRadius: 12,
  // Android elevation
  elevation: 12,
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
