/*
 * "백엔드와 연결 필요"
 *
 * 이 파일은 앱이 백그라운드 상태일 때 푸시 알림을 처리하기 위한 로직을 포함합니다.
 * 이 기능은 Expo Go에서 테스트할 수 없으며, 네이티브 설정이 완료된
 * 개발 빌드(Development Build) 또는 프로덕션 빌드에서만 정상적으로 동작합니다.
 *
 * --- 개발 절차 가이드 ---
 * 1. app.config.js (또는 app.json)에 iOS/Android 백그라운드 모드 설정을 추가합니다.
 * 2. `eas build --profile development` 명령어로 개발 빌드를 생성합니다.
 * 3. 생성된 개발 빌드를 기기/시뮬레이터에 설치하여 테스트를 진행합니다.
 * 4. TaskManager.defineTask 내부에 백그라운드에서 수신된 알림을 처리하는
 *    상세 로직(예: 데이터 동기화, 뱃지 카운트 업데이트)을 구현합니다.
 */

// Expo Go 환경에서는 관련 코드가 오류를 발생시킬 수 있으므로 비워둡니다.
// 개발 빌드 시 아래 주석을 해제하고 사용하세요.

/*
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';

export const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND-NOTIFICATION-TASK';

TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, ({ data, error, executionInfo }) => {
  if (error) {
    console.error('❌ 백그라운드 알림 태스크 오류:', error);
    return;
  }
  if (data) {
    console.log('📨 백그라운드 알림 수신됨:', (data as any).notification);
  }
});

export async function registerBackgroundNotificationTask() {
  try {
    await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
    console.log('✅ 백그라운드 알림 태스크가 등록되었습니다.');
  } catch (error) {
    console.error('❌ 백그라운드 알림 태스크 등록 실패:', error);
  }
}
*/
