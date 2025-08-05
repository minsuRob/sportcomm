import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { entities } from '../entities';

// 환경 변수 로드
config();

const configService = new ConfigService();

/**
 * TypeORM CLI 및 마이그레이션용 데이터 소스
 * Supabase PostgreSQL 연결을 지원합니다.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',

  // DATABASE_URL 우선 사용 (Supabase 권장)
  url: configService.get<string>('DATABASE_URL') || undefined,

  // 개별 설정 (백업용)
  host: configService.get<string>('DB_HOST', 'localhost'),
  port: configService.get<number>('DB_PORT', 5432),
  username: configService.get<string>('DB_USERNAME', 'postgres'),
  password: configService.get<string>('DB_PASSWORD', 'password'),
  database: configService.get<string>('DB_DATABASE', 'postgres'),

  // Supabase SSL 설정
  ssl: {
    rejectUnauthorized: false,
  },

  // 엔티티 및 마이그레이션 설정
  entities: entities,
  migrations: ['src/database/migrations/*.ts'],
  migrationsTableName: 'typeorm_migrations',

  // 개발 환경 설정
  synchronize: false, // 마이그레이션 사용으로 false 설정
  logging: configService.get<string>('NODE_ENV') === 'development',

  // 연결 풀 설정
  extra: {
    max: 10,
    min: 2,
    acquireTimeoutMillis: 60000,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 60000,
  },
});

/**
 * 데이터베이스 초기화 함수
 * 애플리케이션 시작 시 데이터베이스 연결을 초기화합니다.
 */
export async function initializeDatabase(): Promise<void> {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ 데이터베이스 연결이 초기화되었습니다.');
    }
  } catch (error) {
    console.error('❌ 데이터베이스 초기화 실패:', error);
    throw error;
  }
}

/**
 * 데이터베이스 상태 확인 함수
 * 헬스체크에서 사용됩니다.
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    if (!AppDataSource.isInitialized) {
      return false;
    }

    // 간단한 쿼리로 연결 상태 확인
    await AppDataSource.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('❌ 데이터베이스 헬스체크 실패:', error);
    return false;
  }
}

/**
 * 데이터베이스 정보 출력 함수
 * 애플리케이션 시작 시 데이터베이스 정보를 출력합니다.
 */
export function printDatabaseInfo(): void {
  const options = AppDataSource.options as any; // 타입 캐스팅으로 해결

  console.log('\n💾 데이터베이스 연결 정보:');

  if (options.url) {
    const isSupabase = options.url.includes('supabase.co');
    console.log(
      `   - 연결 방식: ${isSupabase ? 'Supabase PostgreSQL' : 'DATABASE_URL'}`,
    );
    console.log(`   - URL: ${options.url.replace(/:[^:@]*@/, ':****@')}`); // 비밀번호 마스킹
  } else {
    console.log(
      `   - 호스트: ${options.host || 'localhost'}:${options.port || 5432}`,
    );
    console.log(`   - 데이터베이스: ${options.database || 'postgres'}`);
    console.log(`   - 사용자: ${options.username || 'postgres'}`);
  }

  console.log(`   - SSL: ${options.ssl ? '활성화' : '비활성화'}`);
  console.log(`   - 동기화: ${options.synchronize ? '활성화' : '비활성화'}`);
  console.log(`   - 로깅: ${options.logging ? '활성화' : '비활성화'}`);
}

// 데이터 소스 초기화 (CLI 사용시)
if (require.main === module) {
  AppDataSource.initialize()
    .then(() => {
      console.log('✅ 데이터 소스가 초기화되었습니다.');
      printDatabaseInfo();
    })
    .catch((error) => {
      console.error('❌ 데이터 소스 초기화 실패:', error);
    });
}
