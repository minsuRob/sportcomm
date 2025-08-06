import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  UserInfo,
  UserRole,
  SupabaseAuthUser,
  CombinedUserInfo,
} from '../../entities/user-info.entity';
import { SupabaseService } from '../../common/services/supabase.service';

/**
 * 사용자 동기화 입력 인터페이스
 */
export interface SyncUserInput {
  /** Supabase Auth 사용자 ID */
  userId: string;
  /** 닉네임 (선택사항) */
  nickname?: string;
  /** 역할 (선택사항) */
  role?: UserRole;
  /** 프로필 이미지 URL (선택사항) */
  profileImageUrl?: string;
  /** 자기소개 (선택사항) */
  bio?: string;
}

/**
 * 사용자 프로필 업데이트 입력 인터페이스
 */
export interface UpdateUserProfileInput {
  /** 닉네임 (선택사항) */
  nickname?: string;
  /** 프로필 이미지 URL (선택사항) */
  profileImageUrl?: string;
  /** 자기소개 (선택사항) */
  bio?: string;
}

/**
 * 사용자 동기화 서비스
 *
 * Supabase Auth와 NestJS 간의 사용자 정보 동기화를 담당합니다.
 * 회원가입 후 사용자 정보를 UserInfo 테이블에 생성하고,
 * 필요시 Supabase Auth의 user_metadata와 동기화합니다.
 */
@Injectable()
export class UserSyncService {
  private readonly logger = new Logger(UserSyncService.name);

  constructor(
    @InjectRepository(UserInfo)
    private readonly userInfoRepository: Repository<UserInfo>,
    private readonly supabaseService: SupabaseService,
  ) {}

  /**
   * Supabase Auth 사용자를 UserInfo 테이블에 동기화
   *
   * @param input 동기화할 사용자 정보
   * @returns 생성되거나 업데이트된 UserInfo
   */
  async syncUser(input: SyncUserInput): Promise<UserInfo> {
    const {
      userId,
      nickname,
      role = UserRole.USER,
      profileImageUrl,
      bio,
    } = input;

    try {
      // Supabase Auth에서 사용자 정보 조회
      const supabaseUser = await this.supabaseService.getUserMetadata(userId);

      if (!supabaseUser) {
        throw new Error(
          `Supabase Auth에서 사용자를 찾을 수 없습니다: ${userId}`,
        );
      }

      // 기존 UserInfo 조회
      let userInfo = await this.userInfoRepository.findOne({
        where: { id: userId },
      });

      // 닉네임 결정 (우선순위: 입력값 > Supabase metadata > 이메일 로컬 부분)
      const finalNickname =
        nickname ||
        supabaseUser.user_metadata?.nickname ||
        supabaseUser.email?.split('@')[0] ||
        `user_${userId.slice(0, 8)}`;

      // 역할 결정 (우선순위: 입력값 > Supabase metadata > 기본값)
      const finalRole =
        role || (supabaseUser.user_metadata?.role as UserRole) || UserRole.USER;

      if (userInfo) {
        // 기존 사용자 정보 업데이트
        this.logger.log(`기존 사용자 정보 업데이트: ${userId}`);

        userInfo.nickname = finalNickname;
        userInfo.role = finalRole;
        userInfo.profileImageUrl = profileImageUrl || userInfo.profileImageUrl;
        userInfo.bio = bio || userInfo.bio;
        userInfo.updatedAt = new Date();

        userInfo = await this.userInfoRepository.save(userInfo);
      } else {
        // 새 사용자 정보 생성
        this.logger.log(`새 사용자 정보 생성: ${userId}`);

        userInfo = this.userInfoRepository.create({
          id: userId,
          nickname: finalNickname,
          role: finalRole,
          profileImageUrl,
          bio,
          isActive: true,
        });

        userInfo = await this.userInfoRepository.save(userInfo);
      }

      // Supabase Auth의 user_metadata 업데이트
      await this.updateSupabaseMetadata(userId, {
        nickname: userInfo.nickname,
        role: userInfo.role,
      });

      this.logger.log(`사용자 동기화 완료: ${userId} (${userInfo.nickname})`);
      return userInfo;
    } catch (error) {
      this.logger.error(`사용자 동기화 실패: ${userId}`, error.stack);
      throw error;
    }
  }

  /**
   * 사용자 프로필 업데이트
   *
   * @param userId 사용자 ID
   * @param input 업데이트할 프로필 정보
   * @returns 업데이트된 UserInfo
   */
  async updateUserProfile(
    userId: string,
    input: UpdateUserProfileInput,
  ): Promise<UserInfo> {
    try {
      const userInfo = await this.userInfoRepository.findOne({
        where: { id: userId },
      });

      if (!userInfo) {
        throw new Error(`사용자 정보를 찾을 수 없습니다: ${userId}`);
      }

      // 닉네임 중복 확인
      if (input.nickname && input.nickname !== userInfo.nickname) {
        const existingUser = await this.userInfoRepository.findOne({
          where: { nickname: input.nickname },
        });

        if (existingUser) {
          throw new Error('이미 사용 중인 닉네임입니다.');
        }
      }

      // 프로필 정보 업데이트
      if (input.nickname) userInfo.nickname = input.nickname;
      if (input.profileImageUrl !== undefined)
        userInfo.profileImageUrl = input.profileImageUrl;
      if (input.bio !== undefined) userInfo.bio = input.bio;
      userInfo.updatedAt = new Date();

      const updatedUserInfo = await this.userInfoRepository.save(userInfo);

      // Supabase Auth의 user_metadata 업데이트
      await this.updateSupabaseMetadata(userId, {
        nickname: updatedUserInfo.nickname,
        role: updatedUserInfo.role,
      });

      this.logger.log(`사용자 프로필 업데이트 완료: ${userId}`);
      return updatedUserInfo;
    } catch (error) {
      this.logger.error(`사용자 프로필 업데이트 실패: ${userId}`, error.stack);
      throw error;
    }
  }

  /**
   * 사용자 역할 업데이트 (관리자 전용)
   *
   * @param userId 사용자 ID
   * @param role 새로운 역할
   * @returns 업데이트된 UserInfo
   */
  async updateUserRole(userId: string, role: UserRole): Promise<UserInfo> {
    try {
      const userInfo = await this.userInfoRepository.findOne({
        where: { id: userId },
      });

      if (!userInfo) {
        throw new Error(`사용자 정보를 찾을 수 없습니다: ${userId}`);
      }

      userInfo.role = role;
      userInfo.updatedAt = new Date();

      const updatedUserInfo = await this.userInfoRepository.save(userInfo);

      // Supabase Auth의 user_metadata 업데이트
      await this.updateSupabaseMetadata(userId, {
        nickname: updatedUserInfo.nickname,
        role: updatedUserInfo.role,
      });

      this.logger.log(`사용자 역할 업데이트 완료: ${userId} -> ${role}`);
      return updatedUserInfo;
    } catch (error) {
      this.logger.error(`사용자 역할 업데이트 실패: ${userId}`, error.stack);
      throw error;
    }
  }

  /**
   * 사용자 계정 활성화/비활성화
   *
   * @param userId 사용자 ID
   * @param isActive 활성화 여부
   * @returns 업데이트된 UserInfo
   */
  async updateUserStatus(userId: string, isActive: boolean): Promise<UserInfo> {
    try {
      const userInfo = await this.userInfoRepository.findOne({
        where: { id: userId },
      });

      if (!userInfo) {
        throw new Error(`사용자 정보를 찾을 수 없습니다: ${userId}`);
      }

      userInfo.isActive = isActive;
      userInfo.updatedAt = new Date();

      const updatedUserInfo = await this.userInfoRepository.save(userInfo);

      this.logger.log(
        `사용자 상태 업데이트 완료: ${userId} -> ${isActive ? '활성화' : '비활성화'}`,
      );
      return updatedUserInfo;
    } catch (error) {
      this.logger.error(`사용자 상태 업데이트 실패: ${userId}`, error.stack);
      throw error;
    }
  }

  /**
   * 통합 사용자 정보 조회
   * Supabase Auth 정보와 UserInfo를 결합하여 반환
   *
   * @param userId 사용자 ID
   * @returns 통합 사용자 정보
   */
  async getCombinedUserInfo(userId: string): Promise<CombinedUserInfo | null> {
    try {
      // Supabase Auth 정보 조회
      const supabaseUser = await this.supabaseService.getUserMetadata(userId);
      if (!supabaseUser) {
        return null;
      }

      // UserInfo 조회
      const userInfo = await this.userInfoRepository.findOne({
        where: { id: userId },
      });

      if (!userInfo) {
        // UserInfo가 없으면 자동 생성
        const syncedUserInfo = await this.syncUser({ userId });
        return this.buildCombinedUserInfo(supabaseUser, syncedUserInfo);
      }

      return this.buildCombinedUserInfo(supabaseUser, userInfo);
    } catch (error) {
      this.logger.error(`통합 사용자 정보 조회 실패: ${userId}`, error.stack);
      return null;
    }
  }

  /**
   * 사용자 정보 존재 여부 확인
   *
   * @param userId 사용자 ID
   * @returns 존재 여부
   */
  async userExists(userId: string): Promise<boolean> {
    const count = await this.userInfoRepository.count({
      where: { id: userId },
    });
    return count > 0;
  }

  /**
   * 닉네임 중복 확인
   *
   * @param nickname 닉네임
   * @param excludeUserId 제외할 사용자 ID (본인 제외)
   * @returns 중복 여부
   */
  async isNicknameTaken(
    nickname: string,
    excludeUserId?: string,
  ): Promise<boolean> {
    const query = this.userInfoRepository
      .createQueryBuilder('userInfo')
      .where('userInfo.nickname = :nickname', { nickname });

    if (excludeUserId) {
      query.andWhere('userInfo.id != :excludeUserId', { excludeUserId });
    }

    const count = await query.getCount();
    return count > 0;
  }

  /**
   * Supabase Auth의 user_metadata 업데이트
   *
   * @param userId 사용자 ID
   * @param metadata 업데이트할 메타데이터
   */
  private async updateSupabaseMetadata(
    userId: string,
    metadata: { nickname: string; role: UserRole },
  ): Promise<void> {
    try {
      await this.supabaseService.updateUserRole(userId, metadata.role);
      // 추가적인 메타데이터 업데이트가 필요하면 여기에 구현
    } catch (error) {
      this.logger.warn(
        `Supabase 메타데이터 업데이트 실패: ${userId}`,
        error.message,
      );
      // 메타데이터 업데이트 실패는 치명적이지 않으므로 에러를 던지지 않음
    }
  }

  /**
   * 통합 사용자 정보 객체 생성
   *
   * @param supabaseUser Supabase Auth 사용자 정보
   * @param userInfo UserInfo 엔티티
   * @returns 통합 사용자 정보
   */
  private buildCombinedUserInfo(
    supabaseUser: SupabaseAuthUser,
    userInfo: UserInfo,
  ): CombinedUserInfo {
    return {
      // Supabase Auth 정보
      id: supabaseUser.id,
      email: supabaseUser.email,
      phone: supabaseUser.phone,
      emailConfirmedAt: supabaseUser.email_confirmed_at,
      phoneConfirmedAt: supabaseUser.phone_confirmed_at,
      provider: supabaseUser.app_metadata?.provider,
      providers: supabaseUser.app_metadata?.providers,

      // UserInfo 정보
      nickname: userInfo.nickname,
      role: userInfo.role,
      profileImageUrl: userInfo.profileImageUrl,
      bio: userInfo.bio,
      isActive: userInfo.isActive,

      // 공통 정보
      createdAt: userInfo.createdAt,
      updatedAt: userInfo.updatedAt,
    };
  }
}
