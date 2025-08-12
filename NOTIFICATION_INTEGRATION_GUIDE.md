# 🔔 좋아요/댓글 포그라운드 알림 연동 가이드

## 🎯 구현 완료 사항

### 1. 백엔드 푸시 알림 전송 추가

**파일:** `apps/be/src/modules/notifications/notifications.service.ts`

```typescript
// 알림 생성 시 자동으로 Expo 푸시 알림 전송
await this.sendExpoPush(dto.recipientId, {
  title,
  body: message,
  data: {
    type: dto.type,
    postId: dto.postId,
    commentId: dto.commentId,
    senderId: dto.senderId,
    notificationId: fullNotification.id,
  },
});
```

**주요 변경사항:**

- 알림 생성 시 자동으로 푸시 알림 전송
- 알림 데이터에 필요한 메타정보 포함
- 좋아요/댓글 이벤트 시 실시간 푸시 알림 발송

### 2. 포그라운드 알림 핸들러 구현

**새 파일:** `apps/fe/lib/notifications/foregroundNotificationHandler.ts`

```typescript
export async function showForegroundNotification(
  notification: Notifications.Notification
): Promise<void> {
  const { title, body, data } = notification.request.content;
  const notificationData = data as ForegroundNotificationData;

  // 알림 타입에 따른 이모지 추가
  const emoji = getNotificationEmoji(notificationData.type);
  const enhancedTitle = `${emoji} ${title}`;

  // 로컬 알림으로 즉시 표시
  await scheduleLocal(enhancedTitle, body || "새로운 알림이 있습니다.");
}
```

**주요 기능:**

- 백엔드에서 받은 푸시 알림을 포그라운드 로컬 알림으로 변환
- 알림 타입별 이모지 추가 (❤️ 좋아요, 💬 댓글 등)
- 알림 탭 시 적절한 화면으로 네비게이션

### 3. 실시간 알림 수신 처리

**파일:** `apps/fe/lib/notifications/expoNotifications.ts`

```typescript
// 수신 리스너 - 포그라운드에서 받은 알림을 로컬 알림으로 표시
Notifications.addNotificationReceivedListener(async (notification) => {
  console.log("📨 알림 수신됨:", notification.request.content);

  // 포그라운드 알림 표시
  await showForegroundNotification(notification);

  // 기존 콜백 호출
  options.onReceive?.(notification);
});
```

### 4. 개발용 즉시 알림 트리거

**새 파일:** `apps/fe/lib/notifications/notificationTrigger.ts`

개발 환경에서 백엔드 푸시 알림을 기다리지 않고 즉시 테스트할 수 있는 함수들:

```typescript
export async function triggerLikeNotification(
  senderName: string,
  isLiked: boolean
): Promise<void> {
  if (!isLiked) return;

  await scheduleLocal(
    "❤️ 새로운 좋아요",
    `${senderName}님이 회원님의 게시물을 좋아합니다.`
  );
}
```

### 5. 좋아요/댓글 액션 연동

**파일:** `apps/fe/hooks/usePostInteractions.ts`

```typescript
// 좋아요 성공 후 개발 환경에서 즉시 알림 트리거
if (
  shouldTriggerDevelopmentNotifications() &&
  likeSuccessful &&
  currentUserId !== authorId
) {
  triggerLikeNotification(authorName, likeSuccessful);
}
```

**파일:** `apps/fe/components/CommentSection.tsx`

```typescript
// 댓글 작성 성공 후 개발 환경에서 즉시 알림 트리거
if (
  shouldTriggerDevelopmentNotifications() &&
  currentUser &&
  postAuthorId &&
  currentUser.id !== postAuthorId
) {
  triggerCommentNotification(currentUser.nickname, content);
}
```

## 🧪 테스트 방법

### 1. 포그라운드 알림 테스트

1. **앱을 포그라운드에서 실행**
2. **다른 사용자로 로그인하여 좋아요/댓글 작성**
3. **원래 사용자 앱에서 포그라운드 알림 확인**

### 2. 개발 환경 즉시 테스트

1. **피드 화면에서 "알림 테스트" 버튼 클릭**
2. **"포그라운드 알림" 선택하여 기본 테스트**
3. **실제 좋아요/댓글 버튼 클릭하여 연동 테스트**

### 3. 백그라운드 알림 테스트

1. **앱을 백그라운드로 보내기**
2. **다른 기기에서 좋아요/댓글 작성**
3. **시스템 알림으로 표시되는지 확인**

## 🔄 동작 흐름

### 좋아요 알림 흐름

```
1. 사용자A가 사용자B의 게시물에 좋아요 클릭
2. 프론트엔드에서 TOGGLE_LIKE 뮤테이션 실행
3. 백엔드에서 좋아요 처리 후 'notification.like' 이벤트 발생
4. NotificationsService에서 알림 생성 및 Expo 푸시 알림 전송
5. 사용자B의 앱에서 알림 수신
6. 포그라운드인 경우: showForegroundNotification으로 인앱 알림 표시
7. 백그라운드인 경우: 시스템 알림으로 표시
```

### 댓글 알림 흐름

```
1. 사용자A가 사용자B의 게시물에 댓글 작성
2. 프론트엔드에서 CREATE_COMMENT 뮤테이션 실행
3. 백엔드에서 댓글 생성 후 'notification.comment' 이벤트 발생
4. NotificationsService에서 알림 생성 및 Expo 푸시 알림 전송
5. 사용자B의 앱에서 알림 수신 및 표시
```

## 🚨 주의사항

### 1. 자기 자신에게 알림 방지

```typescript
// 백엔드에서 자동 처리
if (dto.senderId && dto.senderId === dto.recipientId) {
  return null; // 자신에게는 알림 보내지 않음
}

// 프론트엔드에서도 추가 체크
if (currentUserId !== authorId) {
  triggerLikeNotification(authorName, likeSuccessful);
}
```

### 2. 개발 환경에서만 즉시 트리거

```typescript
export function shouldTriggerDevelopmentNotifications(): boolean {
  return __DEV__ && process.env.NODE_ENV === "development";
}
```

### 3. 알림 중복 방지

백엔드에서 이미 같은 사용자가 같은 게시물에 좋아요 알림을 받았는지 확인:

```typescript
const existingLikeNotification = await this.notificationRepository.findOne({
  where: {
    type: NotificationType.LIKE,
    recipientId: authorId,
    senderId: userId,
    postId,
  },
});

if (existingLikeNotification) {
  return; // 중복 알림 방지
}
```

## 🔧 추가 설정

### 1. 알림 권한 확인

```typescript
import { checkNotificationPermissions } from "@/lib/notifications/testNotifications";
await checkNotificationPermissions();
```

### 2. 푸시 토큰 등록 확인

```typescript
// 앱 초기화 시 자동으로 처리됨
initExpoNotifications({
  apolloClient: client,
  onToken: (token) => console.log("Push token registered:", token),
});
```

## 📱 실제 사용 시나리오

### 시나리오 1: 좋아요 알림

1. **사용자 A가 앱을 사용 중 (포그라운드)**
2. **사용자 B가 A의 게시물에 좋아요**
3. **사용자 A 화면에 "❤️ 새로운 좋아요" 인앱 알림 표시**
4. **알림 탭 시 해당 게시물로 이동**

### 시나리오 2: 댓글 알림

1. **사용자 A가 앱을 백그라운드로 보냄**
2. **사용자 B가 A의 게시물에 댓글 작성**
3. **사용자 A에게 시스템 푸시 알림 표시**
4. **알림 탭 시 앱이 열리며 해당 게시물로 이동**

## 🚀 다음 단계

1. **실제 디바이스에서 테스트**
2. **알림 설정 페이지 구현**
3. **알림 히스토리 관리**
4. **알림 배치 처리 최적화**

---

**커밋 메시지:** `feat: 좋아요/댓글 액션 시 포그라운드 알림 연동 구현`
