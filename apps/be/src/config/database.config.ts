import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { entities } from '../entities';

/**
 * 데이터베이스 설정 팩토리
 * USE_SUPABASE 환경변수에 따라 Supabase 또는 로컬 PostgreSQL을 선택적으로 사용합니다.
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
    const isDevelopment = nodeEnv === 'development';
    const useSupabase = configService.get<string>('USE_SUPABASE') === 'true';

    const baseConfig: Partial<PostgresConnectionOptions> = {
      type: 'postgres',
      entities: entities,
      synchronize: isDevelopment, // 운영환경에서는 false로 설정
      logging: isDevelopment ? ['query', 'error'] : ['error'],

      // 연결 풀 최적화 설정
      extra: {
        max: 10, // 최대 연결 수
        min: 2, // 최소 연결 수
        acquireTimeoutMillis: 60000,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 60000,
      },

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

    if (useSupabase) {
      // Supabase PostgreSQL 설정
      return DatabaseConfig.createSupabaseConfig(configService, baseConfig);
    } else {
      // 로컬 PostgreSQL 설정
      return DatabaseConfig.createLocalConfig(configService, baseConfig);
    }
  }

  /**
   * Supabase PostgreSQL 설정을 생성합니다.
   */
  private static createSupabaseConfig(
    configService: ConfigService,
    baseConfig: Partial<PostgresConnectionOptions>,
  ): TypeOrmModuleOptions {
    const databaseUrl = configService.get<string>('DATABASE_URL');

    if (databaseUrl) {
      // DATABASE_URL 사용 (권장 방식)
      return {
        ...baseConfig,
        url: databaseUrl,
        ssl: true, // Supabase는 SSL 필수
      } as TypeOrmModuleOptions;
    }

    // 개별 Supabase 설정 사용
    return {
      ...baseConfig,
      host: configService.get<string>('DB_HOST'),
      port: configService.get<number>('DB_PORT', 5432),
      username: configService.get<string>('DB_USERNAME'),
      password: configService.get<string>('DB_PASSWORD'),
      database: configService.get<string>('DB_DATABASE'),
      ssl: true, // Supabase는 SSL 필수
    } as TypeOrmModuleOptions;
  }

  /**
   * 로컬 PostgreSQL 설정을 생성합니다.
   */
  private static createLocalConfig(
    configService: ConfigService,
    baseConfig: Partial<PostgresConnectionOptions>,
  ): TypeOrmModuleOptions {
    const databaseUrl = configService.get<string>('DATABASE_URL');

    if (databaseUrl) {
      // DATABASE_URL 사용
      return {
        ...baseConfig,
        url: databaseUrl,
        ssl: false, // 로컬 개발에서는 SSL 비활성화
      } as TypeOrmModuleOptions;
    }

    // 개별 로컬 설정 사용
    return {
      ...baseConfig,
      host: configService.get<string>('DB_HOST', 'localhost'),
      port: configService.get<number>('DB_PORT', 5432),
      username: configService.get<string>('DB_USERNAME', 'postgres'),
      password: configService.get<string>('DB_PASSWORD', 'password'),
      database: configService.get<string>('DB_DATABASE', 'postgres'),
      ssl: false, // 로컬 개발에서는 SSL 비활성화
    } as TypeOrmModuleOptions;
  }

  /**
   * 필수 데이터베이스 환경 변수를 검증합니다.
   * @param configService - NestJS ConfigService 인스턴스
   * @throws Error - 필수 환경 변수가 없을 때
   */
  static validateDatabaseConfig(configService: ConfigService): void {
    const useSupabase = configService.get<string>('USE_SUPABASE') === 'true';
    const databaseUrl = configService.get<string>('DATABASE_URL');

    if (useSupabase) {
      // Supabase 사용 시 검증
      if (databaseUrl) {
        if (databaseUrl.includes('supabase.co')) {
          console.log(
            '✅ Supabase PostgreSQL DATABASE_URL을 사용하여 연결합니다.',
          );
        } else {
          console.log(
            '⚠️ USE_SUPABASE=true이지만 DATABASE_URL이 Supabase가 아닙니다.',
          );
        }
        return;
      }

      // DATABASE_URL이 없으면 개별 Supabase 설정 필수
      const requiredSupabaseEnvVars = [
        'DB_HOST',
        'DB_PORT',
        'DB_USERNAME',
        'DB_PASSWORD',
        'DB_DATABASE',
      ];

      const missingSupabaseEnvVars = requiredSupabaseEnvVars.filter(
        (envVar) => !configService.get<string>(envVar),
      );

      if (missingSupabaseEnvVars.length > 0) {
        throw new Error(
          `❌ Supabase 사용을 위한 다음 환경 변수들이 설정되지 않았습니다: ${missingSupabaseEnvVars.join(', ')}`,
        );
      }

      console.log('✅ 개별 Supabase 설정을 사용합니다.');
    } else {
      // 로컬 PostgreSQL 사용 시 검증
      if (databaseUrl) {
        console.log('✅ 로컬 PostgreSQL DATABASE_URL을 사용하여 연결합니다.');
        return;
      }

      // DATABASE_URL이 없으면 개별 로컬 설정 필수
      const requiredLocalEnvVars = [
        'DB_HOST',
        'DB_PORT',
        'DB_USERNAME',
        'DB_PASSWORD',
        'DB_DATABASE',
      ];

      const missingLocalEnvVars = requiredLocalEnvVars.filter(
        (envVar) => !configService.get<string>(envVar),
      );

      if (missingLocalEnvVars.length > 0) {
        throw new Error(
          `❌ 로컬 PostgreSQL 사용을 위한 다음 환경 변수들이 설정되지 않았습니다: ${missingLocalEnvVars.join(', ')}`,
        );
      }

      console.log('✅ 개별 로컬 PostgreSQL 설정을 사용합니다.');
    }
  }

  /**
   * Supabase 연결 상태를 확인합니다.
   * @param configService - NestJS ConfigService 인스턴스
   * @returns Supabase 연결 여부
   */
  static isSupabaseConnection(configService: ConfigService): boolean {
    const useSupabase = configService.get<string>('USE_SUPABASE') === 'true';

    if (useSupabase) {
      return true;
    }

    // 하위 호환성을 위해 기존 로직도 유지
    const databaseUrl = configService.get<string>('DATABASE_URL');
    const dbHost = configService.get<string>('DB_HOST');

    return !!(
      (databaseUrl && databaseUrl.includes('supabase.co')) ||
      (dbHost && dbHost.includes('supabase.co'))
    );
  }

  /**
   * 현재 사용 중인 데이터베이스 타입을 반환합니다.
   * @param configService - NestJS ConfigService 인스턴스
   * @returns 데이터베이스 타입 ('supabase' | 'local')
   */
  static getDatabaseType(configService: ConfigService): 'supabase' | 'local' {
    const useSupabase = configService.get<string>('USE_SUPABASE') === 'true';
    return useSupabase ? 'supabase' : 'local';
  }
}
