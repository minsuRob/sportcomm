import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase 클라이언트 서비스
 *
 * Supabase와의 통신을 담당하는 중앙화된 서비스
 * 주로 JWT 토큰 검증과 사용자 메타데이터 조회에 사용
 */
@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        'SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY가 환경 변수에 설정되어야 합니다.',
      );
    }

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  /**
   * Supabase 클라이언트 인스턴스 반환
   */
  getClient(): SupabaseClient {
    return this.supabase;
  }

  /**
   * JWT 토큰 검증
   * @param token JWT 토큰
   * @returns 사용자 정보 또는 null
   */
  async verifyToken(token: string) {
    try {
      const {
        data: { user },
        error,
      } = await this.supabase.auth.getUser(token);

      if (error) {
        console.error('Supabase JWT 검증 실패:', error.message);
        return null;
      }

      return user;
    } catch (error) {
      console.error('JWT 토큰 검증 중 오류:', error);
      return null;
    }
  }

  /**
   * 사용자 메타데이터 조회
   * @param userId 사용자 ID
   * @returns 사용자 메타데이터
   */
  async getUserMetadata(userId: string) {
    try {
      const { data, error } =
        await this.supabase.auth.admin.getUserById(userId);

      if (error) {
        console.error('사용자 메타데이터 조회 실패:', error.message);
        return null;
      }

      return data.user;
    } catch (error) {
      console.error('사용자 메타데이터 조회 중 오류:', error);
      return null;
    }
  }

  /**
   * 관리자용 사용자 삭제
   * @param userId 사용자 ID
   */
  async deleteUser(userId: string) {
    try {
      const { error } = await this.supabase.auth.admin.deleteUser(userId);

      if (error) {
        throw new Error(`사용자 삭제 실패: ${error.message}`);
      }

      return { success: true, message: '사용자가 성공적으로 삭제되었습니다.' };
    } catch (error) {
      console.error('사용자 삭제 중 오류:', error);
      throw error;
    }
  }

  /**
   * 사용자 역할 업데이트
   * @param userId 사용자 ID
   * @param role 새로운 역할
   */
  async updateUserRole(userId: string, role: string) {
    try {
      const { error } = await this.supabase.auth.admin.updateUserById(userId, {
        user_metadata: { role },
      });

      if (error) {
        throw new Error(`사용자 역할 업데이트 실패: ${error.message}`);
      }

      return {
        success: true,
        message: '사용자 역할이 성공적으로 업데이트되었습니다.',
      };
    } catch (error) {
      console.error('사용자 역할 업데이트 중 오류:', error);
      throw error;
    }
  }
}
