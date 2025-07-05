import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables from a .env file if it exists.
config();

/**
 * This configuration is used by the TypeORM CLI to generate and run migrations.
 * It reads connection details that should ideally come from environment variables
 * for security and flexibility.
 *
 * The paths for `entities` and `migrations` must point to the compiled JavaScript
 * files in the `dist` folder, as the CLI runs against the built output.
 */
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'sportcomm',
  synchronize: false, // `synchronize: true` should never be used in production.
  logging: true,
  entities: ['dist/**/*.entity.{js,ts}'],
  migrations: ['dist/migrations/*{.js,.ts}'],
  migrationsTableName: 'migrations', // Custom name for the migrations table
};

const AppDataSource = new DataSource(dataSourceOptions);

export default AppDataSource;
