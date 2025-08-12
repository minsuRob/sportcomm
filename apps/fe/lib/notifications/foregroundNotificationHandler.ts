import * as Notifications from "expo-notifications";
import { scheduleLocal } from "./expoNotifications";

/**
 * 포그라운드 알림 처리 서비스
 * 백엔드에서 받은 푸시 알림을 포그라운드에서 인앱 알림으로 표시합니다.
 */

export interface ForegroundNotificationData {
  type: string;
  postId?: string;
  commentId?: string;
  senderId?: string;
  notificationId?: string;
}

/**
 * 포그라운드에서 받은 알림을 로컬 알림으로 표시합니다.
 * 이미 시스템 알림으로 표시된 것을 중복으로 표시하지 않기 위해
 * 앱이 포그라운드에 있을 때만 작동합니다.
 */
export async function showForegroundNotification(
  notification: Notifications.Notification
): Promise<void> {
  try {
    const { title, body, data } = notification.request.content;

    // 무한 루프 방지: 로컬에서 생성된 알림은 다시 처리하지 않음
    if (data?.isLocal) {
      return;
    }

    // 안전한 데이터 파싱 및 타입 처리
    const notificationData = (data ||
      {}) as unknown as ForegroundNotificationData;
    const type = notificationData.type || "UNKNOWN";

    // 알림 타입에 따른 이모지 추가
    const emoji = getNotificationEmoji(type);
    const enhancedTitle = title?.startsWith(emoji)
      ? title
      : `${emoji} ${title || ""}`;

    // 로컬 알림으로 즉시 표시 (isLocal 플래그 추가)
    await scheduleLocal(
      enhancedTitle,
      body || "새로운 알림이 있습니다.",
      notificationData
    );

    console.log("✅ 포그라운드 알림 표시됨:", {
      title: enhancedTitle,
      body,
      type: type,
    });
  } catch (error) {
    console.error("❌ 포그라운드 알림 표시 실패:", error);
  }
}

/**
 * 알림 타입에 따른 이모지 반환
 */
function getNotificationEmoji(type: string): string {
  switch (type) {
    case "LIKE":
      return "❤️";
    case "COMMENT":
      return "💬";
    case "FOLLOW":
      return "👥";
    case "MENTION":
      return "📢";
    case "POST":
      return "📝";
    case "SYSTEM":
      return "🔔"; // 기본 이모지
    case "LIKE_MILESTONE":
      return "🎉";
    default:
      return "🔔"; // 기본 이모지
  }
}

/**
 * 알림 응답 처리 (사용자가 알림을 탭했을 때)
 */
export function handleNotificationResponse(
  response: Notifications.NotificationResponse,
  router: any
): void {
  try {
    const data = response.notification.request.content
      .data as unknown as ForegroundNotificationData;

    console.log("🔔 알림 탭됨:", data);

    // 알림 타입에 따른 네비게이션
    if (data.postId) {
      // 게시물 관련 알림인 경우 게시물 상세로 이동
      router.push({
        pathname: "/(details)/post/[postId]",
        params: { postId: data.postId },
      });
    } else if (data.type === "FOLLOW" && data.senderId) {
      // 팔로우 알림인 경우 프로필로 이동
      router.push({
        pathname: "/(details)/profile/[userId]",
        params: { userId: data.senderId },
      });
    } else {
      // 기본적으로 알림 목록으로 이동
      router.push("/(details)/notifications");
    }
  } catch (error) {
    console.error("❌ 알림 응답 처리 실패:", error);
    // 실패 시 기본 알림 목록으로 이동
    router.push("/(details)/notifications");
  }
}
