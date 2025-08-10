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

  /**
   * 파일을 Supabase Storage에 업로드
   * @param bucket 버킷 이름
   * @param filePath 파일 경로 (버킷 내)
   * @param fileBuffer 파일 버퍼
   * @param contentType MIME 타입
   * @returns 업로드 결과
   */
  async uploadFile(
    bucket: string,
    filePath: string,
    fileBuffer: Buffer,
    contentType: string,
  ) {
    try {
      // 파일 경로 유효성 검증 (한글 및 특수문자 처리)
      const sanitizedPath = this.sanitizeFilePath(filePath);

      console.log(`Supabase 업로드: ${filePath} -> ${sanitizedPath}`);

      const { data, error } = await this.supabase.storage
        .from(bucket)
        .upload(sanitizedPath, fileBuffer, {
          contentType,
          upsert: true, // 동일한 파일명이 있으면 덮어쓰기
        });

      if (error) {
        throw new Error(`파일 업로드 실패: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Supabase Storage 업로드 중 오류:', error);
      throw error;
    }
  }

  /**
   * 파일 경로를 Supabase Storage에 안전한 형태로 변환
   * @param filePath 원본 파일 경로
   * @returns 안전한 파일 경로
   */
  private sanitizeFilePath(filePath: string): string {
    // 한글 및 특수문자를 안전한 문자로 변환
    return filePath
      .replace(/[^\w\-_.]/g, '_') // 영문, 숫자, 하이픈, 언더스코어, 점만 허용
      .replace(/_{2,}/g, '_') // 연속된 언더스코어를 하나로 변환
      .replace(/^_+|_+$/g, ''); // 시작과 끝의 언더스코어 제거
  }

  /**
   * Supabase Storage에서 공개 URL 생성
   * @param bucket 버킷 이름
   * @param filePath 파일 경로
   * @returns 공개 URL
   */
  getPublicUrl(bucket: string, filePath: string): string {
    // 파일 경로 정리 (업로드 시와 동일한 처리)
    const sanitizedPath = this.sanitizeFilePath(filePath);
    const { data } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(sanitizedPath);
    return data.publicUrl;
  }

  /**
   * Supabase Storage에서 파일 삭제
   * @param bucket 버킷 이름
   * @param filePaths 삭제할 파일 경로 배열
   * @returns 삭제 결과
   */
  async deleteFiles(bucket: string, filePaths: string[]) {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .remove(filePaths);

      if (error) {
        throw new Error(`파일 삭제 실패: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Supabase Storage 파일 삭제 중 오류:', error);
      throw error;
    }
  }
}
