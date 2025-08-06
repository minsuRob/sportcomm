# Supabase 데이터베이스 연결 설정 가이드

## 🔧 현재 상황

현재 프로젝트는 다음 Supabase 프로젝트에 연결되어 있습니다:

- **프로젝트 ID**: `hgekmqvscnjcuzyduchy`
- **프로젝트 URL**: `https://hgekmqvscnjcuzyduchy.supabase.co`
- **데이터베이스 호스트**: `db.hgekmqvscnjcuzyduchy.supabase.co`

## ❌ 발생한 문제

`getaddrinfo ENOTFOUND db.hgekmqvscnjcuzyduchy.supabase.co` 오류가 발생하고 있습니다.

이는 다음 중 하나의 이유 때문입니다:

1. 데이터베이스 패스워드가 올바르지 않음
2. Supabase 프로젝트가 일시 중지됨
3. 네트워크 연결 문제

## 🔍 해결 방법

### 1단계: Supabase 대시보드에서 데이터베이스 패스워드 확인

1. [Supabase 대시보드](https://supabase.com/dashboard)에 로그인
2. 프로젝트 `hgekmqvscnjcuzyduchy` 선택
3. 좌측 메뉴에서 **Settings** → **Database** 클릭
4. **Connection string** 섹션에서 패스워드 확인
5. 또는 **Reset database password** 버튼으로 새 패스워드 생성

### 2단계: 환경 변수 업데이트

확인한 패스워드를 `apps/be/.env` 파일에 설정:

```bash
# 현재 설정 (수정 필요)
DATABASE_URL=postgresql://postgres:temp_password_123@db.hgekmqvscnjcuzyduchy.supabase.co:5432/postgres
DB_PASSWORD=temp_password_123

# 올바른 설정 (실제 패스워드로 교체)
DATABASE_URL=postgresql://postgres:YOUR_ACTUAL_PASSWORD@db.hgekmqvscnjcuzyduchy.supabase.co:5432/postgres
DB_PASSWORD=YOUR_ACTUAL_PASSWORD
```

### 3단계: 연결 테스트

```bash
cd apps/be
node test-db-connection.js
```

### 4단계: 서버 재시작

```bash
npm run start:dev
```

## 🎯 확인 사항

- [ ] Supabase 프로젝트가 활성 상태인지 확인
- [ ] 데이터베이스 패스워드가 올바른지 확인
- [ ] 인터넷 연결이 정상인지 확인
- [ ] 방화벽이 5432 포트를 차단하지 않는지 확인

## 📞 추가 도움

문제가 계속 발생하면:

1. Supabase 프로젝트 상태 확인
2. 새로운 Supabase 프로젝트 생성 고려
3. 로컬 PostgreSQL 개발 환경 설정 고려

## 🔄 대안: 새 Supabase 프로젝트 생성

현재 프로젝트에 문제가 있다면 새 프로젝트를 생성할 수 있습니다:

1. [Supabase 대시보드](https://supabase.com/dashboard)에서 **New Project** 클릭
2. 프로젝트 이름: `sportcomm-new`
3. 데이터베이스 패스워드 설정
4. 생성 완료 후 새 프로젝트 정보로 `.env` 파일 업데이트

새 프로젝트 정보:

```bash
SUPABASE_URL=https://NEW_PROJECT_ID.supabase.co
SUPABASE_ANON_KEY=NEW_ANON_KEY
DATABASE_URL=postgresql://postgres:NEW_PASSWORD@db.NEW_PROJECT_ID.supabase.co:5432/postgres
DB_HOST=db.NEW_PROJECT_ID.supabase.co
DB_PASSWORD=NEW_PASSWORD
SUPABASE_PROJECT_ID=NEW_PROJECT_ID
```
