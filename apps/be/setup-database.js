#!/usr/bin/env node

/**
 * Supabase 데이터베이스 설정 스크립트
 *
 * 이 스크립트는 사용자가 Supabase 데이터베이스 패스워드를 설정할 수 있도록 도와줍니다.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function setupDatabase() {
  console.log('🚀 Supabase 데이터베이스 설정을 시작합니다...');
  console.log('');

  console.log('📋 현재 프로젝트 정보:');
  console.log('   - 프로젝트 ID: hgekmqvscnjcuzyduchy');
  console.log('   - 프로젝트 URL: https://hgekmqvscnjcuzyduchy.supabase.co');
  console.log('   - 데이터베이스 호스트: db.hgekmqvscnjcuzyduchy.supabase.co');
  console.log('');

  console.log('🔍 데이터베이스 패스워드 확인 방법:');
  console.log('1. https://supabase.com/dashboard 접속');
  console.log('2. 프로젝트 "hgekmqvscnjcuzyduchy" 선택');
  console.log('3. Settings → Database 메뉴 이동');
  console.log('4. Connection string 섹션에서 패스워드 확인');
  console.log('5. 또는 "Reset database password" 버튼으로 새 패스워드 생성');
  console.log('');

  const password = await question(
    '📝 Supabase 데이터베이스 패스워드를 입력하세요: ',
  );

  if (!password || password.trim() === '') {
    console.log('❌ 패스워드가 입력되지 않았습니다.');
    rl.close();
    return;
  }

  try {
    // .env 파일 읽기
    const envPath = path.join(__dirname, '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');

    // 패스워드 업데이트
    envContent = envContent.replace(
      /DATABASE_URL=postgresql:\/\/postgres:.*?@db\.hgekmqvscnjcuzyduchy\.supabase\.co:5432\/postgres/,
      `DATABASE_URL=postgresql://postgres:${password}@db.hgekmqvscnjcuzyduchy.supabase.co:5432/postgres`,
    );

    envContent = envContent.replace(
      /DB_PASSWORD=.*$/m,
      `DB_PASSWORD=${password}`,
    );

    // .env 파일 저장
    fs.writeFileSync(envPath, envContent);

    console.log('');
    console.log('✅ 데이터베이스 설정이 완료되었습니다!');
    console.log('');
    console.log('🔄 다음 단계:');
    console.log('1. 연결 테스트: node test-db-connection.js');
    console.log('2. 서버 시작: npm run start:dev');
  } catch (error) {
    console.error('❌ 설정 중 오류가 발생했습니다:', error.message);
  }

  rl.close();
}

// 스크립트 실행
setupDatabase().catch(console.error);
