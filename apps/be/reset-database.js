/**
 * 개발 환경 데이터베이스 리셋 스크립트
 *
 * 주의: 이 스크립트는 모든 데이터를 삭제합니다!
 * 개발 환경에서만 사용하세요.
 */

const { Client } = require('pg');
require('dotenv').config();

async function resetDatabase() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_DATABASE || 'sportcomm',
  });

  try {
    await client.connect();
    console.log('🔗 데이터베이스에 연결되었습니다.');

    // 모든 테이블 삭제 (CASCADE로 외래키 제약조건도 함께 삭제)
    const dropTablesQuery = `
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO postgres;
      GRANT ALL ON SCHEMA public TO public;
    `;

    await client.query(dropTablesQuery);
    console.log('✅ 모든 테이블이 삭제되었습니다.');
    console.log(
      '🚀 이제 애플리케이션을 다시 시작하면 새로운 스키마가 생성됩니다.',
    );
  } catch (error) {
    console.error('❌ 데이터베이스 리셋 실패:', error.message);
  } finally {
    await client.end();
  }
}

// 환경 확인
if (process.env.NODE_ENV === 'production') {
  console.error('❌ 프로덕션 환경에서는 이 스크립트를 실행할 수 없습니다!');
  process.exit(1);
}

console.log('⚠️  이 스크립트는 모든 데이터를 삭제합니다!');
console.log('⚠️  개발 환경에서만 사용하세요.');
console.log('');

resetDatabase();
