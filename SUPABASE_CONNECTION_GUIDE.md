# Supabase 데이터베이스 연결 설정 가이드

## 개요

이 가이드는 "Tenant or user not found" 오류를 해결하고 Supabase 데이터베이스에 올바르게 연결하는 방법을 설명합니다.

## 프로젝트 정보

- **프로젝트 ID**: `hgekmqvscnjcuzyduchy`
- **프로젝트 이름**: `sportcomm`
- **리전**: `ap-southeast-1`
- **데이터베이스 호스트**: `db.hgekmqvscnjcuzyduchy.supabase.co`
- **데이터베이스명**: `postgres`
- **사용자명**: `postgres`

## 환경 변수 설정

### 방법 1: DATABASE_URL 사용 (권장)

`.env.development` 파일에 다음과 같이 설정하세요:

```bash
# Supabase 설정
USE_SUPABASE=true
DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@db.hgekmqvscnjcuzyduchy.supabase.co:5432/postgres
```

### 방법 2: 개별 환경 변수 사용

```bash
# Supabase 설정
USE_SUPABASE=true

# Supabase 전용 환경 변수
SUPABASE_DB_HOST=db.hgekmqvscnjcuzyduchy.supabase.co
SUPABASE_DB_PORT=5432
SUPABASE_DB_USERNAME=postgres
SUPABASE_DB_PASSWORD=[YOUR_PASSWORD]
SUPABASE_DB_DATABASE=postgres

# 또는 기본 DB 환경 변수 사용
DB_HOST=db.hgekmqvscnjcuzyduchy.supabase.co
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=[YOUR_PASSWORD]
DB_DATABASE=postgres
```

## 패스워드 확인 방법

Supabase 대시보드에서 패스워드를 확인하는 방법:

1. [Supabase 대시보드](https://supabase.com/dashboard) 접속
2. `sportcomm` 프로젝트 선택
3. **Settings** → **Database** 이동
4. **Connection string** 섹션에서 패스워드 확인 또는 재설정

## 일반적인 오류와 해결 방법

### 1. "Tenant or user not found" 오류

**원인**: 잘못된 사용자명, 데이터베이스명, 또는 호스트명

**해결**: 위의 정확한 연결 정보 사용:
- 호스트: `db.hgekmqvscnjcuzyduchy.supabase.co`
- 사용자명: `postgres`
- 데이터베이스명: `postgres`

### 2. "Connection timeout" 오류

**원인**: 네트워크 문제 또는 잘못된 호스트

**해결**: 
```bash
# 연결 테스트
ping db.hgekmqvscnjcuzyduchy.supabase.co
```

### 3. "Password authentication failed" 오류

**원인**: 잘못된 패스워드

**해결**: Supabase 대시보드에서 패스워드 재설정

## 연결 테스트

### psql로 직접 연결 테스트

```bash
psql "postgresql://postgres:[YOUR_PASSWORD]@db.hgekmqvscnjcuzyduchy.supabase.co:5432/postgres"
```

### Node.js에서 연결 테스트

```javascript
import { Client } from 'pg';

const client = new Client({
  connectionString: 'postgresql://postgres:[YOUR_PASSWORD]@db.hgekmqvscnjcuzyduchy.supabase.co:5432/postgres',
  ssl: {
    rejectUnauthorized: false
  }
});

try {
  await client.connect();
  const result = await client.query('SELECT current_database(), current_user;');
  console.log('연결 성공:', result.rows[0]);
} catch (error) {
  console.error('연결 실패:', error.message);
} finally {
  await client.end();
}
```

## SSL 설정

Supabase는 SSL 연결을 요구하므로 다음 설정이 필요합니다:

```javascript
ssl: {
  rejectUnauthorized: false
}
```

## 프로젝트 상태 확인

프로젝트가 활성 상태인지 확인:
- 현재 상태: `ACTIVE_HEALTHY` ✅
- 데이터베이스 버전: `17.4.1.064`

## 환경별 설정

### Development 환경

```bash
NODE_ENV=development
USE_SUPABASE=true
DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@db.hgekmqvscnjcuzyduchy.supabase.co:5432/postgres
```

### Production 환경

```bash
NODE_ENV=production
USE_SUPABASE=true
DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@db.hgekmqvscnjcuzyduchy.supabase.co:5432/postgres
```

## 보안 고려사항

1. **패스워드 보안**: `.env` 파일을 `.gitignore`에 추가
2. **SSL 사용**: 항상 SSL 연결 사용
3. **연결 풀**: 연결 수 제한 설정

## 트러블슈팅 체크리스트

- [ ] 올바른 호스트명 사용: `db.hgekmqvscnjcuzyduchy.supabase.co`
- [ ] 올바른 사용자명 사용: `postgres`
- [ ] 올바른 데이터베이스명 사용: `postgres`
- [ ] 올바른 패스워드 사용
- [ ] SSL 설정 포함
- [ ] `USE_SUPABASE=true` 설정
- [ ] 프로젝트가 활성 상태인지 확인
- [ ] 네트워크 연결 확인

## 추가 지원

문제가 계속 발생하는 경우:
1. Supabase 대시보드에서 프로젝트 상태 확인
2. 패스워드 재설정
3. 연결 로그 확인
4. Supabase 지원팀 문의

---

**마지막 업데이트**: 2025-08-05
**프로젝트**: sportcomm (hgekmqvscnjcuzyduchy)