import React, { useState } from "react";
import { Flag, UserX, Share, Bookmark } from "lucide-react-native";
import ActionSheet, { ActionSheetOption } from "@/components/ActionSheet";
import ReportModal from "@/components/ReportModal";
import { useModerationActions } from "@/hooks/useModerationActions";
import { useAppTheme } from "@/lib/theme/context";
import { getSession } from "@/lib/auth";

interface PostContextMenuProps {
  visible: boolean;
  onClose: () => void;
  post: {
    id: string;
    author: {
      id: string;
      nickname: string;
    };
  };
  currentUserId?: string | null;
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
}: PostContextMenuProps) {
  const { theme } = useAppTheme();
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

  // 액션시트 옵션 구성
  const options: ActionSheetOption[] = [
    // 공통 옵션
    {
      text: "공유하기",
      onPress: handleShare,
      icon: <Share color={theme.colors.text} size={20} />,
    },
    {
      text: "북마크",
      onPress: handleBookmark,
      icon: <Bookmark color={theme.colors.text} size={20} />,
    },
  ];

  // 다른 사용자의 게시물인 경우 신고/차단 옵션 추가
  if (!isOwnPost) {
    options.push(
      {
        text: "신고하기",
        onPress: handleReport,
        style: "destructive",
        icon: <Flag color={theme.colors.error} size={20} />,
      },
      {
        text: `${post.author.nickname}님 차단하기`,
        onPress: handleBlock,
        style: "destructive",
        icon: <UserX color={theme.colors.error} size={20} />,
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
    </>
  );
}
