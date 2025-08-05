# SportComm 백엔드 설정 가이드

## 환경 설정

### 1. 로컬 개발 환경 (권장)

로컬 PostgreSQL 데이터베이스를 사용하는 기본 설정입니다.

```bash
# 환경 변수 설정 (.env 파일)
NODE_ENV=development
PORT=3000

# 로컬 PostgreSQL 설정
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USERNAME=your_username
DB_PASSWORD=your_password
DB_DATABASE=sportcomm

# JWT 설정
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# GraphQL 설정
GRAPHQL_PLAYGROUND=true
GRAPHQL_INTROSPECTION=true

# 파일 업로드 설정
MAX_FILE_SIZE=10485760
UPLOAD_PATH=uploads/

# Supabase 설정 (선택사항 - 실시간 기능용)
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_ANON_KEY=your_supabase_anon_key
# SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 2. Supabase 연동 환경

Supabase PostgreSQL과 실시간 기능을 모두 사용하는 설정입니다.

```bash
# 환경 변수 설정 (.env 파일)
NODE_ENV=development
PORT=3000

# Supabase PostgreSQL 연결 (우선 적용)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# 또는 개별 설정
DB_HOST=db.[PROJECT-REF].supabase.co
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_supabase_password
DB_DATABASE=postgres

# JWT 설정
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Supabase 실시간 기능 설정
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_ANON_KEY=your_actual_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key
```

## 환경별 설정 파일

### 개발 환경 (.env.development)

- 로컬 PostgreSQL 사용
- GraphQL Playground 활성화
- 상세한 로깅
- 스키마 자동 동기화

### 운영 환경 (.env.production)

- DATABASE_URL 사용 권장
- GraphQL Playground 비활성화
- 에러 정보 필터링
- SSL 연결 필수

## 데이터베이스 설정

### 로컬 PostgreSQL 설정

1. PostgreSQL 설치 및 실행
2. 데이터베이스 생성: `CREATE DATABASE sportcomm;`
3. 사용자 생성 및 권한 부여
4. 환경 변수 설정

### Supabase 설정

1. Supabase 프로젝트 생성
2. 데이터베이스 연결 정보 확인
3. API 키 발급
4. 환경 변수 설정

## 실행 방법

```bash
# 개발 모드 실행
npm run start:dev

# 프로덕션 빌드
npm run build

# 프로덕션 실행
npm run start:prod
```

## 주요 기능

### ✅ 활성화된 기능

- 사용자 인증 및 권한 관리
- 게시물 관리 시스템
- 댓글 관리 시스템
- GraphQL API
- 파일 업로드 지원
- 실시간 구독 지원
- 검색 기능
- 데이터베이스 캐싱

### ⚠️ 선택적 기능

- Supabase 실시간 기능 (환경 변수 설정 시 활성화)

## API 엔드포인트

- GraphQL API: `http://localhost:3000/graphql`
- GraphQL Playground: `http://localhost:3000/graphql` (개발 모드)
- Health Check: `http://localhost:3000/health`
- 파일 업로드: `http://localhost:3000/api/upload`

## 문제 해결

### 데이터베이스 연결 실패

1. PostgreSQL 서비스 실행 확인
2. 연결 정보 확인 (호스트, 포트, 사용자명, 비밀번호)
3. 방화벽 설정 확인
4. SSL 설정 확인 (로컬: false, Supabase: true)

### Supabase 연결 실패

1. 프로젝트 URL 확인
2. API 키 유효성 확인
3. 네트워크 연결 확인
4. 환경 변수 설정 확인

### GraphQL 스키마 에러

1. 엔티티 정의 확인
2. 관계 설정 확인
3. 데이터베이스 스키마 동기화
4. 서버 재시작

## 보안 고려사항

- JWT_SECRET은 운영 환경에서 반드시 변경
- 데이터베이스 비밀번호 보안 관리
- API 키 노출 방지
- CORS 설정 확인
- 파일 업로드 제한 설정
