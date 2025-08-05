# 기술 스택

## 빌드 시스템

- **모노레포**: 워크스페이스 관리를 위한 Turborepo
- **패키지 매니저**: 워크스페이스를 사용하는 npm
- **Node.js**: 런타임 환경

## 백엔드 (apps/be)

- **프레임워크**: TypeScript를 사용하는 NestJS
- **API**: Apollo Server를 사용하는 GraphQL
- **데이터베이스**: TypeORM을 사용하는 PostgreSQL
- **인증**: Passport를 사용하는 JWT
- **검증**: class-validator, class-transformer
- **비밀번호 해싱**: bcryptjs

## 프론트엔드 (apps/fe)

- **프레임워크**: Expo를 사용하는 React Native
- **내비게이션**: 타입 라우트를 지원하는 Expo Router
- **스타일링**: NativeWind (React Native용 Tailwind CSS)
- **UI 컴포넌트**: rn-primitives를 사용한 커스텀 컴포넌트
- **아이콘**: Lucide React Native
- **GraphQL 클라이언트**: urql
- **저장소**: AsyncStorage
- **폰트**: Space Grotesk

## 공통 명령어

### 루트 레벨

```bash
npm run dev          # 모든 앱을 개발 모드로 시작
npm run build        # 모든 앱 빌드
npm run lint         # 모든 앱 린트
npm run format       # Prettier로 코드 포맷팅
```

### 백엔드 (apps/be)

```bash
npm run start:dev    # 감시 모드로 개발 서버 시작
npm run build        # 프로덕션용 빌드
npm run start:prod   # 프로덕션 서버 시작
npm run test         # 테스트 실행
npm run test:e2e     # e2e 테스트 실행
npm run lint         # ESLint
```

### 프론트엔드 (apps/fe)

```bash
npm run dev          # Expo 개발 서버 시작
npm run dev:web      # 웹 개발 시작
npm run dev:android  # Android 개발 시작
npm run ios          # iOS 개발 시작
npm run android      # Android 프로덕션 시작
```

## 개발 환경

- **TypeScript**: 엄격 모드 활성화
- **ESLint**: Prettier 통합을 포함한 코드 린팅
- **핫 리로드**: 프론트엔드와 백엔드 모두에서 사용 가능
- **환경 변수**: .env 파일을 통해 관리
