# 📱 SportComm 알림 시스템 구현 가이드

## 🔧 수정된 사항들

### 1. app.json 설정 업데이트

```json
{
  "expo": {
    "plugins": [
      "expo-router",
      [
        "expo-notifications",
        {
          "icon": "./assets/images/notification-icon.png",
          "color": "#ffffff",
          "defaultChannel": "default",
          "enableBackgroundRemoteNotifications": true
        }
      ]
    ],
    "notification": {
      "iosDisplayInForeground": true
    },
    "ios": {
      "infoPlist": {
        "UIBackgroundModes": ["remote-notification"]
      }
    }
  }
}
```

**주요 변경사항:**

- `expo-notifications` 플러그인 추가
- iOS 포그라운드 알림 표시 활성화 (`iosDisplayInForeground: true`)
- iOS 백그라운드 알림 모드 추가
- 알림 아이콘 및 색상 설정

### 2. 알림 핸들러 개선

**파일:** `apps/fe/lib/notifications/expoNotifications.ts`

```typescript
// 기존 (문제가 있던 설정)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// 수정된 설정 (포그라운드에서도 배너 표시)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true, // ✅ 추가됨
    shouldShowList: true, // ✅ 추가됨
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});
```

### 3. 백그라운드 알림 처리 추가

**새 파일:** `apps/fe/lib/notifications/backgroundTask.ts`

- `TaskManager.defineTask`를 사용한 백그라운드 알림 처리
- 사용자 알림 탭과 직접 알림 수신 구분
- Expo Go에서는 지원되지 않음 (개발 빌드/프로덕션에서만 작동)

### 4. 개발용 테스트 도구 추가

**새 파일들:**

- `apps/fe/lib/notifications/testNotifications.ts`: 다양한 테스트 알림 함수들
- `apps/fe/components/notifications/NotificationTestButton.tsx`: 개발용 테스트 버튼
- 피드 화면에 테스트 버튼 추가 (개발 환경에서만 표시)

## 🧪 테스트 방법

### 1. 포그라운드 알림 테스트

1. 앱을 실행하고 피드 화면으로 이동
2. 우측 하단의 "알림 테스트" 버튼 클릭
3. "포그라운드 알림" 선택
4. 앱이 포그라운드에 있는 상태에서 알림 배너가 표시되는지 확인

### 2. 백그라운드 알림 테스트

1. "5초 지연 알림" 선택
2. 즉시 앱을 백그라운드로 보내기 (홈 버튼 또는 앱 전환)
3. 5초 후 알림이 시스템 알림으로 표시되는지 확인

### 3. 다양한 알림 스타일 테스트

1. "다양한 알림들" 선택
2. 좋아요, 댓글, 팔로우, 시스템 알림이 3초 간격으로 표시됨

## 🔍 문제 해결

### Expo Go에서 백그라운드 알림이 작동하지 않는 경우

**원인:** Expo Go는 `expo-task-manager`를 지원하지 않습니다.

**해결책:**

1. 개발 빌드 생성: `npx expo run:ios` 또는 `npx expo run:android`
2. 또는 EAS Build 사용: `eas build --platform ios --profile development`

### iOS에서 포그라운드 알림이 표시되지 않는 경우

**확인사항:**

1. `app.json`에 `notification.iosDisplayInForeground: true` 설정 확인
2. 앱 재빌드 필요 (네이티브 설정 변경)
3. iOS 시뮬레이터에서는 제한적으로 작동할 수 있음

### 알림 권한이 거부된 경우

```typescript
import { checkNotificationPermissions } from "@/lib/notifications/testNotifications";

// 권한 상태 확인
await checkNotificationPermissions();

// 권한 재요청
const granted = await requestPermissionsAsync();
```

## 📋 체크리스트

### 개발 환경 설정

- [ ] `expo-notifications` 설치됨
- [ ] `expo-task-manager` 설치됨
- [ ] `app.json` 설정 업데이트됨
- [ ] 알림 아이콘 파일 추가됨

### 기능 테스트

- [ ] 포그라운드 알림 배너 표시됨
- [ ] 백그라운드 알림 시스템 알림으로 표시됨
- [ ] 알림 클릭 시 적절한 화면으로 이동
- [ ] 푸시 토큰이 백엔드에 등록됨

### 프로덕션 준비

- [ ] 테스트 버튼 제거 또는 개발 환경에서만 표시
- [ ] 실제 푸시 알림 서버 설정
- [ ] APNs/FCM 인증서 설정
- [ ] 알림 아이콘 최적화 (96x96 흰색 PNG)

## 🚀 다음 단계

1. **실제 푸시 알림 전송 테스트**
   - 백엔드에서 Expo Push API 호출
   - 다른 사용자의 액션에 대한 실시간 알림

2. **알림 개인화**
   - 사용자별 알림 설정
   - 알림 타입별 on/off 기능

3. **고급 기능**
   - 알림 액션 버튼 (좋아요, 답글 등)
   - 리치 알림 (이미지, 동영상 포함)
   - 알림 그룹화

## 📚 참고 문서

- [Expo Notifications 공식 문서](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Expo Push Notifications 가이드](https://docs.expo.dev/push-notifications/overview/)
- [TaskManager 백그라운드 작업](https://docs.expo.dev/versions/latest/sdk/task-manager/)

---

**커밋 메시지:** `feat: iOS 포그라운드 알림 표시 및 백그라운드 알림 처리 구현`
