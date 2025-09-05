import * as path from 'path';
import * as dotenv from 'dotenv';

// BE 루트 기준으로 .env.local -> .env 순서대로 로드
const beRoot = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(beRoot, '.env.local') });
dotenv.config({ path: path.join(beRoot, '.env') });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`환경변수 ${name} 가 설정되어야 합니다.`);
  }
  return value;
}

export const SUPABASE_URL: string = requireEnv('SUPABASE_URL');
export const SUPABASE_ANON_KEY: string = process.env.SUPABASE_ANON_KEY || '';
export const SUPABASE_SERVICE_ROLE_KEY: string = requireEnv(
  'SUPABASE_SERVICE_ROLE_KEY',
);
export const USE_SUPABASE: string = process.env.USE_SUPABASE || 'true';
