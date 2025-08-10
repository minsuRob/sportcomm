# 🔧 데이터베이스 연결 오류 해결 가이드

## ❌ 발생한 오류

```
Error: getaddrinfo ENOTFOUND db.dbrzlreebkvmifrtfpau.supabase.co
```

## 🎯 해결 완료 사항

✅ Supabase 프로젝트 ID를 올바르게 업데이트했습니다:

- 기존: `dbrzlreebkvmifrtfpau` (존재하지 않음)
- 현재: `hgekmqvscnjcuzyduchy` (활성 프로젝트)

✅ 환경 변수를 올바른 프로젝트 정보로 업데이트했습니다.

## 🔄 남은 작업: 데이터베이스 패스워드 설정

### 방법 1: 자동 설정 스크립트 사용 (권장)

```bash
cd apps/be
node setup-database.js
```

스크립트가 안내하는 대로:

1. Supabase 대시보드에서 패스워드 확인
2. 패스워드 입력
3. 자동으로 .env 파일 업데이트

### 방법 2: 수동 설정

1. **Supabase 대시보드에서 패스워드 확인**
   - https://supabase.com/dashboard 접속
   - 프로젝트 `hgekmqvscnjcuzyduchy` 선택
   - Settings → Database → Connection string에서 패스워드 확인

2. **apps/be/.env 파일 수정**

   ```bash
   # 현재 설정 (수정 필요)
   DATABASE_URL=postgresql://postgres:temp_password_123@db.hgekmqvscnjcuzyduchy.supabase.co:5432/postgres
   DB_PASSWORD=temp_password_123

   # 올바른 설정 (실제 패스워드로 교체)
   DATABASE_URL=postgresql://postgres:YOUR_ACTUAL_PASSWORD@db.hgekmqvscnjcuzyduchy.supabase.co:5432/postgres
   DB_PASSWORD=YOUR_ACTUAL_PASSWORD
   ```

### 방법 3: 새 패스워드 생성

Supabase 대시보드에서:

1. Settings → Database 이동
2. "Reset database password" 버튼 클릭
3. 새 패스워드 생성 및 복사
4. .env 파일에 새 패스워드 설정

## 🧪 연결 테스트

패스워드 설정 후:

```bash
cd apps/be
node test-db-connection.js
```

성공 시 다음과 같은 메시지가 표시됩니다:

```
✅ 데이터베이스 연결 성공!
📊 데이터베이스 정보:
   - PostgreSQL 버전: 17.4
   - 현재 데이터베이스: postgres
   - 현재 사용자: postgres
```

## 🚀 서버 시작

연결 테스트 성공 후:

```bash
npm run start:dev
```

## 🔍 추가 확인 사항

- [ ] 인터넷 연결 상태
- [ ] Supabase 프로젝트 활성 상태
- [ ] 방화벽 설정 (5432 포트)
- [ ] 패스워드 정확성

## 📞 문제가 계속 발생하는 경우

1. **새 Supabase 프로젝트 생성**
   - 현재 프로젝트에 문제가 있을 수 있음
   - 새 프로젝트 생성 후 환경 변수 업데이트

2. **로컬 PostgreSQL 사용**
   - 개발 환경에서 로컬 DB 사용 고려
   - Docker를 통한 PostgreSQL 설정

3. **MCP 연결 확인**
   - 현재 MCP를 통해서는 연결이 정상 작동
   - TypeORM 설정 문제일 가능성

## 🎉 완료 후 확인

모든 설정이 완료되면:

- [ ] 데이터베이스 연결 성공
- [ ] NestJS 서버 정상 시작
- [ ] GraphQL 스키마 생성 확인
- [ ] API 엔드포인트 접근 가능
