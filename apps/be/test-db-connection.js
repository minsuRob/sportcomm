/**
 * 데이터베이스 연결 테스트 스크립트
 *
 * 이 스크립트는 Supabase PostgreSQL 데이터베이스 연결을 테스트합니다.
 */

const { Client } = require('pg');
require('dotenv').config();

async function testDatabaseConnection() {
  console.log('🔄 데이터베이스 연결 테스트를 시작합니다...');
  console.log('');

  // 환경 변수 확인
  console.log('📋 현재 환경 변수:');
  console.log(`   - DB_HOST: ${process.env.DB_HOST}`);
  console.log(`   - DB_PORT: ${process.env.DB_PORT}`);
  console.log(`   - DB_USERNAME: ${process.env.DB_USERNAME}`);
  console.log(`   - DB_DATABASE: ${process.env.DB_DATABASE}`);
  console.log(
    `   - DB_PASSWORD: ${process.env.DB_PASSWORD ? '***설정됨***' : '❌ 설정되지 않음'}`,
  );
  console.log('');

  // 패스워드가 설정되지 않은 경우
  if (
    !process.env.DB_PASSWORD ||
    process.env.DB_PASSWORD === '[YOUR_DB_PASSWORD]'
  ) {
    console.log('❌ 데이터베이스 패스워드가 설정되지 않았습니다.');
    console.log('');
    console.log('🔧 해결 방법:');
    console.log('1. Supabase 대시보드에서 데이터베이스 패스워드를 확인하세요.');
    console.log('2. .env 파일의 DB_PASSWORD와 DATABASE_URL을 업데이트하세요.');
    console.log('3. 서버를 재시작하세요: npm run start:dev');
    return;
  }

  // 데이터베이스 연결 설정
  const client = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    // 연결 시도
    console.log('🔌 데이터베이스에 연결 중...');
    await client.connect();
    console.log('✅ 데이터베이스 연결 성공!');

    // 간단한 쿼리 테스트
    console.log('🔍 연결 테스트 쿼리 실행 중...');
    const result = await client.query(
      'SELECT version(), current_database(), current_user',
    );

    console.log('');
    console.log('📊 데이터베이스 정보:');
    console.log(
      `   - PostgreSQL 버전: ${result.rows[0].version.split(' ')[1]}`,
    );
    console.log(`   - 현재 데이터베이스: ${result.rows[0].current_database}`);
    console.log(`   - 현재 사용자: ${result.rows[0].current_user}`);

    // 스키마 확인
    const schemaResult = await client.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY schema_name
    `);

    console.log('');
    console.log('📁 사용 가능한 스키마:');
    schemaResult.rows.forEach((row) => {
      console.log(`   - ${row.schema_name}`);
    });

    console.log('');
    console.log('🎉 데이터베이스 연결 테스트가 성공적으로 완료되었습니다!');
  } catch (error) {
    console.log('');
    console.log('❌ 데이터베이스 연결 실패:');
    console.log(`   오류: ${error.message}`);
    console.log('');

    if (error.code === 'ENOTFOUND') {
      console.log('🔧 해결 방법:');
      console.log('1. 호스트 주소가 올바른지 확인하세요.');
      console.log('2. 인터넷 연결을 확인하세요.');
      console.log('3. Supabase 프로젝트가 활성화되어 있는지 확인하세요.');
    } else if (error.code === '28P01') {
      console.log('🔧 해결 방법:');
      console.log('1. 데이터베이스 패스워드를 다시 확인하세요.');
      console.log('2. Supabase 대시보드에서 패스워드를 재설정하세요.');
    } else {
      console.log('🔧 일반적인 해결 방법:');
      console.log('1. .env 파일의 모든 데이터베이스 설정을 확인하세요.');
      console.log('2. Supabase 프로젝트 상태를 확인하세요.');
      console.log('3. 방화벽 설정을 확인하세요.');
    }
  } finally {
    await client.end();
  }
}

// 스크립트 실행
testDatabaseConnection().catch(console.error);
