import React, { useState } from "react";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Alert } from "react-native";
import { useMutation } from "@apollo/client";
import ActionSheet, { ActionSheetOption } from "@/components/ActionSheet";
import ReportModal from "@/components/ReportModal";
import PostEditModal from "@/components/PostEditModal";
import { useModerationActions } from "../../hooks/useModerationActions";
import { useAppTheme } from "@/lib/theme/context";
import { PostType } from "../PostCard";
import { DELETE_POST, TOGGLE_BOOKMARK } from "@/lib/graphql";
import { showToast } from "@/components/CustomToast";

interface PostContextMenuProps {
  visible: boolean;
  onClose: () => void;
  post: {
    id: string;
    title?: string;
    content: string;
    type: PostType;
    author: {
      id: string;
      nickname: string;
    };
  };
  currentUserId?: string | null;
  onPostUpdated?: (updatedPost: any) => void;
  isBookmarked?: boolean;
}

/**
 * 게시물 컨텍스트 메뉴 컴포넌트
 * 더보기 버튼 클릭 시 표시되는 액션시트
 */
export default function PostContextMenu({
  visible,
  onClose,
  post,
  currentUserId,
  onPostUpdated,
  isBookmarked = false,
}: PostContextMenuProps) {
  const { theme } = useAppTheme();
  const [showEditModal, setShowEditModal] = useState(false);
  const [deletePost, { loading: deleteLoading }] = useMutation(DELETE_POST);
  const [toggleBookmark, { loading: bookmarkLoading }] =
    useMutation(TOGGLE_BOOKMARK);
  const {
    showReportModal,
    reportTarget,
    openReportModal,
    closeReportModal,
    blockUser,
  } = useModerationActions();

  const isOwnPost = currentUserId === post.author.id;

  /**
   * 신고하기 핸들러
   */
  const handleReport = () => {
    openReportModal({
      userId: post.author.id,
      userName: post.author.nickname,
      postId: post.id,
    });
  };

  /**
   * 차단하기 핸들러
   */
  const handleBlock = () => {
    blockUser(post.author.id, post.author.nickname);
  };

  /**
   * 공유하기 핸들러 (향후 구현)
   */
  const handleShare = () => {
    // TODO: 공유 기능 구현
    console.log("공유 기능 - 향후 구현 예정");
  };

  /**
   * 북마크 토글 핸들러
   */
  const handleBookmark = async () => {
    try {
      const { data } = await toggleBookmark({
        variables: { postId: post.id },
      });

      if (data?.toggleBookmark !== undefined) {
        const isBookmarked = data.toggleBookmark;
        showToast({
          type: "success",
          title: isBookmarked ? "북마크 추가" : "북마크 제거",
          message: isBookmarked
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
        message: "북마크 처리 중 문제가 발생했습니다. 다시 시도해주세요.",
        duration: 3000,
      });
    }

    // 메뉴 닫기
    onClose();
  };

  /**
   * 수정하기 핸들러
   */
  const handleEdit = () => {
    setShowEditModal(true);
  };

  /**
   * 삭제하기 핸들러
   * 게시물 삭제 전 확인 대화상자를 표시하고, 확인 시 삭제 처리
   */
  const handleDelete = () => {
    Alert.alert(
      "게시물 삭제",
      "이 게시물을 정말 삭제하시겠습니까?\n삭제된 게시물은 복구할 수 없습니다.",
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
            try {
              // 게시물 삭제 뮤테이션 실행
              const { data } = await deletePost({
                variables: { id: post.id },
              });

              if (data?.deletePost) {
                showToast({
                  type: "success",
                  title: "삭제 완료",
                  message: "게시물이 성공적으로 삭제되었습니다.",
                  duration: 3000,
                });

                // 목록 화면으로 돌아가기 (onClose 콜백 실행)
                onClose();

                // 부모 컴포넌트에 삭제 알림 (onPostUpdated 콜백을 통해)
                if (onPostUpdated) {
                  onPostUpdated({ id: post.id, deleted: true });
                }
              }
            } catch (error) {
              console.error("게시물 삭제 오류:", error);
              showToast({
                type: "error",
                title: "오류",
                message:
                  "게시물 삭제 중 문제가 발생했습니다. 다시 시도해주세요.",
                duration: 4000,
              });
            }
          },
        },
      ]
    );
  };

  /**
   * 수정 모달 닫기 핸들러
   */
  const handleCloseEditModal = () => {
    setShowEditModal(false);
  };

  /**
   * 게시물 수정 완료 핸들러
   */
  const handlePostUpdated = (updatedPost: any) => {
    if (onPostUpdated) {
      onPostUpdated(updatedPost);
    }
    setShowEditModal(false);
  };

  // 액션시트 옵션 구성
  const options: ActionSheetOption[] = [
    // 공통 옵션
    {
      text: "공유하기",
      onPress: handleShare,
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

  // 본인 게시물인 경우 수정 및 삭제 옵션 추가
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
      }
    );
  } else {
    // 다른 사용자의 게시물인 경우 신고/차단 옵션 추가
    options.push(
      {
        text: "신고하기",
        onPress: handleReport,
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
      }
    );
  }

  return (
    <>
      <ActionSheet
        visible={visible}
        onClose={onClose}
        title="게시물 옵션"
        options={
          deleteLoading || bookmarkLoading
            ? options.map((opt) => ({ ...opt, disabled: true }))
            : options
        }
      />

      {/* 신고 모달 */}
      <ReportModal
        visible={showReportModal}
        onClose={closeReportModal}
        postId={reportTarget?.postId}
        reportedUserId={reportTarget?.userId}
        reportedUserName={reportTarget?.userName}
      />

      {/* 수정 모달 */}
      <PostEditModal
        visible={showEditModal}
        onClose={handleCloseEditModal}
        post={{
          id: post.id,
          title: post.title,
          content: post.content,
          type: post.type,
        }}
        onPostUpdated={handlePostUpdated}
      />
    </>
  );
}
