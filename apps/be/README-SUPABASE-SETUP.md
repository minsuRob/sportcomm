# Supabase 연동 설정 가이드

이 가이드는 SportComm 백엔드와 Supabase를 연동하여 채팅 및 실시간 기능을 구현하는 방법을 설명합니다.

## 🎯 개요

- **로컬 DB**: 주요 비즈니스 로직 (게시물, 댓글, 팔로우 등)
- **Supabase**: 채팅 메시지 및 실시간 기능
- **동기화**: 사용자 정보는 양쪽 DB에 동기화

## 📋 사전 준비

### 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. 프로젝트 설정에서 다음 정보 확인:
   - Project URL
   - Anon Key
   - Service Role Key

### 2. 환경 변수 설정

`.env` 파일에 Supabase 정보 추가:

```bash
# Supabase 설정
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 동기화 설정
SUPABASE_SYNC_ENABLED=true
SUPABASE_AUTO_SYNC=true
```

## 🗄️ 데이터베이스 설정

### 1. Supabase 스키마 생성

Supabase SQL Editor에서 `supabase-schema.sql` 파일의 내용을 실행:

```bash
# 파일 위치
apps/be/supabase-schema.sql
```

이 스크립트는 다음 테이블을 생성합니다:

- `profiles`: 사용자 프로필 (로컬 DB와 동기화)
- `chat_rooms`: 채팅방
- `chat_room_members`: 채팅방 참여자
- `chat_messages`: 채팅 메시지

### 2. 로컬 DB 마이그레이션

로컬 PostgreSQL에 Supabase 연동 필드 추가:

```bash
# 마이그레이션 실행
npm run typeorm:migration:run

# 또는 수동으로 실행
npx typeorm migration:run -d src/database/datasource.ts
```

## 🔄 사용자 동기화

### 1. 신규 사용자

회원가입 시 자동으로 Supabase에 동기화됩니다:

```typescript
// AuthService.register() 메서드에서 자동 처리
const savedUser = await this.userRepository.save(user);

// Supabase 동기화 (비동기)
this.supabaseSyncService.createUserInSupabase(savedUser, password);
```

### 2. 기존 사용자 동기화

관리자 권한으로 기존 사용자들을 Supabase와 동기화:

```graphql
# 단일 사용자 동기화
mutation {
  syncUserWithSupabase(userId: "user-id-here")
}

# 모든 사용자 동기화 (주의: 시간 소요)
mutation {
  syncAllUsersWithSupabase {
    success
    failed
    total
  }
}
```

### 3. 동기화 상태 확인

```graphql
# 동기화 통계 조회
query {
  getSupabaseSyncStats {
    totalUsers
    syncedUsers
    unsyncedUsers
    supabaseConnected
  }
}
```

## 🔐 보안 설정

### 1. Row Level Security (RLS)

Supabase에서 RLS가 자동으로 설정됩니다:

- **프로필**: 모든 사용자 조회 가능, 본인만 수정 가능
- **채팅방**: 참여자만 접근 가능
- **메시지**: 채팅방 참여자만 읽기/쓰기 가능

### 2. 인증 토큰

- 백엔드는 자체 JWT 토큰 사용
- Supabase는 Service Role Key로 관리자 권한 접근
- 프론트엔드는 Supabase Auth 토큰 사용 (채팅용)

## 📡 실시간 기능

### 1. 채팅 메시지 실시간 수신

프론트엔드에서 Supabase Realtime 사용:

```typescript
// 채팅방 메시지 구독
const subscription = supabase
  .channel('chat-messages')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'chat_messages',
      filter: `room_id=eq.${roomId}`,
    },
    (payload) => {
      // 새 메시지 처리
      handleNewMessage(payload.new);
    },
  )
  .subscribe();
```

### 2. 사용자 상태 업데이트

사용자 프로필 변경 시 실시간 반영:

```typescript
// 프로필 업데이트 구독
const profileSubscription = supabase
  .channel('user-profiles')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'profiles',
    },
    (payload) => {
      // 프로필 변경 처리
      handleProfileUpdate(payload.new);
    },
  )
  .subscribe();
```

## 🔧 개발 도구

### 1. 동기화 상태 모니터링

```bash
# 개발 서버 로그에서 동기화 상태 확인
npm run start:dev

# 로그 예시:
# [SupabaseSyncService] 사용자 john_doe의 Supabase 동기화 완료: uuid-here
# [SupabaseSyncService] Supabase 프로필 업데이트 완료
```

### 2. GraphQL Playground

개발 환경에서 동기화 관련 쿼리 테스트:

```
http://localhost:3000/graphql
```

### 3. Supabase Dashboard

Supabase 대시보드에서 실시간 데이터 확인:

- Table Editor: 데이터 직접 확인/수정
- SQL Editor: 커스텀 쿼리 실행
- Logs: 실시간 로그 모니터링

## 🚨 주의사항

### 1. 데이터 일관성

- 로컬 DB가 주 데이터베이스 (Single Source of Truth)
- Supabase 동기화 실패 시에도 서비스 정상 동작
- 정기적인 동기화 상태 점검 필요

### 2. 성능 고려사항

- 대량 사용자 동기화 시 API 제한 주의
- 동기화는 비동기로 처리하여 사용자 경험 저하 방지
- Supabase 요금제에 따른 사용량 모니터링

### 3. 에러 처리

- Supabase 연결 실패 시 로컬 DB만으로 동작
- 동기화 실패 로그 모니터링
- 재시도 로직 구현 고려

## 📚 추가 리소스

- [Supabase 공식 문서](https://supabase.com/docs)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

## 🆘 문제 해결

### 동기화가 안 될 때

1. 환경 변수 확인
2. Supabase 프로젝트 상태 확인
3. 네트워크 연결 상태 확인
4. 로그에서 에러 메시지 확인

### 채팅이 실시간으로 안 될 때

1. Supabase Realtime 활성화 확인
2. RLS 정책 확인
3. 프론트엔드 구독 상태 확인
4. 브라우저 네트워크 탭에서 WebSocket 연결 확인

문제가 지속되면 개발팀에 문의하세요.
