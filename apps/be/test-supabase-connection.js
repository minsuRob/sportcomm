/**
 * Supabase PostgreSQL 연결 테스트 스크립트
 *
 * 사용법: node test-supabase-connection.js
 */

const { Client } = require('pg');
require('dotenv').config();

async function testSupabaseConnection() {
  console.log('🔍 Supabase PostgreSQL 연결 테스트 시작...\n');

  // 환경 변수 확인
  const databaseUrl = process.env.DATABASE_URL;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('📋 환경 변수 확인:');
  console.log(`   DATABASE_URL: ${databaseUrl ? '✅ 설정됨' : '❌ 없음'}`);
  console.log(`   SUPABASE_URL: ${supabaseUrl ? '✅ 설정됨' : '❌ 없음'}`);
  console.log(
    `   SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅ 설정됨' : '❌ 없음'}`,
  );
  console.log(
    `   SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? '✅ 설정됨' : '❌ 없음'}\n`,
  );

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL이 설정되지 않았습니다.');
    console.log('💡 .env 파일에 다음과 같이 설정하세요:');
    console.log(
      '   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres\n',
    );
    return;
  }

  // PostgreSQL 연결 테스트
  const client = new Client({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    console.log('🔌 PostgreSQL 데이터베이스 연결 중...');
    await client.connect();
    console.log('✅ PostgreSQL 연결 성공!\n');

    // 기본 쿼리 테스트
    console.log('📊 데이터베이스 정보 조회:');
    const versionResult = await client.query('SELECT version()');
    console.log(
      `   PostgreSQL 버전: ${versionResult.rows[0].version.split(' ')[1]}`,
    );

    const dbResult = await client.query('SELECT current_database()');
    console.log(`   현재 데이터베이스: ${dbResult.rows[0].current_database}`);

    const userResult = await client.query('SELECT current_user');
    console.log(`   현재 사용자: ${userResult.rows[0].current_user}`);

    // 스키마 확인
    const schemaResult = await client.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY schema_name
    `);
    console.log(
      `   사용 가능한 스키마: ${schemaResult.rows.map((row) => row.schema_name).join(', ')}\n`,
    );

    // 테이블 확인
    const tableResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    if (tableResult.rows.length > 0) {
      console.log('📋 기존 테이블:');
      tableResult.rows.forEach((row) => {
        console.log(`   - ${row.table_name}`);
      });
    } else {
      console.log('📋 테이블이 없습니다. (새 데이터베이스)');
    }

    console.log('\n🎉 Supabase PostgreSQL 연결 테스트 완료!');
    console.log('💡 이제 다음 단계를 진행하세요:');
    console.log('   1. npm run start:dev 로 서버 시작');
    console.log('   2. GraphQL Playground에서 API 테스트');
    console.log('   3. 필요시 마이그레이션 실행\n');
  } catch (error) {
    console.error('❌ PostgreSQL 연결 실패:', error.message);
    console.log('\n🔧 문제 해결 방법:');
    console.log('   1. DATABASE_URL이 올바른지 확인');
    console.log('   2. Supabase 프로젝트가 활성화되어 있는지 확인');
    console.log('   3. 데이터베이스 비밀번호가 정확한지 확인');
    console.log('   4. 네트워크 연결 상태 확인\n');
  } finally {
    await client.end();
  }
}

// Supabase 클라이언트 테스트
async function testSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('⚠️ Supabase 클라이언트 테스트 건너뜀 (환경 변수 없음)\n');
    return;
  }

  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    console.log('🔌 Supabase 클라이언트 연결 테스트...');

    // 간단한 쿼리 테스트 (auth 테이블은 항상 존재)
    const { data, error } = await supabase
      .from('auth.users')
      .select('count')
      .limit(1);

    if (error && !error.message.includes('permission denied')) {
      throw error;
    }

    console.log('✅ Supabase 클라이언트 연결 성공!\n');
  } catch (error) {
    console.error('❌ Supabase 클라이언트 연결 실패:', error.message);
    console.log('💡 SUPABASE_URL과 SUPABASE_ANON_KEY를 확인하세요.\n');
  }
}

// 메인 실행
async function main() {
  await testSupabaseConnection();
  await testSupabaseClient();
}

main().catch(console.error);
