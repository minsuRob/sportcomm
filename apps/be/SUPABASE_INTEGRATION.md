# Supabase + NestJS 통합 가이드

## 🏗️ 아키텍처 개요

이 프로젝트는 **Supabase Auth + NestJS(TypeORM) + Supabase Postgres** 하이브리드 아키텍처를 사용합니다.

### 🔑 인증 흐름

```
클라이언트 (FE)
    ↓ 1. 로그인/회원가입
Supabase Auth
    ↓ 2. JWT 토큰 발급
클라이언트 (FE)
    ↓ 3. API 요청 (Bearer JWT)
NestJS 백엔드
    ↓ 4. JWT 검증
Supabase Service
    ↓ 5. 사용자 정보 조회/동기화
TypeORM (Supabase Postgres)
```

### 🗃️ 데이터 흐름

- **인증**: Supabase Auth SDK (클라이언트) → Supabase JWT 검증 (서버)
- **DB 조회**: TypeORM → Supabase Postgres (직접 연결)
- **사용자 관리**: Supabase Auth (메타데이터) + NestJS User Entity (확장 정보)

## 🚀 새로 추가된 기능

### 1. Supabase 서비스 (`SupabaseService`)
```typescript
// src/common/services/supabase.service.ts
- JWT 토큰 검증
- 사용자 메타데이터 조회
- 관리자 작업 (사용자 삭제, 역할 변경)
```

### 2. Supabase JWT 전략 (`SupabaseJwtStrategy`)
```typescript
// src/modules/auth/supabase-jwt.strategy.ts
- Passport 기반 JWT 검증
- 자동 사용자 생성/동기화
- TypeORM User 엔티티와 연동
```

### 3. 새로운 인증 가드
```typescript
// src/common/guards/supabase-auth.guard.ts
- SupabaseAuthGuard: 필수 인증
- OptionalSupabaseAuthGuard: 선택적 인증
```

### 4. 업데이트된 User 엔티티
```typescript
// src/entities/user.entity.ts
- Supabase UUID를 Primary Key로 사용
- BaseEntity 대신 독립적인 타임스탬프 관리
- password 필드 선택적 (Supabase Auth 사용)
```

## 📡 API 엔드포인트

### 기존 JWT vs 새로운 Supabase JWT

| 기능 | 기존 방식 | 새로운 방식 |
|------|----------|------------|
| 인증 가드 | `@UseGuards(HttpAuthGuard)` | `@UseGuards(SupabaseAuthGuard)` |
| 전략 | `jwt` | `supabase-jwt` |
| 토큰 발급 | NestJS 자체 | Supabase Auth |
| 사용자 저장소 | TypeORM만 | Supabase Auth + TypeORM |

### 새로운 테스트 엔드포인트

#### 1. 사용자 프로필 조회 (Supabase 인증)
```bash
GET /auth/profile
Authorization: Bearer <supabase_jwt_token>
```

#### 2. 토큰 검증
```bash
POST /auth/verify-token
Authorization: Bearer <supabase_jwt_token>
```

#### 3. Supabase 상태 확인
```bash
GET /auth/supabase-status
```

## 🔧 환경 변수 설정

### 필수 환경 변수
```env
# Supabase 설정
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 기존 JWT (하위 호환성)
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# 데이터베이스 (Supabase Postgres)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

## 🧪 테스트 가이드

### 1. 프론트엔드에서 Supabase Auth로 로그인
```typescript
// FE에서 Supabase 로그인
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});

const token = data.session?.access_token;
```

### 2. NestJS API 호출
```bash
curl -X GET http://localhost:3000/auth/profile \
  -H "Authorization: Bearer YOUR_SUPABASE_JWT_TOKEN"
```

### 3. GraphQL에서 사용
```typescript
// GraphQL Resolver
@UseGuards(SupabaseAuthGuard)
@Query(() => User)
async me(@CurrentUser() user: User) {
  return user; // Supabase에서 자동 동기화된 사용자
}
```

## 🔄 마이그레이션 전략

### 단계별 전환

1. **현재 단계**: 두 인증 시스템 공존
   - 기존 JWT: 기존 API 유지
   - Supabase JWT: 새로운 API에 적용

2. **다음 단계**: Supabase JWT로 점진적 전환
   - 모든 새로운 기능은 Supabase JWT 사용
   - 기존 API를 하나씩 Supabase JWT로 마이그레이션

3. **최종 단계**: 완전 전환
   - 기존 JWT 시스템 제거
   - Supabase JWT를 기본 인증으로 설정

## 🛡️ 보안 고려사항

### 1. JWT 검증
- Supabase에서 직접 토큰 검증
- 만료 시간 자동 확인
- 무효한 토큰 자동 거부

### 2. 사용자 동기화
- 첫 로그인 시 자동 사용자 생성
- 주기적 메타데이터 동기화 (1시간마다)
- 중복 생성 방지

### 3. 권한 관리
- Supabase user_metadata의 role 사용
- TypeORM User 엔티티와 동기화
- NestJS 가드에서 권한 확인

## 🚨 문제 해결

### 1. 토큰 검증 실패
```typescript
// 원인: 잘못된 Supabase 설정
// 해결: SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY 확인
```

### 2. 사용자 동기화 실패
```typescript
// 원인: TypeORM 연결 문제
// 해결: DATABASE_URL 확인 및 migration 실행
```

### 3. 권한 오류
```typescript
// 원인: 사용자 역할 불일치
// 해결: Supabase user_metadata에서 role 확인
```

## 📊 성능 최적화

### 1. 사용자 조회 캐싱
- 1시간 동안 동기화 생략
- 메모리 캐시 활용 고려

### 2. JWT 검증 최적화
- Supabase의 내장 캐싱 활용
- 불필요한 API 호출 최소화

### 3. 데이터베이스 최적화
- TypeORM 관계 지연 로딩
- 필요한 필드만 선택적 조회

## 🔮 향후 계획

1. **실시간 기능**: Supabase Realtime을 NestJS WebSocket과 통합
2. **파일 업로드**: Supabase Storage 통합
3. **소셜 로그인**: GitHub, Google 등 OAuth 제공자 추가
4. **MFA**: 다중 인증 요소 지원
5. **RLS 정책**: Supabase RLS와 NestJS 권한 시스템 조합

---

이 가이드는 Supabase + NestJS 하이브리드 아키텍처의 완전한 구현 예제입니다. 질문이나 개선사항이 있으면 언제든 문의하세요!
