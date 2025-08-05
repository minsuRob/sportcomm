import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { entities } from '../entities';

/**
 * 데이터베이스 설정 팩토리
 * 환경별로 다른 데이터베이스 설정을 제공합니다.
 * Supabase PostgreSQL 연동을 지원합니다.
 */
export class DatabaseConfig {
  /**
   * TypeORM 설정을 생성합니다.
   * @param configService - NestJS ConfigService 인스턴스
   * @returns TypeORM 설정 객체
   */
  static createTypeOrmOptions(
    configService: ConfigService,
  ): TypeOrmModuleOptions {
    const nodeEnv = configService.get<string>('NODE_ENV', 'development');
    const isProduction = nodeEnv === 'production';
    const isDevelopment = nodeEnv === 'development';

    // DATABASE_URL이 있으면 우선 사용 (Supabase, Heroku, Railway 등)
    const databaseUrl = configService.get<string>('DATABASE_URL');

    const baseConfig: Partial<PostgresConnectionOptions> = {
      type: 'postgres',
      entities: entities,
      synchronize: isDevelopment, // 운영환경에서는 false로 설정
      logging: isDevelopment ? ['query', 'error'] : ['error'],

      // Supabase 연결 풀 최적화 설정
      extra: {
        max: 10, // 최대 연결 수
        min: 2, // 최소 연결 수
        acquireTimeoutMillis: 60000,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 60000,
      },

      // SSL 설정 (로컬 개발에서는 비활성화, Supabase에서는 필수)
      ssl: false,

      // 메타데이터 캐싱 활성화
      cache: {
        type: 'database',
        tableName: 'query_result_cache',
        duration: 30000, // 30초
      },

      // 마이그레이션 설정
      migrationsRun: false, // 수동으로 마이그레이션 실행
      migrations: ['dist/database/migrations/*.js'],
      migrationsTableName: 'typeorm_migrations',
    };

    // DATABASE_URL이 있으면 사용 (Supabase 권장 방식)
    if (databaseUrl) {
      return {
        ...baseConfig,
        url: databaseUrl,
      } as TypeOrmModuleOptions;
    }

    // 개별 설정 사용 (백업 방식)
    return {
      ...baseConfig,
      host: configService.get<string>('DB_HOST', 'localhost'),
      port: configService.get<number>('DB_PORT', 5432),
      username: configService.get<string>('DB_USERNAME', 'postgres'),
      password: configService.get<string>('DB_PASSWORD', 'password'),
      database: configService.get<string>('DB_DATABASE', 'postgres'),
    } as TypeOrmModuleOptions;
  }

  /**
   * 필수 데이터베이스 환경 변수를 검증합니다.
   * @param configService - NestJS ConfigService 인스턴스
   * @throws Error - 필수 환경 변수가 없을 때
   */
  static validateDatabaseConfig(configService: ConfigService): void {
    const databaseUrl = configService.get<string>('DATABASE_URL');

    // DATABASE_URL이 있으면 개별 설정은 선택사항
    if (databaseUrl) {
      // Supabase URL 형식 검증
      if (databaseUrl.includes('supabase.co')) {
        console.log(
          '✅ Supabase PostgreSQL DATABASE_URL을 사용하여 연결합니다.',
        );
      } else {
        console.log('✅ DATABASE_URL을 사용하여 데이터베이스에 연결합니다.');
      }
      return;
    }

    // DATABASE_URL이 없으면 개별 설정 필수
    const requiredDbEnvVars = [
      'DB_HOST',
      'DB_PORT',
      'DB_USERNAME',
      'DB_PASSWORD',
      'DB_DATABASE',
    ];

    const missingDbEnvVars = requiredDbEnvVars.filter(
      (envVar) => !configService.get<string>(envVar),
    );

    if (missingDbEnvVars.length > 0) {
      throw new Error(
        `❌ 다음 데이터베이스 환경 변수들이 설정되지 않았습니다: ${missingDbEnvVars.join(', ')}`,
      );
    }

    console.log('✅ 개별 데이터베이스 설정을 사용합니다.');
  }

  /**
   * Supabase 연결 상태를 확인합니다.
   * @param configService - NestJS ConfigService 인스턴스
   * @returns Supabase 연결 여부
   */
  static isSupabaseConnection(configService: ConfigService): boolean {
    const databaseUrl = configService.get<string>('DATABASE_URL');
    const dbHost = configService.get<string>('DB_HOST');

    return !!(
      (databaseUrl && databaseUrl.includes('supabase.co')) ||
      (dbHost && dbHost.includes('supabase.co'))
    );
  }
}
