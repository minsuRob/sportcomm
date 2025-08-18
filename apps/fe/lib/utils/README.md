# 사용자 메타 데이터 유틸리티

사용자의 팀 로고, 나이 등 메타 데이터를 공통으로 처리하는 유틸리티 함수들입니다.

## 주요 기능

- 다양한 데이터 구조에서 팀 정보 추출
- 확장 가능한 사용자 메타 데이터 구조
- 채팅, 게시물 등 다양한 컨텍스트에서 재사용 가능

## 사용법

### 기본 사용법

```typescript
import { extractTeamLogos, createUserMeta } from "@/lib/utils/userMeta";

// 팀 로고 추출
const teamLogos = extractTeamLogos(user, 3); // 최대 3개

// 사용자 메타 데이터 생성
const userMeta = createUserMeta(user, {
  maxTeamLogos: 3,
  includeAge: true,
  includeTeams: false,
});
```

### 채팅에서 사용

```typescript
import { createChatUserMeta } from '@/lib/utils/userMeta';

// 채팅 메시지용 사용자 메타 데이터
const userMeta = createChatUserMeta(message.user, currentUser);

// ChatMessage 컴포넌트에 전달
<ChatMessage
  message={message}
  userMeta={userMeta}
/>
```

### 게시물에서 사용

```typescript
import { extractTeams } from '@/lib/utils/userMeta';

// 작성자 팀 정보 추출
const authorTeams = extractTeams(post.author, 3);

// TeamLogo 컴포넌트로 렌더링
{authorTeams.map(team => (
  <TeamLogo
    key={team.id}
    logoUrl={team.logoUrl}
    fallbackIcon={team.icon}
    teamName={team.name}
    size={28}
  />
))}
```

## 지원하는 데이터 구조

### myTeams (GraphQL User 필드)

```typescript
{
  myTeams: [
    {
      team: {
        id: string;
        name: string;
        logoUrl?: string;
        icon: string;
      }
    }
  ]
}
```

### authorTeams (Post 작성자 정보)

```typescript
{
  authorTeams: [
    {
      id: string;
      name: string;
      logoUrl?: string;
      icon: string;
    }
  ]
}
```

### myTeamLogos (채팅 메시지 사용자)

```typescript
{
  myTeamLogos: string[]; // 로고 URL 배열
}
```

## 확장성

새로운 메타 데이터 필드를 추가하려면 `UserMeta` 인터페이스를 확장하고 `createUserMeta` 함수를 수정하면 됩니다.

```typescript
export interface UserMeta {
  age?: number;
  teamLogos?: string[];
  teams?: TeamInfo[];
  // 새로운 필드 추가
  badges?: string[];
  level?: number;
  achievements?: string[];
}
```

## 테스트

```bash
# 테스트 실행
npm test -- userMeta.test.ts
```
