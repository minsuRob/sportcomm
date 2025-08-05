# 프로젝트 구조

## 모노레포 구성

```
sportcomm/
├── apps/                    # 애플리케이션 패키지
│   ├── be/                 # 백엔드 NestJS 애플리케이션
│   └── fe/                 # 프론트엔드 React Native/Expo 애플리케이션
├── packages/               # 공유 패키지 (현재 비어있음)
├── node_modules/           # 루트 의존성
├── package.json            # 루트 패키지 설정
└── turbo.json             # Turborepo 설정
```

## 백엔드 구조 (apps/be)

```
apps/be/
├── src/
│   ├── entities/           # TypeORM 엔티티 (데이터베이스 모델)
│   │   ├── base.entity.ts  # 공통 필드를 가진 기본 엔티티
│   │   ├── user.entity.ts  # 역할을 가진 사용자 모델
│   │   ├── post.entity.ts  # 유형을 가진 게시물 모델
│   │   ├── comment.entity.ts
│   │   ├── follow.entity.ts
│   │   ├── media.entity.ts
│   │   └── chat-message.entity.ts
│   ├── modules/            # 기능 모듈
│   │   ├── auth/          # 인증 모듈
│   │   ├── posts/         # 게시물 관리
│   │   ├── users/         # 사용자 관리
│   │   ├── comments/      # 댓글 시스템
│   │   ├── follows/       # 팔로우 관계
│   │   └── media/         # 미디어 처리
│   ├── common/            # 공유 유틸리티
│   │   ├── decorators/    # 커스텀 데코레이터
│   │   └── guards/        # 인증 가드
│   ├── database/          # 데이터베이스 설정
│   │   ├── datasource.ts  # TypeORM 데이터 소스
│   │   └── migrations/    # 데이터베이스 마이그레이션
│   ├── app.module.ts      # 루트 애플리케이션 모듈
│   ├── main.ts           # 애플리케이션 진입점
│   └── schema.gql        # 생성된 GraphQL 스키마
├── dist/                  # 컴파일된 출력
├── test/                  # 테스트 파일
└── package.json          # 백엔드 의존성
```

## 프론트엔드 구조 (apps/fe)

```
apps/fe/
├── app/                   # Expo Router 페이지
│   ├── (app)/            # 인증된 앱 라우트
│   │   ├── feed.tsx      # 메인 피드 페이지
│   │   ├── profile.tsx   # 사용자 프로필
│   │   └── search.tsx    # 검색 기능
│   ├── _layout.tsx       # 루트 레이아웃
│   └── index.tsx         # 랜딩/인증 페이지
├── components/           # 재사용 가능한 UI 컴포넌트
│   ├── ui/              # 기본 UI 컴포넌트
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── text.tsx
│   │   └── avatar.tsx
│   ├── AuthForm.tsx     # 인증 폼
│   ├── PostCard.tsx     # 게시물 표시 컴포넌트
│   ├── FeedList.tsx     # 피드 목록
│   └── ProfileHeader.tsx
├── lib/                 # 유틸리티 및 설정
│   ├── theme/           # 테마 시스템
│   ├── icons/           # 커스텀 아이콘 컴포넌트
│   ├── storage/         # AsyncStorage 유틸리티
│   ├── auth.ts          # 인증 로직
│   ├── graphql.ts       # GraphQL 클라이언트 설정
│   └── constants.ts     # 앱 상수
├── assets/              # 정적 자산
│   ├── images/          # 앱 아이콘 및 이미지
│   └── fonts/           # 커스텀 폰트
├── android/             # Android 전용 파일
├── ios/                 # iOS 전용 파일
└── package.json         # 프론트엔드 의존성
```

## 주요 규칙

### 백엔드

- **엔티티**: GraphQL ObjectType과 함께 TypeORM 데코레이터 사용
- **모듈**: NestJS 모듈 패턴 따르기 (module, service, resolver)
- **검증**: 엔티티에 class-validator 데코레이터 사용
- **주석**: 비즈니스 로직에 대한 포괄적인 한국어 주석

### 프론트엔드

- **컴포넌트**: 적절한 prop 타이핑과 함께 TypeScript 사용
- **스타일링**: 일관된 스타일링을 위한 NativeWind 클래스
- **내비게이션**: 타입 라우트를 사용하는 Expo Router
- **상태**: React 훅을 사용한 로컬 상태, 서버 상태를 위한 GraphQL 캐시

### 공유

- **TypeScript**: 모든 패키지에서 엄격 모드 활성화
- **임포트**: 설정된 곳에서 절대 임포트 사용
- **환경**: 각 앱별로 별도의 .env 파일
- **린팅**: 일관된 코드 스타일을 위한 ESLint + Prettier
