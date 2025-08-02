/**
 * 데이터베이스 초기화 스크립트
 *
 * 이 스크립트는 개발 환경에서 데이터베이스를 초기화하는 용도로 사용됩니다.
 * 주의: 이 스크립트는 모든 테이블 데이터를 삭제합니다.
 */

const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// 환경 변수 로드
const envPath = path.resolve(__dirname, '.env.local');
const envPathDefault = path.resolve(__dirname, '.env');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config({ path: envPathDefault });
}

// 데이터베이스 연결 설정
const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_DATABASE || 'sportcomm',
});

async function resetDatabase() {
  try {
    console.log('데이터베이스 연결 중...');
    await client.connect();
    console.log('데이터베이스 연결 성공!');

    // 트랜잭션 시작
    await client.query('BEGIN');

    console.log('모든 테이블 및 관련 오브젝트 삭제 중...');

    // 테이블과 enum 모두 삭제
    try {
      // 외래키 제약조건을 먼저 삭제
      await client.query(`
        DO $$
        DECLARE
            r RECORD;
        BEGIN
            FOR r IN (SELECT conname, conrelid::regclass AS table_name, pg_get_constraintdef(oid) AS constraint_def
                      FROM pg_constraint
                      WHERE confrelid != 0)
            LOOP
                EXECUTE 'ALTER TABLE ' || r.table_name || ' DROP CONSTRAINT IF EXISTS ' || r.conname || ' CASCADE;';
            END LOOP;
        END $$;
      `);

      // 스키마 완전 초기화
      await client.query(`
        DROP SCHEMA public CASCADE;
        CREATE SCHEMA public;
        GRANT ALL ON SCHEMA public TO public;
      `);

      console.log('모든 테이블과 enum이 성공적으로 삭제되었습니다!');
    } catch (err) {
      console.error('데이터베이스 초기화 중 오류가 발생했습니다:', err.message);
      throw err; // 오류를 전파하여 트랜잭션이 롤백되도록 함
    }

    // 트랜잭션 커밋
    await client.query('COMMIT');
    console.log('데이터베이스 초기화가 완료되었습니다!');
    console.log('애플리케이션을 시작하면 테이블이 재생성됩니다.');
  } catch (err) {
    // 오류 발생 시 롤백
    await client.query('ROLLBACK');
    console.error('데이터베이스 초기화 중 오류가 발생했습니다:', err);
  } finally {
    // 연결 종료
    await client.end();
    console.log('데이터베이스 연결이 종료되었습니다.');
  }
}

// 스크립트 실행
resetDatabase();
