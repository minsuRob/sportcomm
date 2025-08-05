# 🚀 Supabase 연결 오류 빠른 해결 가이드

## 즉시 해결 방법

**"Tenant or user not found" 오류가 발생했나요?** 아래 단계를 따라하세요:

### 1단계: 환경 변수 설정 ⚙️

`apps/be/.env.development` 파일에 다음 내용을 추가하세요:

```bash
# Supabase 설정
USE_SUPABASE=true
DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@db.hgekmqvscnjcuzyduchy.supabase.co:5432/postgres
```

### 2단계: 패스워드 확인 🔑

1. [Supabase 대시보드](https://supabase.com/dashboard) 접속
2. `sportcomm` 프로젝트 선택
3. **Settings** → **Database** → **Connection string**
4. 패스워드를 복사하여 `[YOUR_PASSWORD]` 부분에 교체

### 3단계: 연결 테스트 🧪

```bash
cd apps/be
npm run test:db-connection
```

### 4단계: 서버 재시작 🔄

```bash
npm run start:dev
```

---

## 여전히 안 되나요? 🤔

### 다른 방법 시도:

**개별 환경 변수 사용:**

```bash
USE_SUPABASE=true
DB_HOST=db.hgekmqvscnjcuzyduchy.supabase.co
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=[YOUR_PASSWORD]
DB_DATABASE=postgres
```

### 일반적인 실수들:

- ❌ 잘못된 호스트: `localhost` → ✅ `db.hgekmqvscnjcuzyduchy.supabase.co`
- ❌ 잘못된 사용자명: `admin` → ✅ `postgres`
- ❌ 잘못된 DB명: `sportcomm` → ✅ `postgres`
- ❌ SSL 미설정 → ✅ 자동으로 처리됨

### 패스워드 특수문자 처리:

패스워드에 특수문자가 있다면 URL 인코딩하세요:
- `@` → `%40`
- `#` → `%23`
- `/` → `%2F`

---

## 🆘 도움이 더 필요하다면

1. **상세 가이드**: `SUPABASE_CONNECTION_GUIDE.md` 참조
2. **로그 확인**: 터미널에서 정확한 오류 메시지 확인
3. **프로젝트 상태**: Supabase 대시보드에서 프로젝트가 활성화되어 있는지 확인

---

**💡 한 줄 요약**: `.env.development`에 올바른 `DATABASE_URL` 설정하고 서버 재시작!