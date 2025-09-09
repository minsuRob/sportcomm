import React, { useState, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@apollo/client";
import ActionSheet, { ActionSheetOption } from "@/components/ActionSheet";
import PostEditModal from "@/components/PostEditModal";
import { useModerationActions } from "../../hooks/useModerationActions";
import { useAppTheme } from "@/lib/theme/context";
import {
  DELETE_POST,
  TOGGLE_BOOKMARK,
  CREATE_REPORT,
  CREATE_FEEDBACK,
} from "@/lib/graphql";
import { showToast } from "@/components/CustomToast";
import AppDialog from "@/components/ui/AppDialog";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from "react-native";

/**
 * 신고 유형 옵션
 */
const REPORT_TYPE_OPTIONS = [
  { value: "SPAM", label: "스팸" },
  { value: "INAPPROPRIATE_CONTENT", label: "부적절" },
  { value: "HARASSMENT", label: "괴롭힘" },
  { value: "MISINFORMATION", label: "허위 정보" },
  { value: "COPYRIGHT", label: "저작권" },
  { value: "OTHER", label: "기타" },
] as const;

/**
 * 피드백(건의) 유형 옵션
 */
const FEEDBACK_TYPE_OPTIONS = [
  { value: "BUG_REPORT", label: "버그 신고" },
  { value: "FEATURE_REQUEST", label: "기능 요청" },
  { value: "IMPROVEMENT", label: "개선 제안" },
  { value: "GENERAL", label: "일반 의견" },
  { value: "COMPLIMENT", label: "칭찬" },
  { value: "COMPLAINT", label: "불만" },
] as const;

interface PostContextMenuProps {
  visible: boolean;
  onClose: () => void;
  post: {
    id: string;
    title?: string;
    content: string;
    teamId: string;
    author: {
      id: string;
      nickname: string;
    };
  };
  currentUserId?: string | null;
  onPostUpdated?: (updatedPost: any) => void;
  isBookmarked?: boolean;
  onBlockUser?: (blockedUserId: string) => void;
}

/**
 * 게시물 컨텍스트 메뉴
 * - 신고하기: 유형 + 상세 사유
 * - 건의하기: 유형 + 상세 내용
 * - 공통 다이얼로그로 통합하여 중복 제거
 */
export default function PostContextMenu({
  visible,
  onClose,
  post,
  currentUserId,
  onPostUpdated,
  isBookmarked = false,
  onBlockUser,
}: PostContextMenuProps) {
  const { theme } = useAppTheme();
  const [showEditModal, setShowEditModal] = useState(false);
  const [deletePost, { loading: deleteLoading }] = useMutation(DELETE_POST);
  const [toggleBookmark, { loading: bookmarkLoading }] =
    useMutation(TOGGLE_BOOKMARK);
  const { blockUser } = useModerationActions(onBlockUser);

  // 통합 다이얼로그 모드: REPORT | FEEDBACK | null
  const [dialogMode, setDialogMode] = useState<"REPORT" | "FEEDBACK" | null>(
    null,
  );
  const [selectedType, setSelectedType] = useState<string>("");
  const [detailText, setDetailText] = useState<string>("");

  const [createReport, { loading: reportLoading }] = useMutation(CREATE_REPORT);
  const [createFeedback, { loading: feedbackLoading }] =
    useMutation(CREATE_FEEDBACK);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isOwnPost = currentUserId === post.author.id;
  const submitting = reportLoading || feedbackLoading;

  /**
   * 다이얼로그 열기 - 신고
   */
  const openReportDialog = () => {
    setDialogMode("REPORT");
    setSelectedType(REPORT_TYPE_OPTIONS[0].value);
    setDetailText("");
  };

  /**
   * 다이얼로그 열기 - 건의
   */
  const openFeedbackDialog = () => {
    setDialogMode("FEEDBACK");
    setSelectedType(FEEDBACK_TYPE_OPTIONS[0].value);
    setDetailText("");
  };

  /**
   * 다이얼로그 닫기
   */
  const closeDialog = () => {
    setDialogMode(null);
    setSelectedType("");
    setDetailText("");
  };

  /**
   * 차단
   */
  const handleBlock = () => {
    blockUser(post.author.id, post.author.nickname);
  };

  /**
   * 북마크 토글
   */
  const handleBookmark = async () => {
    try {
      const { data } = await toggleBookmark({ variables: { postId: post.id } });
      if (data?.toggleBookmark !== undefined) {
        const bookmarked = data.toggleBookmark;
        showToast({
          type: "success",
          title: bookmarked ? "북마크 추가" : "북마크 제거",
          message: bookmarked
            ? "게시물이 북마크에 추가되었습니다."
            : "게시물이 북마크에서 제거되었습니다.",
          duration: 2000,
        });
      }
    } catch (error) {
      console.error("북마크 토글 오류:", error);
      showToast({
        type: "error",
        title: "오류",
        message: "북마크 처리 중 문제가 발생했습니다.",
        duration: 3000,
      });
    } finally {
      onClose();
    }
  };

  /**
   * 수정
   */
  const handleEdit = () => setShowEditModal(true);

  /**
   * 삭제 다이얼로그
   */
  const handleDelete = () => setShowDeleteDialog(true);

  /**
   * 삭제 확정
   */
  const confirmDelete = async () => {
    try {
      const { data } = await deletePost({ variables: { id: post.id } });
      if (data?.deletePost) {
        showToast({
          type: "success",
          title: "삭제 완료",
          message: "게시물이 삭제되었습니다.",
          duration: 2500,
        });
        onPostUpdated?.({ id: post.id, deleted: true });
        onClose();
      }
    } catch (error) {
      console.error("게시물 삭제 오류:", error);
      showToast({
        type: "error",
        title: "오류",
        message: "삭제 중 문제가 발생했습니다.",
        duration: 3500,
      });
    } finally {
      setShowDeleteDialog(false);
    }
  };

  /**
   * 수정 완료 콜백
   */
  const handlePostUpdated = (updatedPost: any) => {
    onPostUpdated?.(updatedPost);
    setShowEditModal(false);
  };

  /**
   * 신고 / 건의 제출 처리
   */
  const handleSubmit = async () => {
    if (!dialogMode) return;
    const text = detailText.trim();
    if (text.length < 10) return;
    try {
      if (dialogMode === "REPORT") {
        // 신고 뮤테이션
        const { data, errors } = await createReport({
          variables: {
            input: {
              type: selectedType,
              reason: text,
              postId: post.id,
              reportedUserId: post.author.id,
            },
          },
        });
        if (errors) throw new Error(errors[0].message);
        if (data?.createReport) {
          showToast({
            type: "success",
            title: "신고 완료",
            message: "신고가 접수되었습니다.",
            duration: 2500,
          });
        }
      } else {
        // 건의 뮤테이션
        const title = text.length > 40 ? text.slice(0, 40) + "…" : text;
        const { data } = await createFeedback({
          variables: {
            input: {
              title,
              content: text,
              type: selectedType,
              // priority / contactInfo 등은 향후 확장 가능
            },
          },
        });
        if (data?.createFeedback) {
          showToast({
            type: "success",
            title: "건의 접수",
            message: "소중한 의견 감사합니다.",
            duration: 2500,
          });
        } else {
          showToast({
            type: "info",
            title: "결과 확인",
            message: "건의 처리 응답을 확인할 수 없습니다.",
            duration: 3000,
          });
        }
      }
      closeDialog();
      onClose();
    } catch (error) {
      console.error("제출 실패:", error);
      showToast({
        type: "error",
        title: "오류",
        message:
          error instanceof Error
            ? error.message
            : "처리 중 오류가 발생했습니다.",
        duration: 3500,
      });
    }
  };

  /**
   * 현재 모드의 타입 옵션
   */
  const currentTypeOptions = useMemo(
    () =>
      dialogMode === "REPORT" ? REPORT_TYPE_OPTIONS : FEEDBACK_TYPE_OPTIONS,
    [dialogMode],
  );

  /**
   * 타입 선택 + 상세 입력 렌더링
   */
  const renderDialogContent = () => {
    if (!dialogMode) return null;
    return (
      <ScrollView
        style={{ maxHeight: 380 }}
        contentContainerStyle={{ paddingBottom: 8 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 10 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: theme.colors.text,
            }}
          >
            {dialogMode === "REPORT" ? "신고 유형" : "건의 유형"}
          </Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            {currentTypeOptions.map((opt) => {
              const active = opt.value === selectedType;
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setSelectedType(opt.value)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: active
                      ? theme.colors.tint
                      : theme.colors.border,
                    backgroundColor: active
                      ? theme.colors.tint + "22"
                      : theme.colors.card,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "500",
                      color: active ? theme.colors.tint : theme.colors.text,
                    }}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text
            style={{
              fontSize: 12,
              color: theme.colors.textDim,
              marginTop: 2,
            }}
          >
            최소 10자 이상 입력해 주세요.
          </Text>

          <TextInput
            value={detailText}
            onChangeText={setDetailText}
            placeholder={
              dialogMode === "REPORT"
                ? "신고 사유를 구체적으로 작성해 주세요 (최소 10자)"
                : "건의/의견을 입력해 주세요 (최소 10자)"
            }
            placeholderTextColor={theme.colors.textDim}
            multiline
            maxLength={800}
            style={{
              minHeight: 120,
              borderWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.background,
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontSize: 14,
              color: theme.colors.text,
              textAlignVertical: "top",
            }}
          />
        </View>
      </ScrollView>
    );
  };

  // 확인 버튼 활성 조건
  const confirmDisabled =
    !dialogMode || !selectedType || detailText.trim().length < 10 || submitting;

  /**
   * 액션시트 옵션 구성
   */
  const options: ActionSheetOption[] = [
    {
      text: "공유하기",
      onPress: () => console.log("공유 기능 - TODO"),
      icon: (
        <Ionicons name="share-outline" color={theme.colors.text} size={20} />
      ),
    },
    {
      text: isBookmarked ? "북마크 제거" : "북마크 추가",
      onPress: handleBookmark,
      icon: (
        <Ionicons
          name={isBookmarked ? "bookmark" : "bookmark-outline"}
          color={isBookmarked ? theme.colors.tint : theme.colors.text}
          size={20}
        />
      ),
    },
  ];

  if (isOwnPost) {
    options.push(
      {
        text: "수정하기",
        onPress: handleEdit,
        icon: (
          <Ionicons name="create-outline" color={theme.colors.text} size={20} />
        ),
      },
      {
        text: "삭제하기",
        onPress: handleDelete,
        style: "destructive",
        icon: (
          <Ionicons name="trash-outline" color={theme.colors.error} size={20} />
        ),
      },
    );
  } else {
    options.push(
      {
        text: "신고하기",
        onPress: openReportDialog,
        style: "destructive",
        icon: (
          <Ionicons name="flag-outline" color={theme.colors.error} size={20} />
        ),
      },
      {
        text: `${post.author.nickname}님 차단하기`,
        onPress: handleBlock,
        style: "destructive",
        icon: (
          <Ionicons
            name="person-remove-outline"
            color={theme.colors.error}
            size={20}
          />
        ),
      },
    );
  }

  // 건의하기는 모든 게시물에서 가능
  options.push({
    text: "건의하기",
    onPress: openFeedbackDialog,
    icon: (
      <Ionicons
        name="chatbubble-ellipses-outline"
        color={theme.colors.text}
        size={20}
      />
    ),
  });

  return (
    <>
      <ActionSheet
        visible={visible}
        onClose={onClose}
        title="게시물 옵션"
        options={
          deleteLoading || bookmarkLoading
            ? options.map((o) => ({ ...o, disabled: true }))
            : options
        }
      />

      {/* 신고 / 건의 통합 다이얼로그 */}
      <AppDialog
        visible={dialogMode !== null}
        onClose={closeDialog}
        title={
          dialogMode === "REPORT"
            ? "게시물 신고"
            : dialogMode === "FEEDBACK"
              ? "건의 / 의견 보내기"
              : ""
        }
        confirmText={
          submitting ? "전송 중..." : dialogMode === "REPORT" ? "신고" : "제출"
        }
        cancelText="취소"
        showCancel
        confirmDisabled={confirmDisabled}
      >
        {renderDialogContent()}
        <View style={{ flexDirection: "row", marginTop: 12, gap: 8 }}>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: confirmDisabled
                ? theme.colors.tint + "66"
                : theme.colors.tint,
              paddingVertical: 12,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
            }}
            onPress={handleSubmit}
            disabled={confirmDisabled}
          >
            <Text
              style={{
                color: "white",
                fontSize: 16,
                fontWeight: "700",
              }}
            >
              {submitting
                ? "처리 중..."
                : dialogMode === "REPORT"
                  ? "신고하기"
                  : "보내기"}
            </Text>
          </TouchableOpacity>
        </View>
      </AppDialog>

      {/* 삭제 확인 다이얼로그 */}
      <AppDialog
        visible={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        title="게시물 삭제"
        description="이 게시물을 정말 삭제하시겠습니까? 삭제된 게시물은 복구할 수 없습니다."
        confirmText="삭제"
        onConfirm={confirmDelete}
        cancelText="취소"
      />

      {/* 수정 모달 */}
      <PostEditModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        post={{
          id: post.id,
          title: post.title,
          content: post.content,
          teamId: post.teamId,
        }}
        onPostUpdated={handlePostUpdated}
      />
    </>
  );
}
