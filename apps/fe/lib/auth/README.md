# JWT 토큰 자동 갱신 시스템

## 개요

Supabase JWT 토큰의 만료 문제를 해결하기 위한 자동 갱신 시스템입니다.

## 주요 구성 요소

### 1. TokenManager (`token-manager.ts`)

- Supabase 세션 관리 및 토큰 자동 갱신
- 토큰 만료 5분 전 자동 갱신 스케줄링
- 싱글톤 패턴으로 앱 전체에서 하나의 인스턴스 사용

### 2. AuthErrorHandler (`auth-error-handler.ts`)

- GraphQL 인증 오류 감지 및 처리
- 토큰 만료 시 자동 갱신 시도
- 갱신 실패 시 재로그인 요청

### 3. Apollo Client 통합 (`client.ts`)

- 모든 GraphQL 요청에 유효한 토큰 자동 추가
- 인증 오류 발생 시 자동 처리
- 토큰 갱신 후 요청 재시도

## 사용법

### 기본 사용

```typescript
import { getValidToken } from "@/lib/auth/token-manager";

// 항상 유효한 토큰 가져오기 (자동 갱신 포함)
const token = await getValidToken();
```

### Apollo Client와 함께

```typescript
// Apollo Client는 자동으로 유효한 토큰을 사용
const { data } = await client.query({
  query: GET_USER_INFO,
  // 토큰은 자동으로 헤더에 추가됨
});
```

### 수동 토큰 갱신

```typescript
import { refreshToken } from "@/lib/auth/token-manager";

// 수동으로 토큰 갱신
const newSession = await refreshToken();
```

## 동작 원리

1. **자동 갱신**: 토큰 만료 5분 전에 자동으로 갱신
2. **오류 감지**: GraphQL 요청에서 토큰 만료 오류 감지
3. **재시도**: 토큰 갱신 후 실패한 요청 자동 재시도
4. **재로그인**: 갱신 실패 시 사용자에게 재로그인 요청

## 백엔드 변경사항

- `ignoreExpiration: false`로 설정하여 토큰 만료 검증 활성화
- 만료된 토큰 요청 시 적절한 오류 응답

## 테스트 방법

1. 앱 실행 후 로그인
2. 토큰 만료 시간까지 대기 (또는 시스템 시간 조작)
3. API 요청 시 자동 갱신 확인
4. 로그에서 갱신 과정 모니터링

## 로그 메시지

- `🔄 토큰 갱신 시작...`: 토큰 갱신 시작
- `✅ 토큰 갱신 성공`: 갱신 완료
- `❌ 토큰 갱신 실패`: 갱신 실패, 재로그인 필요
- `⏰ 토큰 자동 갱신 스케줄링`: 다음 갱신 예약
