/**
 * 알림 트리거 유틸리티
 * 특정 액션 후 즉시 포그라운드 알림을 표시하기 위한 헬퍼 함수들
 */

import { scheduleLocal } from "./expoNotifications";

/**
 * 좋아요 액션 후 즉시 알림 표시 (테스트용)
 * 실제로는 백엔드에서 푸시 알림이 와야 하지만,
 * 개발 환경에서 즉시 확인하기 위한 함수
 */
export async function triggerLikeNotification(
  senderName: string,
  isLiked: boolean,
): Promise<void> {
  if (!isLiked) return; // 좋아요 취소 시에는 알림 안 보냄

  try {
    await scheduleLocal(
      "❤️ 새로운 좋아요",
      `${senderName}님이 회원님의 게시물을 좋아합니다.`,
    );
    //console.log("✅ 좋아요 알림 트리거됨:", senderName);
  } catch (error) {
    console.error("❌ 좋아요 알림 트리거 실패:", error);
  }
}

/**
 * 댓글 작성 후 즉시 알림 표시 (테스트용)
 */
export async function triggerCommentNotification(
  senderName: string,
  commentPreview: string,
): Promise<void> {
  try {
    const preview =
      commentPreview.length > 30
        ? commentPreview.substring(0, 30) + "..."
        : commentPreview;

    await scheduleLocal(
      "💬 새로운 댓글",
      `${senderName}님이 댓글을 남겼습니다: "${preview}"`,
    );
    //console.log("✅ 댓글 알림 트리거됨:", senderName);
  } catch (error) {
    console.error("❌ 댓글 알림 트리거 실패:", error);
  }
}

/**
 * 팔로우 액션 후 즉시 알림 표시 (테스트용)
 */
export async function triggerFollowNotification(
  senderName: string,
  isFollowing: boolean,
): Promise<void> {
  if (!isFollowing) return; // 언팔로우 시에는 알림 안 보냄

  try {
    await scheduleLocal(
      "👥 새로운 팔로워",
      `${senderName}님이 회원님을 팔로우하기 시작했습니다.`,
    );
    //console.log("✅ 팔로우 알림 트리거됨:", senderName);
  } catch (error) {
    console.error("❌ 팔로우 알림 트리거 실패:", error);
  }
}

/**
 * 개발 환경에서만 알림 트리거 활성화 여부 확인
 */
export function shouldTriggerDevelopmentNotifications(): boolean {
  return __DEV__ && process.env.NODE_ENV === "development";
}
