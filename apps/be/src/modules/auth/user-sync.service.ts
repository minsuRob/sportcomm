import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  User,
  UserRole,
  SupabaseAuthUser,
  CombinedUserInfo,
} from '../../entities/user.entity';
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
  /** 나이 (선택사항) */
  age?: number;
}

/**
 * 사용자 동기화 서비스
 *
 * Supabase Auth와 NestJS 간의 사용자 정보 동기화를 담당합니다.
 * 회원가입 후 사용자 정보를 User 테이블에 생성하고,
 * 필요시 Supabase Auth의 user_metadata와 동기화합니다.
 */
@Injectable()
export class UserSyncService {
  private readonly logger = new Logger(UserSyncService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly supabaseService: SupabaseService,
  ) {}

  /**
   * Supabase Auth 사용자를 User 테이블에 동기화 (Upsert 방식)
   *
   * 중복 호출 방지를 위해 효율적인 처리를 수행합니다.
   * 기존 사용자가 있으면 필요한 경우에만 업데이트하고,
   * 없으면 새로 생성합니다.
   *
   * @param input 동기화할 사용자 정보
   * @returns 생성되거나 업데이트된 User
   */
  async syncUser(input: SyncUserInput): Promise<User> {
    const {
      userId,
      nickname,
      role = UserRole.USER,
      profileImageUrl,
      bio,
    } = input;

    try {
      this.logger.log(`사용자 동기화 시작: ${userId}`);

      // Supabase Auth에서 사용자 정보 조회
      const supabaseUser = await this.supabaseService.getUserMetadata(userId);

      if (!supabaseUser) {
        this.logger.warn(`Supabase Auth에서 사용자를 찾을 수 없음: ${userId}`);

        // 사용자가 Supabase Auth에 없어도 로컬 DB에 있으면 계속 진행
        const existingUser = await this.userRepository.findOne({
          where: { id: userId },
        });

        if (existingUser) {
          this.logger.log(
            `로컬 DB에서 기존 사용자 발견: ${userId} (${existingUser.nickname})`,
          );
          return existingUser;
        }

        // 둘 다 없으면 기본 정보로 사용자 생성
        this.logger.log(`기본 정보로 새 사용자 생성: ${userId}`);
        const defaultNickname = nickname || `user_${userId.slice(0, 8)}`;

        const newUser = this.userRepository.create({
          id: userId,
          nickname: defaultNickname,
          role: role || UserRole.USER,
          email: '',
          profileImageUrl,
          bio,
          isEmailVerified: false,
          isActive: true,
          points: 0,
        });

        const savedUser = await this.userRepository.save(newUser);
        this.logger.log(
          `기본 정보로 사용자 생성 완료: ${userId} (${savedUser.nickname})`,
        );
        return savedUser;
      }

      // 기존 User 조회
      let user = await this.userRepository.findOne({
        where: { id: userId },
      });

      // 닉네임 결정 (우선순위: 입력값 > Supabase metadata > 이메일 로컬 부분)
      const finalNickname =
        nickname ||
        supabaseUser.user_metadata?.nickname ||
        supabaseUser.email?.split('@')[0] ||
        `user_${userId.slice(0, 8)}`;

      // 역할 결정 (기존 사용자의 경우 기존 role 우선 보존)
      let finalRole: UserRole;
      if (user) {
        // 기존 사용자의 경우: 입력값이 있으면 사용, 없으면 기존 값 보존
        const inputRole = role || (supabaseUser.user_metadata?.role as UserRole);
        
        // 관리자 역할 보호: 기존이 ADMIN이고 입력값이 USER인 경우 기존 값 유지
        if (user.role === UserRole.ADMIN && inputRole === UserRole.USER) {
          this.logger.warn(`관리자 역할 보호: ${userId}의 ADMIN 역할을 USER로 변경 시도 차단`);
          finalRole = user.role; // 기존 ADMIN 역할 유지
        } else {
          finalRole = inputRole || user.role;
        }
      } else {
        // 새 사용자의 경우: 입력값 > Supabase metadata > 기본값
        finalRole = role || (supabaseUser.user_metadata?.role as UserRole) || UserRole.USER;
      }

      if (user) {
        // 기존 사용자 정보 업데이트 (변경사항이 있을 때만)
        let hasChanges = false;

        if (user.nickname !== finalNickname) {
          user.nickname = finalNickname;
          hasChanges = true;
        }

        // role 변경 시에만 업데이트 (기존 값과 다를 때만)
        if (user.role !== finalRole) {
          console.log(`🔄 사용자 role 변경: ${user.role} -> ${finalRole} (사용자: ${userId})`);
          user.role = finalRole;
          hasChanges = true;
        }

        if (profileImageUrl && user.profileImageUrl !== profileImageUrl) {
          user.profileImageUrl = profileImageUrl;
          hasChanges = true;
        }

        if (bio && user.bio !== bio) {
          user.bio = bio;
          hasChanges = true;
        }

        const newEmail = supabaseUser.email || user.email;
        if (user.email !== newEmail) {
          user.email = newEmail;
          hasChanges = true;
        }

        const newEmailVerified = !!supabaseUser.email_confirmed_at;
        if (user.isEmailVerified !== newEmailVerified) {
          user.isEmailVerified = newEmailVerified;
          hasChanges = true;
        }

        if (hasChanges) {
          this.logger.log(`기존 사용자 정보 업데이트: ${userId}`);
          user.updatedAt = new Date();
          user = await this.userRepository.save(user);
        } else {
          this.logger.log(
            `기존 사용자 정보 변경사항 없음: ${userId} (${user.nickname})`,
          );
        }
      } else {
        // 새 사용자 정보 생성
        this.logger.log(`새 사용자 정보 생성: ${userId}`);

        user = this.userRepository.create({
          id: userId,
          nickname: finalNickname,
          role: finalRole,
          email: supabaseUser.email || '',
          profileImageUrl,
          bio,
          isEmailVerified: !!supabaseUser.email_confirmed_at,
          isActive: true,
          points: 0,
        });

        user = await this.userRepository.save(user);
      }

      // Supabase Auth의 user_metadata 업데이트 (실패해도 계속 진행)
      try {
        await this.updateSupabaseMetadata(userId, {
          nickname: user.nickname,
          role: user.role,
        });
        this.logger.log(`Supabase 메타데이터 업데이트 성공: ${userId} (role: ${user.role})`);
      } catch (metadataError) {
        this.logger.warn(
          `Supabase 메타데이터 업데이트 실패 (계속 진행): ${userId}`,
          metadataError.message,
        );
        // 메타데이터 업데이트 실패해도 로컬 DB는 이미 저장되었으므로 계속 진행
      }

      this.logger.log(`사용자 동기화 완료: ${userId} (${user.nickname})`);
      return user;
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
   * @returns 업데이트된 User
   */
  async updateUserProfile(
    userId: string,
    input: UpdateUserProfileInput,
  ): Promise<User> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new Error(`사용자 정보를 찾을 수 없습니다: ${userId}`);
      }

      // 닉네임 중복 확인
      if (input.nickname && input.nickname !== user.nickname) {
        const existingUser = await this.userRepository.findOne({
          where: { nickname: input.nickname },
        });

        if (existingUser) {
          throw new Error('이미 사용 중인 닉네임입니다.');
        }
      }

      // 프로필 정보 업데이트
      if (input.nickname) user.nickname = input.nickname;
      if (input.profileImageUrl !== undefined)
        user.profileImageUrl = input.profileImageUrl;
      if (input.bio !== undefined) user.bio = input.bio;
      if (input.age !== undefined) user.age = input.age;
      user.updatedAt = new Date();

      const updatedUser = await this.userRepository.save(user);

      // Supabase Auth의 user_metadata 업데이트
      await this.updateSupabaseMetadata(userId, {
        nickname: updatedUser.nickname,
        role: updatedUser.role,
      });

      this.logger.log(`사용자 프로필 업데이트 완료: ${userId}`);
      return updatedUser;
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
   * @returns 업데이트된 User
   */
  async updateUserRole(userId: string, role: UserRole): Promise<User> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new Error(`사용자 정보를 찾을 수 없습니다: ${userId}`);
      }

      user.role = role;
      user.updatedAt = new Date();

      const updatedUser = await this.userRepository.save(user);

      // Supabase Auth의 user_metadata 업데이트
      await this.updateSupabaseMetadata(userId, {
        nickname: updatedUser.nickname,
        role: updatedUser.role,
      });

      this.logger.log(`사용자 역할 업데이트 완료: ${userId} -> ${role}`);
      return updatedUser;
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
   * @returns 업데이트된 User
   */
  async updateUserStatus(userId: string, isActive: boolean): Promise<User> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new Error(`사용자 정보를 찾을 수 없습니다: ${userId}`);
      }

      user.isActive = isActive;
      user.updatedAt = new Date();

      const updatedUser = await this.userRepository.save(user);

      this.logger.log(
        `사용자 상태 업데이트 완료: ${userId} -> ${isActive ? '활성화' : '비활성화'}`,
      );
      return updatedUser;
    } catch (error) {
      this.logger.error(`사용자 상태 업데이트 실패: ${userId}`, error.stack);
      throw error;
    }
  }

  /**
   * 통합 사용자 정보 조회
   * Supabase Auth 정보와 User를 결합하여 반환
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

      // Supabase User 타입의 updated_at은 string | undefined 이지만,
      // 내부 SupabaseAuthUser 타입은 string을 기대하므로, 값이 없을 경우 현재 시간으로 설정합니다.
      if (!supabaseUser.updated_at) {
        this.logger.warn(
          `Supabase 사용자(${userId}) 정보에 updated_at이 없어 현재 시간으로 설정합니다.`,
        );
        supabaseUser.updated_at = new Date().toISOString();
      }

      // updated_at을 보정한 supabaseUser를 SupabaseAuthUser로 타입 단언
      const compatibleSupabaseUser = supabaseUser as SupabaseAuthUser;

      // User 조회
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        // User가 없으면 자동 생성
        const syncedUser = await this.syncUser({ userId });
        return this.buildCombinedUserInfo(compatibleSupabaseUser, syncedUser);
      }

      return this.buildCombinedUserInfo(compatibleSupabaseUser, user);
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
    const count = await this.userRepository.count({
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
    const query = this.userRepository
      .createQueryBuilder('user')
      .where('user.nickname = :nickname', { nickname });

    if (excludeUserId) {
      query.andWhere('user.id != :excludeUserId', { excludeUserId });
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
      // role과 nickname을 함께 업데이트
      const { error } = await this.supabaseService.supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          role: metadata.role,
          nickname: metadata.nickname,
        },
      });

      if (error) {
        throw new Error(`Supabase 사용자 메타데이터 업데이트 실패: ${error.message}`);
      }

      this.logger.log(`Supabase 메타데이터 업데이트 성공: ${userId} (role: ${metadata.role}, nickname: ${metadata.nickname})`);
    } catch (error) {
      this.logger.warn(
        `Supabase 메타데이터 업데이트 실패: ${userId}`,
        error.message,
      );
      // 메타데이터 업데이트 실패는 치명적이지 않으므로 에러를 던지지 않음
      throw error; // 상위에서 처리하도록 에러 전파
    }
  }

  /**
   * 통합 사용자 정보 객체 생성
   *
   * @param supabaseUser Supabase Auth 사용자 정보
   * @param user User 엔티티
   * @returns 통합 사용자 정보
   */
  private buildCombinedUserInfo(
    supabaseUser: SupabaseAuthUser,
    user: User,
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

      // User 정보
      nickname: user.nickname,
      role: user.role,
      profileImageUrl: user.profileImageUrl,
      bio: user.bio,
      isActive: user.isActive,
      // 포인트 / 경험치 / 출석 관련 (백엔드 엔티티 필드)
      // CombinedUserInfo 타입 확장 없이 안전하게 캐스팅해서 전달
      ...(typeof (user as any).points === 'number'
        ? { points: (user as any).points }
        : {}),
      ...(typeof (user as any).experience === 'number'
        ? { experience: (user as any).experience }
        : {}),
      ...(user && (user as any).lastAttendanceAt
        ? { lastAttendanceAt: (user as any).lastAttendanceAt }
        : {}),

      // 공통 정보
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
