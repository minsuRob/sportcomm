#!/usr/bin/env ts-node

/**
 * Supabase 데이터베이스 연결 테스트 스크립트
 *
 * 사용법:
 *   npm run test:db-connection
 *   또는
 *   npx ts-node scripts/test-supabase-connection.ts
 */

import { Client } from 'pg';
import * as dotenv from 'dotenv';
import { join } from 'path';

// 환경 변수 로드
dotenv.config({ path: join(__dirname, '../.env.development') });

interface ConnectionConfig {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  connectionString?: string;
}

class SupabaseConnectionTester {
  private config: ConnectionConfig;

  constructor() {
    this.config = this.parseEnvironmentVariables();
  }

  /**
   * 환경 변수에서 연결 설정을 파싱합니다.
   */
  private parseEnvironmentVariables(): ConnectionConfig {
    const databaseUrl = process.env.DATABASE_URL;

    if (databaseUrl) {
      console.log('📋 DATABASE_URL을 사용하여 연결을 시도합니다.');
      return { connectionString: databaseUrl };
    }

    // 개별 환경 변수 사용
    const host = process.env.SUPABASE_DB_HOST || process.env.DB_HOST;
    const port = parseInt(process.env.SUPABASE_DB_PORT || process.env.DB_PORT || '5432');
    const username = process.env.SUPABASE_DB_USERNAME || process.env.DB_USERNAME;
    const password = process.env.SUPABASE_DB_PASSWORD || process.env.DB_PASSWORD;
    const database = process.env.SUPABASE_DB_DATABASE || process.env.DB_DATABASE;

    console.log('📋 개별 환경 변수를 사용하여 연결을 시도합니다.');

    return {
      host,
      port,
      username,
      password,
      database,
    };
  }

  /**
   * 환경 변수 유효성을 검증합니다.
   */
  private validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.config.connectionString) {
      // DATABASE_URL 검증
      if (!this.config.connectionString.startsWith('postgresql://') &&
          !this.config.connectionString.startsWith('postgres://')) {
        errors.push('DATABASE_URL은 "postgresql://" 또는 "postgres://"로 시작해야 합니다.');
      }

      if (!this.config.connectionString.includes('supabase.co')) {
        errors.push('DATABASE_URL이 Supabase 호스트를 포함하지 않습니다.');
      }
    } else {
      // 개별 설정 검증
      if (!this.config.host) {
        errors.push('DB_HOST 또는 SUPABASE_DB_HOST가 설정되지 않았습니다.');
      } else if (!this.config.host.includes('supabase.co')) {
        errors.push(`호스트가 Supabase 호스트가 아닙니다: ${this.config.host}`);
      }

      if (!this.config.username) {
        errors.push('DB_USERNAME 또는 SUPABASE_DB_USERNAME이 설정되지 않았습니다.');
      }

      if (!this.config.password) {
        errors.push('DB_PASSWORD 또는 SUPABASE_DB_PASSWORD가 설정되지 않았습니다.');
      }

      if (!this.config.database) {
        errors.push('DB_DATABASE 또는 SUPABASE_DB_DATABASE가 설정되지 않았습니다.');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 데이터베이스 연결을 테스트합니다.
   */
  async testConnection(): Promise<void> {
    console.log('🔗 Supabase 데이터베이스 연결 테스트를 시작합니다...\n');

    // 설정 출력
    this.printConfig();

    // 설정 유효성 검증
    const validation = this.validateConfig();
    if (!validation.isValid) {
      console.error('❌ 설정 유효성 검사 실패:');
      validation.errors.forEach(error => console.error(`   - ${error}`));
      console.log('\n💡 올바른 설정 예시:');
      this.printCorrectConfig();
      process.exit(1);
    }

    // 연결 테스트
    const client = new Client(this.getClientConfig());

    try {
      console.log('🔄 데이터베이스에 연결 중...');
      await client.connect();
      console.log('✅ 데이터베이스 연결 성공!');

      // 기본 쿼리 실행
      console.log('\n📊 기본 정보 조회 중...');
      const result = await client.query(`
        SELECT
          current_database() as database_name,
          current_user as username,
          version() as postgres_version,
          inet_server_addr() as server_ip,
          inet_server_port() as server_port
      `);

      const info = result.rows[0];
      console.log('📋 데이터베이스 정보:');
      console.log(`   - 데이터베이스: ${info.database_name}`);
      console.log(`   - 사용자: ${info.username}`);
      console.log(`   - PostgreSQL 버전: ${info.postgres_version}`);
      console.log(`   - 서버 IP: ${info.server_ip || 'N/A'}`);
      console.log(`   - 서버 포트: ${info.server_port || 'N/A'}`);

      // 테이블 존재 여부 확인
      console.log('\n🔍 주요 테이블 존재 여부 확인...');
      const tableCheck = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name IN ('users', 'chat_channels', 'chat_messages', 'chat_channel_members')
        ORDER BY table_name
      `);

      if (tableCheck.rows.length > 0) {
        console.log('✅ 발견된 테이블:');
        tableCheck.rows.forEach(row => console.log(`   - ${row.table_name}`));
      } else {
        console.log('⚠️ 주요 애플리케이션 테이블이 발견되지 않았습니다.');
        console.log('   마이그레이션을 실행해야 할 수 있습니다.');
      }

      console.log('\n🎉 모든 테스트가 성공적으로 완료되었습니다!');

    } catch (error) {
      console.error('❌ 데이터베이스 연결 실패:');
      console.error(`   오류: ${error.message}`);

      if (error.message.includes('Tenant or user not found')) {
        console.log('\n💡 "Tenant or user not found" 오류 해결 방법:');
        console.log('   1. 사용자명이 "postgres"인지 확인');
        console.log('   2. 데이터베이스명이 "postgres"인지 확인');
        console.log('   3. 호스트가 "db.hgekmqvscnjcuzyduchy.supabase.co"인지 확인');
        console.log('   4. 패스워드가 올바른지 확인');
      } else if (error.message.includes('password authentication failed')) {
        console.log('\n💡 패스워드 인증 실패 해결 방법:');
        console.log('   1. Supabase 대시보드에서 패스워드 확인');
        console.log('   2. 환경 변수에 올바른 패스워드 설정');
        console.log('   3. 특수 문자가 포함된 경우 URL 인코딩 확인');
      } else if (error.message.includes('timeout') || error.message.includes('ENOTFOUND')) {
        console.log('\n💡 네트워크 연결 문제 해결 방법:');
        console.log('   1. 인터넷 연결 확인');
        console.log('   2. 방화벽 설정 확인');
        console.log('   3. 호스트명이 올바른지 확인');
      }

      this.printCorrectConfig();
      process.exit(1);

    } finally {
      await client.end();
    }
  }

  /**
   * 현재 설정을 출력합니다.
   */
  private printConfig(): void {
    console.log('📋 현재 연결 설정:');

    if (this.config.connectionString) {
      // 패스워드 마스킹
      const maskedUrl = this.config.connectionString.replace(
        /:([^:@]+)@/,
        ':****@'
      );
      console.log(`   DATABASE_URL: ${maskedUrl}`);
    } else {
      console.log(`   호스트: ${this.config.host || '❌ 미설정'}`);
      console.log(`   포트: ${this.config.port || '❌ 미설정'}`);
      console.log(`   사용자명: ${this.config.username || '❌ 미설정'}`);
      console.log(`   패스워드: ${this.config.password ? '****' : '❌ 미설정'}`);
      console.log(`   데이터베이스: ${this.config.database || '❌ 미설정'}`);
    }
    console.log('');
  }

  /**
   * 올바른 설정 예시를 출력합니다.
   */
  private printCorrectConfig(): void {
    console.log('\n💡 올바른 Supabase 설정 예시:');
    console.log('');
    console.log('방법 1: DATABASE_URL 사용 (권장)');
    console.log('   DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@db.hgekmqvscnjcuzyduchy.supabase.co:5432/postgres');
    console.log('');
    console.log('방법 2: 개별 환경 변수 사용');
    console.log('   DB_HOST=db.hgekmqvscnjcuzyduchy.supabase.co');
    console.log('   DB_PORT=5432');
    console.log('   DB_USERNAME=postgres');
    console.log('   DB_PASSWORD=[YOUR_PASSWORD]');
    console.log('   DB_DATABASE=postgres');
    console.log('');
    console.log('⚠️ [YOUR_PASSWORD]를 실제 Supabase 프로젝트 패스워드로 교체하세요.');
  }

  /**
   * pg Client 설정을 반환합니다.
   */
  private getClientConfig(): any {
    if (this.config.connectionString) {
      return {
        connectionString: this.config.connectionString,
        ssl: {
          rejectUnauthorized: false,
        },
      };
    }

    return {
      host: this.config.host,
      port: this.config.port,
      user: this.config.username,
      password: this.config.password,
      database: this.config.database,
      ssl: {
        rejectUnauthorized: false,
      },
    };
  }
}

// 스크립트 실행
async function main() {
  const tester = new SupabaseConnectionTester();
  await tester.testConnection();
}

// 스크립트가 직접 실행될 때만 main 함수 호출
if (require.main === module) {
  main().catch((error) => {
    console.error('💥 예상치 못한 오류가 발생했습니다:', error);
    process.exit(1);
  });
}

export { SupabaseConnectionTester };
