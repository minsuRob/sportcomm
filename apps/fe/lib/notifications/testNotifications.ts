import * as Notifications from "expo-notifications";

/**
 * 로컬 알림 테스트 함수들
 * 개발 중 알림 기능을 테스트하기 위한 유틸리티
 */

/**
 * 즉시 표시되는 로컬 알림을 생성합니다.
 * 포그라운드 알림 표시 테스트에 유용합니다.
 */
export async function testForegroundNotification(): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🔔 포그라운드 알림 테스트",
        body: "앱이 실행 중일 때 이 알림이 보이나요?",
        data: {
          type: "test",
          timestamp: Date.now(),
          screen: "foreground-test",
        },
      },
      trigger: null, // 즉시 표시
    });
    //console.log("✅ 포그라운드 테스트 알림이 전송되었습니다");
  } catch (error) {
    console.error("❌ 포그라운드 테스트 알림 전송 실패:", error);
  }
}

/**
 * 5초 후에 표시되는 지연 알림을 생성합니다.
 * 앱을 백그라운드로 보낸 후 테스트할 수 있습니다.
 */
export async function testDelayedNotification(): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "⏰ 지연 알림 테스트",
        body: "5초 후에 이 알림이 표시됩니다. 앱을 백그라운드로 보내보세요!",
        data: {
          type: "test",
          timestamp: Date.now(),
          screen: "delayed-test",
        },
      },
      trigger: {
        seconds: 5,
      },
    });
    //console.log("✅ 5초 지연 테스트 알림이 예약되었습니다");
  } catch (error) {
    console.error("❌ 지연 테스트 알림 예약 실패:", error);
  }
}

/**
 * 다양한 스타일의 테스트 알림들을 생성합니다.
 */
export async function testVariousNotifications(): Promise<void> {
  const notifications = [
    {
      title: "❤️ 좋아요 알림",
      body: "ro4179님이 회원님의 게시물을 좋아합니다.",
      data: { type: "like", postId: "test-post-1" },
    },
    {
      title: "💬 댓글 알림",
      body: '새로운 댓글이 달렸습니다: "정말 좋은 분석이네요!"',
      data: { type: "comment", postId: "test-post-2" },
    },
    {
      title: "👥 팔로우 알림",
      body: "user123님이 회원님을 팔로우하기 시작했습니다.",
      data: { type: "follow", userId: "user123" },
    },
    {
      title: "🏆 시스템 알림",
      body: "새로운 업데이트가 있습니다. 확인해보세요!",
      data: { type: "system", version: "1.0.1" },
    },
  ];

  try {
    for (let i = 0; i < notifications.length; i++) {
      const notification = notifications[i];
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data,
        },
        trigger: {
          seconds: (i + 1) * 3, // 3초 간격으로 표시
        },
      });
    }
    //console.log("✅ 다양한 테스트 알림들이 예약되었습니다 (3초 간격)");
  } catch (error) {
    console.error("❌ 테스트 알림들 예약 실패:", error);
  }
}

/**
 * 모든 예약된 알림을 취소합니다.
 */
export async function cancelAllScheduledNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    //console.log("✅ 모든 예약된 알림이 취소되었습니다");
  } catch (error) {
    console.error("❌ 알림 취소 실패:", error);
  }
}

/**
 * 현재 예약된 알림 목록을 확인합니다.
 */
export async function listScheduledNotifications(): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    //console.log("📋 예약된 알림 목록:", scheduled.length, "개");
    scheduled.forEach((notification, index) => {
      //console.log(
      //   `${index + 1}. ${notification.content.title} - ${notification.trigger}`,
      // );
    });
  } catch (error) {
    console.error("❌ 예약된 알림 목록 조회 실패:", error);
  }
}

/**
 * 알림 권한 상태를 확인합니다.
 */
export async function checkNotificationPermissions(): Promise<void> {
  try {
    const permissions = await Notifications.getPermissionsAsync();
    //console.log("🔐 알림 권한 상태:", {
    //   status: permissions.status,
    //   canAskAgain: permissions.canAskAgain,
    //   granted: permissions.granted,
    // });
  } catch (error) {
    console.error("❌ 알림 권한 확인 실패:", error);
  }
}
