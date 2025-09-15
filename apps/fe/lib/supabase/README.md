# Supabase 인증 서비스

이 디렉토리는 SportComm 앱의 Supabase 인증 기능을 담당합니다. 기존 GraphQL 뮤테이션 기반 인증을 Supabase Auth로 마이그레이션했습니다.

## 📁 파일 구조

```
apps/fe/lib/supabase/
├── auth.ts              # 메인 인증 서비스
├── auth.example.ts      # 사용 예시 및 마이그레이션 가이드
├── client.ts           # Supabase 클라이언트 설정
├── chatService.ts      # 채팅 서비스 (기존)
├── types.ts            # 타입 정의
└── README.md           # 이 파일
```

## 🚀 주요 변경사항

### Before (GraphQL 뮤테이션)

```typescript
// apps/fe/lib/graphql.ts
export const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token: accessToken
      user { ... }
    }
  }
`;

export const REGISTER_MUTATION = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      token: accessToken
      user { ... }
    }
  }
`;
```

### After (Supabase Auth)

```typescript
// apps/fe/lib/supabase/auth.ts
import { signUp, signIn, signOut } from "./auth";

// 회원가입
const result = await signUp({
  email: "user@example.com",
  password: "password123",
  nickname: "testUser",
});

// 로그인
const result = await signIn({
  email: "user@example.com",
  password: "password123",
});
```

## 🔧 사용법

### 1. 기본 인증 기능

```typescript
import { signUp, signIn, signOut, getCurrentUser } from "@/lib/supabase/auth";

// 회원가입
const handleSignUp = async () => {
  const result = await signUp({
    email: "user@example.com",
    password: "securePassword123",
    nickname: "testUser",
  });

  if (result.error) {
    console.error("회원가입 실패:", result.error.message);
    return;
  }

  //console.log("회원가입 성공:", result.user);
};

// 로그인
const handleSignIn = async () => {
  const result = await signIn({
    email: "user@example.com",
    password: "securePassword123",
  });

  if (result.error) {
    console.error("로그인 실패:", result.error.message);
    return;
  }

  //console.log("로그인 성공:", result.user);
};

// 로그아웃
const handleSignOut = async () => {
  const result = await signOut();

  if (result.error) {
    console.error("로그아웃 실패:", result.error.message);
    return;
  }

  //console.log("로그아웃 성공");
};

// 현재 사용자 확인
const checkUser = async () => {
  const { user, error } = await getCurrentUser();

  if (error) {
    console.error("사용자 조회 실패:", error.message);
    return;
  }

  //console.log("현재 사용자:", user);
};
```

### 2. 인증 상태 리스너

```typescript
import { SupabaseAuthService } from "@/lib/supabase/auth";

// React 컴포넌트에서 사용
useEffect(() => {
  const unsubscribe = SupabaseAuthService.onAuthStateChange(
    (event, session) => {
      switch (event) {
        case "SIGNED_IN":
          //console.log("사용자 로그인:", session?.user?.id);
          // 로그인 후 처리 로직
          break;
        case "SIGNED_OUT":
          //console.log("사용자 로그아웃");
          // 로그아웃 후 처리 로직
          break;
        case "TOKEN_REFRESHED":
          //console.log("토큰 갱신");
          break;
      }
    },
  );

  return () => unsubscribe();
}, []);
```

### 3. 추가 기능

```typescript
import { SupabaseAuthService } from "@/lib/supabase/auth";

// 비밀번호 재설정
const resetPassword = async (email: string) => {
  const result = await SupabaseAuthService.resetPassword(email);

  if (result.error) {
    console.error("비밀번호 재설정 실패:", result.error.message);
    return;
  }

  //console.log("비밀번호 재설정 이메일 전송 완료");
};

// 이메일 확인 재전송
const resendConfirmation = async (email: string) => {
  const result = await SupabaseAuthService.resendConfirmation(email);

  if (result.error) {
    console.error("이메일 확인 재전송 실패:", result.error.message);
    return;
  }

  //console.log("이메일 확인 재전송 완료");
};
```

## 🔄 마이그레이션 가이드

### React 컴포넌트에서의 변경

#### Before (Apollo Client + GraphQL)

```typescript
import { useMutation } from '@apollo/client';
import { LOGIN_MUTATION, REGISTER_MUTATION } from '@/lib/graphql';

const LoginComponent = () => {
  const [loginMutation, { loading, error }] = useMutation(LOGIN_MUTATION);

  const handleLogin = async (email: string, password: string) => {
    try {
      const { data } = await loginMutation({
        variables: { input: { email, password } }
      });

      // 성공 처리
      //console.log('로그인 성공:', data.login.user);
    } catch (error) {
      console.error('로그인 실패:', error);
    }
  };

  return (
    // JSX
  );
};
```

#### After (Supabase Auth)

```typescript
import { useState } from 'react';
import { signIn } from '@/lib/supabase/auth';

const LoginComponent = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    const result = await signIn({ email, password });

    if (result.error) {
      setError(result.error.message);
    } else {
      // 성공 처리
      //console.log('로그인 성공:', result.user);
    }

    setLoading(false);
  };

  return (
    // JSX
  );
};
```

## 🎯 장점

1. **직접적인 Supabase 연동**: GraphQL 레이어 없이 직접 Supabase Auth 사용
2. **실시간 상태 관리**: `onAuthStateChange`를 통한 실시간 인증 상태 추적
3. **내장 기능 활용**: 비밀번호 재설정, 이메일 확인 등 Supabase 내장 기능 사용
4. **타입 안전성**: TypeScript를 통한 완전한 타입 지원
5. **성능 향상**: GraphQL 오버헤드 제거로 더 빠른 인증 처리

## 🔒 보안 고려사항

1. **JWT 토큰**: Supabase가 자동으로 JWT 토큰 관리
2. **세션 관리**: 자동 토큰 갱신 및 세션 유지
3. **RLS (Row Level Security)**: Supabase 데이터베이스 레벨에서 보안 정책 적용
4. **이메일 확인**: 회원가입 시 이메일 확인 프로세스 내장

## 🚨 주의사항

1. **환경 변수**: `SUPABASE_URL`과 `SUPABASE_ANON_KEY`가 올바르게 설정되어야 함
2. **에러 처리**: 모든 인증 함수는 에러 객체를 반환하므로 적절한 에러 처리 필요
3. **세션 동기화**: 여러 탭에서 동시 사용 시 세션 동기화 고려
4. **백엔드 연동**: 백엔드에서도 Supabase JWT 토큰 검증 로직 필요

## 📚 참고 자료

- [Supabase Auth 공식 문서](https://supabase.com/docs/guides/auth)
- [Supabase JavaScript 클라이언트](https://supabase.com/docs/reference/javascript/auth-signup)
- [React와 Supabase 연동](https://supabase.com/docs/guides/getting-started/tutorials/with-react)
