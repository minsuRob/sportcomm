import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

/**
 * Supabase 클라이언트 설정
 * 채팅 및 실시간 기능을 위한 Supabase 연결
 */
export class SupabaseConfig {
  private static instance: any;

  static getInstance(configService: ConfigService) {
    if (!this.instance) {
      const supabaseUrl = configService.get<string>('SUPABASE_URL');
      const supabaseServiceKey = configService.get<string>(
        'SUPABASE_SERVICE_ROLE_KEY',
      );

      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase 환경 변수가 설정되지 않았습니다.');
      }

      this.instance = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    }

    return this.instance;
  }
}
