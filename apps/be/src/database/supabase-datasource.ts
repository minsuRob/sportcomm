import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { entities } from '../entities';

// 환경 변수 로드
config();

/**
 * Supabase 전용 TypeORM 데이터소스 설정
 *
 * MCP를 통해 확인된 실제 Supabase 프로젝트 정보를 사용합니다.
 * 연결 문제가 발생하면 이 설정을 사용하세요.
 */
export const SupabaseDataSource = new DataSource({
  type: 'postgres',

  // 실제 Supabase 프로젝트 정보 (MCP에서 확인됨)
  host: 'db.iikgupdmnlmhycmtuqzj.supabase.co',
  port: 5432,
  username: 'postgres',
  password: process.env.DB_PASSWORD || 'YOUR_ACTUAL_PASSWORD_HERE',
  database: 'postgres',

  // 엔티티 설정
  entities: entities,

  // 마이그레이션 설정
  migrations: ['src/database/migrations/*.ts'],
  migrationsTableName: 'migrations',

  // Supabase는 운영 환경이므로 synchronize 비활성화
  synchronize: false,

  // 로깅 설정
  logging: process.env.NODE_ENV === 'development' ? ['error'] : false,

  // 연결 풀 설정 (Supabase 최적화)
  extra: {
    connectionLimit: 5, // Supabase 무료 플랜 고려
    acquireTimeout: 30000,
    timeout: 30000,
    idleTimeout: 30000,
  },

  // Supabase SSL 필수 설정
  ssl: {
    rejectUnauthorized: false,
  },

  // 연결 재시도 설정
  maxQueryExecutionTime: 30000,
});

/**
 * Supabase 데이터베이스 연결 초기화 함수
 */
export async function initializeSupabaseDatabase(): Promise<void> {
  try {
    if (!SupabaseDataSource.isInitialized) {
      console.log('🔄 Supabase 데이터베이스 연결 중...');
      await SupabaseDataSource.initialize();
      console.log('✅ Supabase 데이터베이스 연결 성공!');

      // 연결 테스트
      const result = await SupabaseDataSource.query(
        'SELECT current_database(), current_user, version()',
      );
      console.log('📊 데이터베이스 정보:', {
        database: result[0].current_database,
        user: result[0].current_user,
        version: result[0].version.split(' ')[1],
      });
    }
  } catch (error) {
    console.error('❌ Supabase 데이터베이스 연결 실패:', error.message);

    if (error.code === 'ENOTFOUND') {
      console.log('🔧 해결 방법:');
      console.log('1. 인터넷 연결을 확인하세요.');
      console.log('2. Supabase 프로젝트가 활성화되어 있는지 확인하세요.');
      console.log('3. 호스트 주소가 올바른지 확인하세요.');
    } else if (error.code === '28P01') {
      console.log('🔧 해결 방법:');
      console.log(
        '1. SUPABASE_SETUP.md 파일을 참조하여 데이터베이스 패스워드를 확인하세요.',
      );
      console.log('2. .env 파일의 DB_PASSWORD를 올바른 값으로 설정하세요.');
    }

    throw error;
  }
}

/**
 * Supabase 데이터베이스 연결 종료 함수
 */
export async function closeSupabaseDatabase(): Promise<void> {
  try {
    if (SupabaseDataSource.isInitialized) {
      await SupabaseDataSource.destroy();
      console.log('✅ Supabase 데이터베이스 연결이 안전하게 종료되었습니다.');
    }
  } catch (error) {
    console.error('❌ Supabase 데이터베이스 연결 종료 중 오류:', error);
    throw error;
  }
}

/**
 * Supabase 데이터베이스 상태 확인 함수
 */
export async function checkSupabaseDatabaseHealth(): Promise<boolean> {
  try {
    if (!SupabaseDataSource.isInitialized) {
      return false;
    }

    await SupabaseDataSource.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Supabase 데이터베이스 상태 확인 실패:', error);
    return false;
  }
}

// 기본 익스포트
export default SupabaseDataSource;
