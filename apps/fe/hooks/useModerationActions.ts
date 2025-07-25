import { useState } from "react";
import { useMutation } from "@apollo/client";
import { Alert } from "react-native";
import { BLOCK_USER } from "@/lib/graphql";
import { showToast } from "@/components/CustomToast";
import { getSession } from "@/lib/auth";

export interface ModerationTarget {
  userId: string;
  userName: string;
  postId?: string;
  messageId?: string;
  messageContent?: string;
}

/**
 * 신고/차단 기능을 위한 공통 훅
 */
export function useModerationActions() {
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTarget, setReportTarget] = useState<ModerationTarget | null>(
    null,
  );
  const [executeBlockUser] = useMutation(BLOCK_USER);

  /**
   * 신고 모달 열기
   */
  const openReportModal = (target: ModerationTarget) => {
    setReportTarget(target);
    setShowReportModal(true);
  };

  /**
   * 신고 모달 닫기
   */
  const closeReportModal = () => {
    setShowReportModal(false);
    setReportTarget(null);
  };

  /**
   * 사용자 차단
   */
  const blockUser = async (userId: string, userName: string) => {
    // 현재 사용자 확인
    const { user: currentUser } = await getSession();
    if (!currentUser) {
      showToast({
        type: "error",
        title: "로그인 필요",
        message: "차단하려면 로그인이 필요합니다.",
        duration: 3000,
      });
      return;
    }

    // 자기 자신 차단 방지
    if (currentUser.id === userId) {
      showToast({
        type: "error",
        title: "차단 불가",
        message: "자기 자신을 차단할 수 없습니다.",
        duration: 3000,
      });
      return;
    }

    Alert.alert(
      "사용자 차단",
      `${userName}님을 차단하시겠습니까?\n차단된 사용자의 게시물과 메시지는 더 이상 표시되지 않습니다.`,
      [
        {
          text: "취소",
          style: "cancel",
        },
        {
          text: "차단",
          style: "destructive",
          onPress: async () => {
            try {
              const { data, errors } = await executeBlockUser({
                variables: {
                  blockedUserId: userId,
                },
              });

              if (errors) {
                throw new Error(errors[0].message);
              }

              showToast({
                type: "success",
                title: "차단 완료",
                message: `${userName}님을 차단했습니다.`,
                duration: 3000,
              });
            } catch (error) {
              console.error("차단 실패:", error);
              showToast({
                type: "error",
                title: "차단 실패",
                message:
                  error instanceof Error
                    ? error.message
                    : "차단 처리 중 오류가 발생했습니다.",
                duration: 4000,
              });
            }
          },
        },
      ],
    );
  };

  /**
   * 신고/차단 옵션 표시
   */
  const showModerationOptions = (target: ModerationTarget) => {
    const options = [
      {
        text: "신고하기",
        onPress: () => openReportModal(target),
        style: "destructive" as const,
      },
      {
        text: `${target.userName}님 차단하기`,
        onPress: () => blockUser(target.userId, target.userName),
        style: "destructive" as const,
      },
      {
        text: "취소",
        style: "cancel" as const,
      },
    ];

    Alert.alert(
      target.postId
        ? "게시물 옵션"
        : target.messageId
          ? "메시지 옵션"
          : "사용자 옵션",
      "원하는 작업을 선택하세요.",
      options.map((option) => ({
        text: option.text,
        onPress: option.onPress,
        style: option.style,
      })),
    );
  };

  return {
    showReportModal,
    reportTarget,
    openReportModal,
    closeReportModal,
    blockUser,
    showModerationOptions,
  };
}
