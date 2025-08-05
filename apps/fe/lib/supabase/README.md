# Supabase 채팅 시스템 연동 가이드

이 문서는 Sportcomm 프론트엔드 앱에서 Supabase를 사용한 실시간 채팅 시스템 구현에 대한 가이드입니다.

## 📋 목차

- [개요](#개요)
- [설치 및 설정](#설치-및-설정)
- [데이터베이스 스키마](#데이터베이스-스키마)
- [환경 설정](#환경-설정)
- [사용법](#사용법)
- [API 참조](#api-참조)
- [문제 해결](#문제-해결)

## 🔍 개요

본 채팅 시스템은 다음과 같은 특징을 가집니다:

- **듀얼 모드 지원**: 개발 환경에서는 Mock 데이터, 프로덕션에서는 Supabase 사용
- **실시간 메시징**: Supabase Realtime을 통한 즉시 메시지 전송/수신
- **보안**: Row Level Security (RLS)를 통한 데이터 접근 제어
- **확장성**: 채팅방, 멤버, 메시지 첨부파일 등 완전한 채팅 시스템

## 🚀 설치 및 설정

### 1. 환경 변수 설정

`.env` 파일을 생성하고 다음 내용을 추가하세요:

```bash
# Supabase 설정
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# 기능 플래그
USE_SUPABASE=true  # false로 설정하면 Mock 데이터 사용
```

### 2. Supabase 프로젝트 설정

1. [Supabase 대시보드](https://supabase.com/dashboard)에서 새 프로젝트 생성
2. `lib/supabase/schema.sql` 파일의 SQL을 실행하여 데이터베이스 스키마 생성
3. Realtime 기능 활성화 확인

## 🗄️ 데이터베이스 스키마

### 주요 테이블

```sql
-- 사용자 테이블
users (
  id UUID PRIMARY KEY,
  nickname VARCHAR(50),
  email VARCHAR(255),
  profile_image_url TEXT,
  ...
)

-- 채팅방 테이블
chat_channels (
  id UUID PRIMARY KEY,
  name VARCHAR(100),
  description TEXT,
  is_private BOOLEAN,
  type VARCHAR(20),
  ...
)

-- 채팅방 멤버 테이블
chat_channel_members (
  id UUID PRIMARY KEY,
  channel_id UUID REFERENCES chat_channels(id),
  user_id UUID REFERENCES users(id),
  is_admin BOOLEAN,
  ...
)

-- 메시지 테이블
chat_messages (
  id UUID PRIMARY KEY,
  channel_id UUID REFERENCES chat_channels(id),
  user_id UUID REFERENCES users(id),
  content TEXT,
  reply_to_id UUID REFERENCES chat_messages(id),
  ...
)
```

### RLS 정책

모든 테이블에 Row Level Security가 적용되어 있어 사용자는 자신이 참여한 채팅방의 데이터만 접근할 수 있습니다.

## ⚙️ 환경 설정

### 개발 환경 (Mock 데이터)

```typescript
// .env
USE_SUPABASE=false

// 자동으로 임시 데이터 사용
const chatService = new ChatService();
console.log(chatService.getDataSourceType()); // "mock"
```

### 프로덕션 환경 (Supabase)

```typescript
// .env
USE_SUPABASE=true
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

// 자동으로 Supabase 사용
const chatService = new ChatService();
console.log(chatService.getDataSourceType()); // "supabase"
```

## 📚 사용법

### 기본 사용법

```typescript
import { chatService } from '@/lib/chat/chatService';

// 채팅방 목록 조회
const channels = await chatService.getUserChatRooms();

// 메시지 조회
const messages = await chatService.getChatMessages('channel-id');

// 메시지 전송
const newMessage = await chatService.sendMessage(
  'channel-id',
  '안녕하세요!',
  currentUser
);

// 실시간 구독
const unsubscribe = chatService.subscribeToMessages(
  'channel-id',
  (message) => {
    console.log('새 메시지:', message);
  }
);

// 구독 해제
unsubscribe();
```

### 채팅방 관리

```typescript
// 채팅방 생성
const newChannel = await chatService.createChatChannel(
  '새 채팅방',
  '채팅방 설명',
  false, // 공개 채팅방
  'GENERAL',
  100 // 최대 100명
);

// 채팅방 참여
const success = await chatService.joinChatChannel('channel-id');

// 채팅방 나가기
const left = await chatService.leaveChatChannel('channel-id');

// 읽음 처리
await chatService.markChannelAsRead('channel-id');
```

### 실시간 기능

```typescript
useEffect(() => {
  if (!channelId) return;

  // 실시간 메시지 구독
  const unsubscribe = chatService.subscribeToMessages(
    channelId,
    (newMessage) => {
      setMessages(prev => [...prev, newMessage]);
    }
  );

  return () => {
    unsubscribe();
  };
}, [channelId]);
```

## 📖 API 참조

### ChatService 클래스

#### 메서드

| 메서드 | 설명 | 반환 타입 |
|--------|------|-----------|
| `getUserChatRooms()` | 사용자 채팅방 목록 조회 | `Promise<ChannelInfo[]>` |
| `getPublicChatRooms(page, limit)` | 공개 채팅방 목록 조회 | `Promise<PaginatedChannels>` |
| `getChatMessages(channelId, limit?, before?)` | 채팅방 메시지 조회 | `Promise<Message[]>` |
| `sendMessage(channelId, content, user, replyToId?)` | 메시지 전송 | `Promise<Message \| null>` |
| `createChatChannel(name, description?, isPrivate?, type?, maxParticipants?)` | 채팅방 생성 | `Promise<ChannelInfo \| null>` |
| `joinChatChannel(channelId)` | 채팅방 참여 | `Promise<boolean>` |
| `leaveChatChannel(channelId)` | 채팅방 나가기 | `Promise<boolean>` |
| `markChannelAsRead(channelId)` | 읽음 처리 | `Promise<boolean>` |
| `subscribeToMessages(channelId, onMessage)` | 실시간 구독 | `() => void` |
| `cleanup()` | 모든 구독 해제 | `void` |

#### 유틸리티 메서드

| 메서드 | 설명 | 반환 타입 |
|--------|------|-----------|
| `isConnected()` | 연결 상태 확인 | `boolean` |
| `getDataSourceType()` | 현재 데이터 소스 타입 | `"supabase" \| "mock"` |
| `switchToSupabase()` | Supabase로 전환 (개발용) | `void` |
| `switchToMock()` | Mock 데이터로 전환 (개발용) | `void` |

### 타입 정의

```typescript
interface ChannelInfo {
  id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  type: string;
  isRoomActive: boolean;
  maxParticipants?: number;
  currentParticipants: number;
  lastMessage?: string;
  lastMessageAt?: string;
  members: ChannelMember[];
  createdAt: string;
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user: {
    id: string;
    nickname: string;
    profileImageUrl?: string;
  };
  replyTo?: {
    id: string;
    content: string;
    user: {
      nickname: string;
    };
  };
  isSystem?: boolean;
}
```

## 🔧 문제 해결

### 일반적인 문제

#### 1. Supabase 연결 실패

```bash
에러: "Invalid API key" 또는 "Unable to connect"
```

**해결 방법:**
- `.env` 파일의 `SUPABASE_URL`과 `SUPABASE_ANON_KEY` 확인
- Supabase 대시보드에서 API 키 재확인
- 네트워크 연결 상태 확인

#### 2. 실시간 메시지가 수신되지 않음

```bash
에러: "Realtime subscription failed"
```

**해결 방법:**
- Supabase 프로젝트에서 Realtime 기능 활성화 확인
- RLS 정책이 올바르게 설정되었는지 확인
- 사용자 인증 상태 확인

#### 3. RLS 권한 오류

```bash
에러: "Permission denied" 또는 "Row level security policy violation"
```

**해결 방법:**
- 사용자가 해당 채팅방의 멤버인지 확인
- RLS 정책이 올바르게 적용되었는지 확인
- 데이터베이스 스키마 재실행

### 디버깅 팁

```typescript
// 현재 데이터 소스 확인
console.log('Data Source:', chatService.getDataSourceType());

// 연결 상태 확인
console.log('Connected:', chatService.isConnected());

// Mock 데이터로 임시 전환 (개발용)
chatService.switchToMock();

// 로그 레벨 조정
// 브라우저 콘솔에서 Supabase 관련 로그 확인
```

### 성능 최적화

1. **메시지 페이지네이션**: 한 번에 많은 메시지를 로드하지 않도록 limit 설정
2. **구독 관리**: 컴포넌트 언마운트 시 반드시 구독 해제
3. **캐싱**: 자주 사용되는 채팅방 정보는 클라이언트에서 캐싱

## 📝 참고 자료

- [Supabase 공식 문서](https://supabase.com/docs)
- [Supabase Realtime 가이드](https://supabase.com/docs/guides/realtime)
- [Row Level Security 가이드](https://supabase.com/docs/guides/auth/row-level-security)

## 🤝 기여하기

1. 새로운 기능 추가 시 Mock 데이터와 Supabase 모두 지원하도록 구현
2. 타입 정의는 `types.ts` 파일에 별도 관리
3. 에러 처리는 `handleSupabaseError` 함수 사용
4. 모든 새로운 API는 문서 업데이트 필요

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 있습니다.