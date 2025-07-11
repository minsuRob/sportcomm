import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';

// TypeORM CLI가 실행되는 위치(프로젝트 루트)를 기준으로 .env 파일 경로를 설정합니다.
// 이 경로가 올바르지 않으면 환경 변수를 제대로 불러오지 못할 수 있습니다.
config({ path: 'apps/be/.env' });

/**
 * @description TypeORM CLI가 마이그레이션을 생성하고 실행할 때 사용하는 데이터 소스 설정입니다.
 * @summary 이 설정은 보안과 유연성을 위해 `.env` 파일의 환경 변수에서 연결 정보를 읽어옵니다.
 * 환경 변수가 없을 경우를 대비하여 안전한 기본값을 제공합니다.
 * CLI는 `ts-node`를 통해 TypeScript 파일을 직접 실행하므로, `entities`와 `migrations` 경로는
 * `src` 폴더 내의 원본 TypeScript(.ts) 파일을 가리켜야 합니다.
 */
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  // 환경 변수가 없을 경우를 대비해 기본값을 제공하여 undefined 오류를 방지합니다.
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_DATABASE || 'sportcomm',
  synchronize: false, // 프로덕션 환경에서는 데이터 손실 방지를 위해 항상 false로 설정해야 합니다.
  logging: true, // 개발 중에는 실행되는 쿼리를 확인하기 위해 true로 설정합니다.
  // 컴파일된 JS 파일이 아닌, src 폴더의 TS 원본 파일을 가리키도록 경로를 수정합니다.
  entities: ['apps/be/src/**/*.entity.ts'],
  // 생성될 마이그레이션 파일들이 위치할 경로입니다.
  migrations: ['apps/be/src/migrations/*.ts'],
  migrationsTableName: 'migrations', // 마이그레이션 히스토리를 기록할 테이블 이름
};

/**
 * @description TypeORM CLI에서 사용할 DataSource 인스턴스입니다.
 * @summary `export default`를 사용하여 이 인스턴스를 내보내야 CLI가 인식할 수 있습니다.
 */
const AppDataSource = new DataSource(dataSourceOptions);

export default AppDataSource;
