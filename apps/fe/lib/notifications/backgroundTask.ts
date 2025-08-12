import * as TaskManager from "expo-task-manager";
import * as Notifications from "expo-notifications";

/**
 * 백그라운드 알림 처리를 위한 태스크 정의
 * 참고: Expo Go에서는 지원되지 않으며, 개발 빌드나 프로덕션에서만 작동합니다.
 */

const BACKGROUND_NOTIFICATION_TASK = "BACKGROUND-NOTIFICATION-TASK";

/**
 * 백그라운드 알림 태스크 정의
 * 앱이 백그라운드나 종료 상태일 때 알림을 처리합니다.
 */
TaskManager.defineTask<Notifications.NotificationTaskPayload>(
  BACKGROUND_NOTIFICATION_TASK,
  ({ data, error, executionInfo }) => {
    console.log("🔔 백그라운드 알림 태스크 실행:", executionInfo?.taskName);

    if (error) {
      console.error("❌ 백그라운드 알림 태스크 에러:", error);
      return;
    }

    if (data) {
      // 알림 응답인지 직접 알림인지 구분
      const isNotificationResponse = "actionIdentifier" in data;

      if (isNotificationResponse) {
        console.log("👆 사용자가 알림을 탭했습니다:", data);
        // 사용자가 알림을 탭한 경우의 처리
        // 예: 특정 화면으로 네비게이션, 데이터 동기화 등
      } else {
        console.log("📨 백그라운드에서 알림을 받았습니다:", data);
        // 백그라운드에서 알림을 받은 경우의 처리
        // 예: 데이터 동기화, 로컬 저장소 업데이트 등
      }
    }
  }
);

/**
 * 백그라운드 알림 태스크를 등록합니다.
 * 이 함수는 앱 초기화 시 호출되어야 합니다.
 */
export async function registerBackgroundNotificationTask(): Promise<void> {
  try {
    // TaskManager가 사용 가능한지 확인
    const isTaskManagerAvailable =
      TaskManager.isAvailableAsync && (await TaskManager.isAvailableAsync());

    if (!isTaskManagerAvailable) {
      console.log(
        "⚠️ TaskManager를 사용할 수 없습니다 (Expo Go에서는 지원되지 않음)"
      );
      return;
    }

    // 백그라운드 알림 태스크 등록
    await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
    console.log("✅ 백그라운드 알림 태스크가 등록되었습니다");
  } catch (error) {
    console.warn("⚠️ 백그라운드 알림 태스크 등록 실패:", error);
  }
}

/**
 * 백그라운드 알림 태스크를 해제합니다.
 */
export async function unregisterBackgroundNotificationTask(): Promise<void> {
  try {
    await Notifications.unregisterTaskAsync(BACKGROUND_NOTIFICATION_TASK);
    console.log("✅ 백그라운드 알림 태스크가 해제되었습니다");
  } catch (error) {
    console.warn("⚠️ 백그라운드 알림 태스크 해제 실패:", error);
  }
}

export { BACKGROUND_NOTIFICATION_TASK };
