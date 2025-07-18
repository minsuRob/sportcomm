import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { entities } from '../entities';

// 환경 변수 로드
config();

/**
 * TypeORM 데이터소스 설정
 *
 * 데이터베이스 연결을 관리하고 마이그레이션을 실행하는 데 사용됩니다.
 * 개발, 테스트, 운영 환경에 따라 다른 설정을 사용할 수 있습니다.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_DATABASE || 'sportcomm',

  // 엔티티 설정
  entities: entities,

  // 마이그레이션 설정
  migrations: ['src/database/migrations/*.ts'],
  migrationsTableName: 'migrations',

  // 개발 환경에서만 스키마 동기화 활성화
  synchronize: process.env.NODE_ENV === 'development',

  // 로깅 설정
  logging:
    process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],

  // 연결 풀 설정
  extra: {
    connectionLimit: 10,
    acquireTimeout: 60000,
    timeout: 60000,
  },

  // SSL 설정 (운영 환경에서 활성화)
  ssl:
    process.env.NODE_ENV === 'production'
      ? {
          rejectUnauthorized: false,
        }
      : false,

  // 메타데이터 캐싱 활성화
  cache: {
    type: 'database',
    tableName: 'query_result_cache',
    duration: 30000, // 30초
  },
});

/**
 * 데이터베이스 연결 초기화 함수
 * 애플리케이션 시작 시 호출됩니다.
 */
export async function initializeDatabase(): Promise<void> {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ 데이터베이스 연결이 성공적으로 설정되었습니다.');
    }
  } catch (error) {
    console.error('❌ 데이터베이스 연결 중 오류가 발생했습니다:', error);
    throw error;
  }
}

/**
 * 데이터베이스 연결 종료 함수
 * 애플리케이션 종료 시 호출됩니다.
 */
export async function closeDatabase(): Promise<void> {
  try {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('✅ 데이터베이스 연결이 안전하게 종료되었습니다.');
    }
  } catch (error) {
    console.error('❌ 데이터베이스 연결 종료 중 오류가 발생했습니다:', error);
    throw error;
  }
}

/**
 * 데이터베이스 상태 확인 함수
 * 헬스체크 및 모니터링에 사용됩니다.
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
    console.error('데이터베이스 상태 확인 실패:', error);
    return false;
  }
}

/**
 * 개발 환경 전용 데이터베이스 리셋 함수
 * 주의: 운영 환경에서는 절대 사용하지 마세요!
 */
export async function resetDatabaseForDevelopment(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('운영 환경에서는 데이터베이스 리셋이 불가능합니다.');
  }

  try {
    console.log('⚠️  개발 환경 데이터베이스를 리셋합니다...');

    // 모든 테이블 삭제
    await AppDataSource.dropDatabase();

    // 스키마 재생성
    await AppDataSource.synchronize(true);

    console.log('✅ 개발 환경 데이터베이스가 성공적으로 리셋되었습니다.');
  } catch (error) {
    console.error('❌ 데이터베이스 리셋 중 오류가 발생했습니다:', error);
    throw error;
  }
}

/**
 * 마이그레이션 실행 함수
 * 배포 시 데이터베이스 스키마를 업데이트합니다.
 */
export async function runMigrations(): Promise<void> {
  try {
    console.log('🔄 데이터베이스 마이그레이션을 실행합니다...');

    const migrations = await AppDataSource.runMigrations({
      transaction: 'each',
    });

    if (migrations.length === 0) {
      console.log('✅ 실행할 마이그레이션이 없습니다.');
    } else {
      console.log(
        `✅ ${migrations.length}개의 마이그레이션이 성공적으로 실행되었습니다.`,
      );
      migrations.forEach((migration) => {
        console.log(`   - ${migration.name}`);
      });
    }
  } catch (error) {
    console.error('❌ 마이그레이션 실행 중 오류가 발생했습니다:', error);
    throw error;
  }
}

/**
 * 데이터베이스 연결 정보 출력 함수
 * 디버깅 및 모니터링에 사용됩니다.
 */
export function printDatabaseInfo(): void {
  console.log('📊 데이터베이스 연결 정보:');
  console.log(`   - 호스트: ${process.env.DB_HOST || 'localhost'}`);
  console.log(`   - 포트: ${process.env.DB_PORT || '5432'}`);
  console.log(`   - 데이터베이스: ${process.env.DB_DATABASE || 'sportcomm'}`);
  console.log(`   - 사용자: ${process.env.DB_USERNAME || 'postgres'}`);
  console.log(`   - 환경: ${process.env.NODE_ENV || 'development'}`);
  console.log(
    `   - 동기화: ${process.env.NODE_ENV === 'development' ? '활성화' : '비활성화'}`,
  );
}

// 기본 익스포트
export default AppDataSource;
