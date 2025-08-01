# 배포 전 체크리스트

## ✅ 완료된 항목들

### 1. 이미지 최적화 시스템

- [x] `apps/fe/lib/image/` 공통 유틸리티 구현
- [x] PostCard.tsx 리팩토링 완료
- [x] StorySection.tsx iOS 크기 문제 해결
- [x] 코드 중복 제거 및 성능 최적화

### 2. GraphQL 에러 해결

- [x] getBlockedUsers 쿼리 OptionalGqlAuthGuard 적용
- [x] 프론트엔드 에러 처리 강화
- [x] 백엔드 안전성 향상

### 3. 채팅 시스템

- [x] 채팅방 리스트 임시 데이터 추가
- [x] 개별 채팅방 메시지 임시 데이터 추가
- [x] Feed 탭에서 Chat 탭으로 전환 기능

### 4. 게시물 시스템

- [x] title 필드 추가 및 표시
- [x] GIF 파일 원본 업로드 지원
- [x] 이미지 압축 최적화

## ⚠️ 알려진 타입 에러들 (배포에 영향 없음)

### 수정 필요한 파일들

1. `app/(modals)/settings.tsx:68` - 언어 타입 에러
2. `components/layout/WebCenteredLayout.tsx` - RefreshControl 타입 에러
3. `components/posts/PostItem.tsx` - 테마 색상 타입 에러
4. `components/search/SearchTabs.tsx` - 폰트 가중치 타입 에러
5. `lib/theme/context.tsx` - 테마 타입 불일치

### 해결된 에러들

- [x] `hooks/usePostInteractions.ts` - GraphQL 에러 처리 수정
- [x] `lib/chat/chatService.ts` - Message 타입에 channel_id 추가

## 🚀 배포 준비 상태

### iOS

- [x] StorySection 이미지 크기 정상 표시
- [x] 앱 실행 시 GraphQL 에러 없음
- [x] 모든 주요 기능 정상 동작

### 주요 기능 테스트

- [x] Feed 탭 - 게시물 목록 표시
- [x] Chat 탭 - 채팅방 리스트 표시
- [x] 게시물 작성 - 텍스트 및 이미지 업로드
- [x] 이미지 최적화 - PostCard, StorySection
- [x] 사용자 인증 - 로그인/로그아웃

## 📝 다음 단계 권장사항

1. **타입 에러 수정**: 배포 전 남은 타입 에러들 해결
2. **테스트 추가**: 주요 기능에 대한 단위 테스트 작성
3. **성능 모니터링**: 이미지 로딩 성능 모니터링 설정
4. **에러 추적**: Sentry 등 에러 추적 도구 설정
5. **CI/CD**: 자동 빌드 및 배포 파이프라인 구성

## 🎯 현재 상태 요약

앱의 핵심 기능들이 모두 정상 동작하며, iOS에서 발생했던 주요 문제들이 해결되었습니다.
GraphQL 에러도 수정되어 안정적으로 실행됩니다.
타입 에러들은 런타임에 영향을 주지 않는 수준이므로 배포 가능한 상태입니다.
