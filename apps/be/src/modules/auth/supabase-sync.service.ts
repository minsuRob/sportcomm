import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User } from '../../entities/user.entity';

/**
 * Supabase 사용자 프로필 인터페이스
 * 채팅 및 실시간 기능을 위한 최소한의 사용자 정보
 */
export interface SupabaseUserProfile {
  id: string;
  nickname: string;
  profile_image_url?: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Supabase 동기화 서비스
 *
 * 로컬 DB와 Supabase 간 사용자 정보 동기화를 담당합니다.
 * 채팅 기능을 위해 필요한 사용자 정보를 Supabase에 저장하고 관리합니다.
 */
@Injectable()
export class SupabaseSyncService {
  private readonly logger = new Logger(SupabaseSyncService.name);
  private readonly supabase: SupabaseClient;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {
    // Supabase 클라이언트 초기화
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseServiceKey = this.configService.get<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );

    if (!supabaseUrl || !supabaseServiceKey) {
      this.logger.warn(
        'Supabase 환경 변수가 설정되지 않았습니다. 동기화 기능이 비활성화됩니다.',
      );
      return;
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    this.logger.log('Supabase 동기화 서비스가 초기화되었습니다.');
  }

  /**
   * 사용자를 Supabase에 생성하고 로컬 DB와 동기화
   *
   * @param user - 로컬 DB의 사용자 정보
   * @param password - 사용자 비밀번호 (Supabase Auth용)
   * @returns Supabase 사용자 정보 및 세션
   */
  async createUserInSupabase(
    user: User,
    password: string,
  ): Promise<{
    supabaseUserId: string;
    session: any;
  } | null> {
    if (!this.supabase) {
      this.logger.warn('Supabase 클라이언트가 초기화되지 않았습니다.');
      return null;
    }

    try {
      // 1. Supabase Auth에 사용자 생성
      const { data: authData, error: authError } =
        await this.supabase.auth.admin.createUser({
          email: user.email,
          password: password,
          email_confirm: true, // 이메일 인증 자동 완료
          user_metadata: {
            nickname: user.nickname,
            role: user.role,
          },
        });

      if (authError) {
        this.logger.error('Supabase Auth 사용자 생성 실패:', authError);
        return null;
      }

      const supabaseUserId = authData.user?.id;
      if (!supabaseUserId) {
        this.logger.error('Supabase 사용자 ID를 가져올 수 없습니다.');
        return null;
      }

      // 2. 사용자 프로필을 profiles 테이블에 저장
      const profileData = {
        id: supabaseUserId,
        nickname: user.nickname,
        profile_image_url: user.profileImageUrl,
        role: user.role,
        is_active: user.isUserActive,
      };

      const { error: profileError } = await this.supabase
        .from('profiles')
        .insert(profileData);

      if (profileError) {
        this.logger.error('Supabase 프로필 생성 실패:', profileError);
        // Auth 사용자는 생성되었으므로 삭제 시도
        await this.supabase.auth.admin.deleteUser(supabaseUserId);
        return null;
      }

      // 3. 로컬 DB에 Supabase ID 저장
      await this.userRepository.update(user.id, {
        supabaseUserId: supabaseUserId,
      });

      this.logger.log(
        `사용자 ${user.nickname}의 Supabase 동기화 완료: ${supabaseUserId}`,
      );

      // 세션 정보 반환 (createUser는 세션을 반환하지 않으므로 로그인 시도)
      const { data: signInData } = await this.supabase.auth.signInWithPassword({
        email: user.email,
        password: password,
      });

      return {
        supabaseUserId,
        session: signInData.session,
      };
    } catch (error) {
      this.logger.error('Supabase 사용자 생성 중 오류 발생:', error);
      return null;
    }
  }

  /**
   * 사용자 정보를 Supabase에 업데이트
   *
   * @param user - 업데이트할 사용자 정보
   * @returns 성공 여부
   */
  async updateUserInSupabase(user: User): Promise<boolean> {
    if (!this.supabase || !user.supabaseUserId) {
      return false;
    }

    try {
      // profiles 테이블 업데이트
      const { error } = await this.supabase
        .from('profiles')
        .update({
          nickname: user.nickname,
          profile_image_url: user.profileImageUrl,
          role: user.role,
          is_active: user.isUserActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.supabaseUserId);

      if (error) {
        this.logger.error(
          `Supabase 프로필 업데이트 실패 (${user.supabaseUserId}):`,
          error,
        );
        return false;
      }

      this.logger.log(
        `사용자 ${user.nickname}의 Supabase 프로필 업데이트 완료`,
      );
      return true;
    } catch (error) {
      this.logger.error('Supabase 사용자 업데이트 중 오류 발생:', error);
      return false;
    }
  }

  /**
   * Supabase에서 사용자 삭제 (계정 비활성화)
   *
   * @param supabaseUserId - Supabase 사용자 ID
   * @returns 성공 여부
   */
  async deactivateUserInSupabase(supabaseUserId: string): Promise<boolean> {
    if (!this.supabase) {
      return false;
    }

    try {
      // profiles 테이블에서 비활성화 처리
      const { error } = await this.supabase
        .from('profiles')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', supabaseUserId);

      if (error) {
        this.logger.error(
          `Supabase 사용자 비활성화 실패 (${supabaseUserId}):`,
          error,
        );
        return false;
      }

      this.logger.log(`Supabase 사용자 비활성화 완료: ${supabaseUserId}`);
      return true;
    } catch (error) {
      this.logger.error('Supabase 사용자 비활성화 중 오류 발생:', error);
      return false;
    }
  }

  /**
   * Supabase에서 사용자 프로필 조회
   *
   * @param supabaseUserId - Supabase 사용자 ID
   * @returns 사용자 프로필 또는 null
   */
  async getUserProfileFromSupabase(
    supabaseUserId: string,
  ): Promise<SupabaseUserProfile | null> {
    if (!this.supabase) {
      return null;
    }

    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUserId)
        .single();

      if (error) {
        this.logger.error(
          `Supabase 프로필 조회 실패 (${supabaseUserId}):`,
          error,
        );
        return null;
      }

      return data as SupabaseUserProfile;
    } catch (error) {
      this.logger.error('Supabase 프로필 조회 중 오류 발생:', error);
      return null;
    }
  }

  /**
   * 로컬 DB의 사용자를 Supabase와 동기화
   * 기존 사용자들의 마이그레이션에 사용
   *
   * @param userId - 로컬 사용자 ID
   * @param tempPassword - 임시 비밀번호 (Supabase Auth용)
   * @returns 성공 여부
   */
  async syncExistingUser(
    userId: string,
    tempPassword: string = 'temp123456!',
  ): Promise<boolean> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        this.logger.error(`사용자를 찾을 수 없습니다: ${userId}`);
        return false;
      }

      if (user.supabaseUserId) {
        this.logger.log(
          `사용자 ${user.nickname}은 이미 Supabase와 동기화되어 있습니다.`,
        );
        return true;
      }

      const result = await this.createUserInSupabase(user, tempPassword);
      return !!result;
    } catch (error) {
      this.logger.error('기존 사용자 동기화 중 오류 발생:', error);
      return false;
    }
  }

  /**
   * Supabase 연결 상태 확인
   *
   * @returns 연결 상태
   */
  async checkSupabaseConnection(): Promise<boolean> {
    if (!this.supabase) {
      return false;
    }

    try {
      const { error } = await this.supabase
        .from('profiles')
        .select('count')
        .limit(1);

      return !error;
    } catch (error) {
      this.logger.error('Supabase 연결 확인 중 오류 발생:', error);
      return false;
    }
  }

  /**
   * 동기화 통계 정보 조회
   *
   * @returns 동기화 통계
   */
  async getSyncStats(): Promise<{
    totalUsers: number;
    syncedUsers: number;
    unsyncedUsers: number;
    supabaseConnected: boolean;
  }> {
    const [totalUsers, syncedUsers] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({
        where: { supabaseUserId: { $ne: null } as any },
      }),
    ]);

    const supabaseConnected = await this.checkSupabaseConnection();

    return {
      totalUsers,
      syncedUsers,
      unsyncedUsers: totalUsers - syncedUsers,
      supabaseConnected,
    };
  }

  /**
   * 기존 사용자의 Supabase 로그인 세션 생성
   *
   * @param email - 사용자 이메일
   * @param password - 사용자 비밀번호
   * @returns Supabase 세션 정보
   */
  async signInWithSupabase(
    email: string,
    password: string,
  ): Promise<any | null> {
    if (!this.supabase) {
      this.logger.warn('Supabase 클라이언트가 초기화되지 않았습니다.');
      return null;
    }

    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        this.logger.error('Supabase 로그인 실패:', error);
        return null;
      }

      return data.session;
    } catch (error) {
      this.logger.error('Supabase 로그인 중 오류 발생:', error);
      return null;
    }
  }

  /**
   * 사용자가 Supabase에 존재하는지 확인하고, 없으면 생성
   *
   * @param user - 로컬 DB의 사용자 정보
   * @param password - 사용자 비밀번호
   * @returns Supabase 세션 정보
   */
  async ensureSupabaseUser(user: User, password: string): Promise<any | null> {
    if (!this.supabase) {
      return null;
    }

    try {
      // 1. 먼저 로그인 시도
      let session = await this.signInWithSupabase(user.email, password);

      if (session) {
        // 로그인 성공 시 로컬 DB에 Supabase ID 업데이트 (없는 경우)
        if (!user.supabaseUserId && session.user?.id) {
          await this.userRepository.update(user.id, {
            supabaseUserId: session.user.id,
          });

          // profiles 테이블에도 정보 동기화
          await this.syncUserProfile(session.user.id, user);
        }

        return session;
      }

      // 2. 로그인 실패 시 사용자 생성 시도
      this.logger.log(
        `Supabase에 사용자가 없어 새로 생성합니다: ${user.email}`,
      );
      const result = await this.createUserInSupabase(user, password);

      if (result) {
        return result.session;
      }

      return null;
    } catch (error) {
      this.logger.error('Supabase 사용자 확인/생성 중 오류 발생:', error);
      return null;
    }
  }

  /**
   * Supabase profiles 테이블에 사용자 정보 동기화
   *
   * @param supabaseUserId - Supabase 사용자 ID
   * @param user - 로컬 DB 사용자 정보
   */
  private async syncUserProfile(
    supabaseUserId: string,
    user: User,
  ): Promise<void> {
    try {
      const profileData = {
        id: supabaseUserId,
        nickname: user.nickname,
        profile_image_url: user.profileImageUrl,
        role: user.role,
        is_active: user.isUserActive,
      };

      const { error } = await this.supabase
        .from('profiles')
        .upsert(profileData);

      if (error) {
        this.logger.error('Supabase 프로필 동기화 실패:', error);
      } else {
        this.logger.log(`Supabase 프로필 동기화 완료: ${user.nickname}`);
      }
    } catch (error) {
      this.logger.error('Supabase 프로필 동기화 중 오류 발생:', error);
    }
  }
}
