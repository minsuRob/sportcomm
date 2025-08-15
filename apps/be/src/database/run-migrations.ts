import { initializeDatabase } from './datasource';
import { runMigrations } from './datasource';

async function main() {
  await initializeDatabase();
  await runMigrations();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ 마이그레이션 실행 실패:', err);
  process.exit(1);
});
