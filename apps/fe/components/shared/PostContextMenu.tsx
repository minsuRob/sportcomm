import React, { useState } from "react";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import ActionSheet, { ActionSheetOption } from "@/components/ActionSheet";
import ReportModal from "@/components/ReportModal";
import PostEditModal from "@/components/PostEditModal";
import { useModerationActions } from "../../hooks/useModerationActions";
import { useAppTheme } from "@/lib/theme/context";
import { PostType } from "./PostHeader";

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
}: PostContextMenuProps) {
  const { theme } = useAppTheme();
  const [showEditModal, setShowEditModal] = useState(false);
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
   * 북마크 핸들러 (향후 구현)
   */
  const handleBookmark = () => {
    // TODO: 북마크 기능 구현
    console.log("북마크 기능 - 향후 구현 예정");
  };

  /**
   * 수정하기 핸들러
   */
  const handleEdit = () => {
    setShowEditModal(true);
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
      text: "북마크",
      onPress: handleBookmark,
      icon: (
        <Ionicons name="bookmark-outline" color={theme.colors.text} size={20} />
      ),
    },
  ];

  // 본인 게시물인 경우 수정 옵션 추가
  if (isOwnPost) {
    options.push({
      text: "수정하기",
      onPress: handleEdit,
      icon: (
        <Ionicons name="create-outline" color={theme.colors.text} size={20} />
      ),
    });
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
        options={options}
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
