/**
 * Supabase 데이터베이스 type 컬럼 문제 해결 스크립트
 */

const { Client } = require('pg');
require('dotenv').config();

async function fixPostTypeColumn() {
  // DATABASE_URL에서 연결 정보 파싱
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL이 설정되지 않았습니다.');
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    await client.connect();
    console.log('🔗 Supabase 데이터베이스에 연결되었습니다.');

    // 1. 현재 posts 테이블 상태 확인
    const checkTableQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'posts' AND column_name = 'type';
    `;

    const tableInfo = await client.query(checkTableQuery);
    console.log('📊 현재 type 컬럼 상태:', tableInfo.rows);

    // 2. type 컬럼이 이미 존재하는지 확인
    if (tableInfo.rows.length > 0) {
      console.log(
        '⚠️  type 컬럼이 이미 존재합니다. 기존 데이터를 업데이트합니다.',
      );

      // 기존 NULL 값들을 기본값으로 업데이트
      const updateQuery = `
        UPDATE posts 
        SET type = 'ANALYSIS' 
        WHERE type IS NULL OR type = '';
      `;

      const updateResult = await client.query(updateQuery);
      console.log(
        `✅ ${updateResult.rowCount}개의 레코드가 업데이트되었습니다.`,
      );
    } else {
      console.log('📝 type 컬럼을 새로 추가합니다.');

      // 3. type 컬럼을 기본값과 함께 추가
      const addColumnQuery = `
        ALTER TABLE posts 
        ADD COLUMN type character varying(50) DEFAULT 'ANALYSIS' NOT NULL;
      `;

      await client.query(addColumnQuery);
      console.log('✅ type 컬럼이 추가되었습니다.');
    }

    // 4. 컬럼 코멘트 추가
    const commentQuery = `
      COMMENT ON COLUMN posts.type IS '게시물 타입 (ANALYSIS, CHEERING, HIGHLIGHT)';
    `;

    await client.query(commentQuery);
    console.log('✅ 컬럼 코멘트가 추가되었습니다.');

    // 5. 결과 확인
    const verifyQuery = `
      SELECT type, COUNT(*) as count 
      FROM posts 
      GROUP BY type 
      ORDER BY count DESC;
    `;

    const verifyResult = await client.query(verifyQuery);
    console.log('📊 type별 게시물 수:', verifyResult.rows);

    console.log('🎉 데이터베이스 수정이 완료되었습니다!');
    console.log('🚀 이제 애플리케이션을 다시 시작할 수 있습니다.');
  } catch (error) {
    console.error('❌ 데이터베이스 수정 실패:', error.message);
    console.error('상세 오류:', error);
  } finally {
    await client.end();
  }
}

fixPostTypeColumn();
