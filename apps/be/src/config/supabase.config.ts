import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

/**
 * Supabase 클라이언트 설정
 * 채팅 및 실시간 기능을 위한 Supabase 연결
 */
export class SupabaseConfig {
  private static instance: any;

  /**
   * Supabase 클라이언트 인스턴스를 반환합니다.
   * @param configService - NestJS ConfigService 인스턴스
   * @returns Supabase 클라이언트 또는 null (설정이 없을 때)
   */
  static getInstance(configService: ConfigService) {
    if (!this.instance) {
      const supabaseUrl = configService.get<string>('SUPABASE_URL');
      const supabaseServiceKey = configService.get<string>(
        'SUPABASE_SERVICE_ROLE_KEY',
      );

      // Supabase 설정이 없으면 null 반환 (에러 발생하지 않음)
      if (!supabaseUrl || !supabaseServiceKey) {
        console.log(
          '⚠️ Supabase 설정이 없습니다. 실시간 기능이 비활성화됩니다.',
        );
        return null;
      }

      try {
        this.instance = createClient(supabaseUrl, supabaseServiceKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        });
        console.log('✅ Supabase 클라이언트가 초기화되었습니다.');
      } catch (error) {
        console.error('❌ Supabase 클라이언트 초기화 실패:', error);
        return null;
      }
    }

    return this.instance;
  }

  /**
   * Supabase 설정이 유효한지 확인합니다.
   * @param configService - NestJS ConfigService 인스턴스
   * @returns Supabase 설정 유효 여부
   */
  static isConfigured(configService: ConfigService): boolean {
    const supabaseUrl = configService.get<string>('SUPABASE_URL');
    const supabaseServiceKey = configService.get<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );

    return !!(supabaseUrl && supabaseServiceKey);
  }

  /**
   * Supabase 설정을 검증합니다.
   * @param configService - NestJS ConfigService 인스턴스
   * @param required - Supabase 설정이 필수인지 여부 (기본값: false)
   */
  static validateSupabaseConfig(
    configService: ConfigService,
    required: boolean = false,
  ): void {
    const isConfigured = this.isConfigured(configService);

    if (required && !isConfigured) {
      throw new Error(
        '❌ Supabase 설정이 필요하지만 SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.',
      );
    }

    if (!isConfigured) {
      console.log('⚠️ Supabase 설정이 선택사항으로 설정되지 않았습니다.');
    } else {
      console.log('✅ Supabase 설정이 확인되었습니다.');
    }
  }
}
