import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseService } from '../../common/services/supabase.service';

/**
 * Supabase 전역 모듈
 * 
 * 애플리케이션 전체에서 Supabase 클라이언트를 사용할 수 있도록 하는 글로벌 모듈
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [SupabaseService],
  exports: [SupabaseService],
})
export class SupabaseModule {}
