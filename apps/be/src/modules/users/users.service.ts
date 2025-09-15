import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { User } from '../../entities/user.entity';
import { Follow } from '../../entities/follow.entity';
import { Post } from '../../entities/post.entity';
import { UserTeam } from '../../entities/user-team.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Follow)
    private readonly followsRepository: Repository<Follow>,
    @InjectRepository(Post)
    private readonly postsRepository: Repository<Post>,
    @InjectRepository(UserTeam)
    private readonly userTeamsRepository: Repository<UserTeam>,
    private readonly eventEmitter: EventEmitter2,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 사용자 ID로 사용자를 조회합니다.
   * @param userId 조회할 사용자 ID
   * @returns 사용자 정보
   */
  async findById(userId: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: [
        'id',
        'email',
        'nickname',
        'role',
        'profileImageUrl',
        'bio',
        'age',
        'isEmailVerified',
        'isActive',
        'points',
        'referralCode',
        'referredBy',
        'createdAt',
        'updatedAt',
      ],
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    return user;
  }

  /**
   * 고유한 추천인 코드를 생성합니다.
   * 8글자 대문자 UUID 형식으로 생성됩니다.
   * @returns 생성된 추천인 코드
   */
  private generateReferralCode(): string {
    // UUID에서 앞 8글자를 대문자로 변환하여 사용
    return randomUUID().substring(0, 8).toUpperCase();
  }

  /**
   * 추천인 코드의 고유성을 보장하기 위해 중복 확인 후 생성합니다.
   * @returns 고유한 추천인 코드
   */
  async createUniqueReferralCode(): Promise<string> {
    let referralCode: string;
    let attempts = 0;
    const maxAttempts = 10; // 최대 시도 횟수

    do {
      referralCode = this.generateReferralCode();
      attempts++;

      // 중복 확인
      const existingUser = await this.usersRepository.findOne({
        where: { referralCode },
      });

      if (!existingUser) {
        return referralCode;
      }
    } while (attempts < maxAttempts);

    // 최대 시도 횟수를 초과한 경우 UUID 전체를 사용
    return randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase();
  }

  /**
   * 추천인 코드를 검증합니다.
   * @param referralCode 검증할 추천인 코드
   * @param excludeUserId 제외할 사용자 ID (본인의 코드인 경우)
   * @returns 검증 결과
   */
  async validateReferralCode(
    referralCode: string,
    excludeUserId?: string,
  ): Promise<{ isValid: boolean; referrer?: User; message: string }> {
    try {
      // 추천인 코드 형식 검증 (8글자 대문자)
      if (!referralCode || referralCode.length !== 8) {
        return {
          isValid: false,
          message: '올바른 추천인 코드 형식이 아닙니다.',
        };
      }

      // 대문자만 허용
      if (!/^[A-Z0-9]{8}$/.test(referralCode)) {
        return {
          isValid: false,
          message: '추천인 코드는 대문자와 숫자만 사용할 수 있습니다.',
        };
      }

      // 추천인 코드로 사용자 조회
      const referrer = await this.usersRepository.findOne({
        where: { referralCode },
      });

      if (!referrer) {
        return {
          isValid: false,
          message: '존재하지 않는 추천인 코드입니다.',
        };
      }

      // 본인의 추천인 코드를 사용하는 경우
      if (excludeUserId && referrer.id === excludeUserId) {
        return {
          isValid: false,
          message: '본인의 추천인 코드는 사용할 수 없습니다.',
        };
      }

      // 추천인 코드 사용 횟수 제한 확인 (3명까지만)
      const usageCount = await this.usersRepository.count({
        where: { referredBy: referralCode },
      });

      if (usageCount >= 3) {
        return {
          isValid: false,
          message: '해당 추천인 코드는 이미 3명이 사용했습니다.',
        };
      }

      return {
        isValid: true,
        referrer,
        message: '사용 가능한 추천인 코드입니다.',
      };
    } catch (error) {
      console.error('추천인 코드 검증 중 오류 발생:', error);
      return {
        isValid: false,
        message: '추천인 코드 검증 중 오류가 발생했습니다.',
      };
    }
  }

  /**
   * 추천인 코드를 적용하고 포인트를 지급합니다.
   * @param userId 추천인 코드를 적용할 사용자 ID
   * @param referralCode 적용할 추천인 코드
   * @returns 적용 결과
   */
  async applyReferralCode(
    userId: string,
    referralCode: string,
  ): Promise<{ success: boolean; message: string; pointsAwarded?: number }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 사용자 조회
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('사용자를 찾을 수 없습니다.');
      }

      // 이미 추천인 코드를 사용한 경우
      if (user.referredBy) {
        return {
          success: false,
          message: '이미 추천인 코드를 사용했습니다.',
        };
      }

      // 추천인 코드 검증
      const validation = await this.validateReferralCode(referralCode, userId);
      if (!validation.isValid) {
        return {
          success: false,
          message: validation.message,
        };
      }

      const referrer = validation.referrer!;

      // 추천인 코드 적용 및 포인트 지급
      const REFERRAL_POINTS = 50;

      // 사용자에게 추천인 코드 설정
      user.referredBy = referralCode;
      await queryRunner.manager.save(user);

      // 추천인에게 포인트 지급
      referrer.points += REFERRAL_POINTS;
      await queryRunner.manager.save(referrer);

      // 새로운 사용자에게도 포인트 지급
      user.points += REFERRAL_POINTS;
      await queryRunner.manager.save(user);

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: '추천인 코드가 성공적으로 적용되었습니다.',
        pointsAwarded: REFERRAL_POINTS,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('추천인 코드 적용 중 오류 발생:', error);

      if (error instanceof NotFoundException) {
        throw error;
      }

      return {
        success: false,
        message: '추천인 코드 적용 중 오류가 발생했습니다.',
      };
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 사용자의 추천인 통계를 조회합니다.
   * @param userId 사용자 ID
   * @returns 추천인 통계
   */
  async getReferralStats(userId: string): Promise<{
    referralCode?: string;
    totalReferrals: number;
    availableSlots: number;
    referredUsers: Array<{
      id: string;
      nickname: string;
      createdAt: Date;
    }>;
  }> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // 추천받은 사용자 목록 조회
    const referredUsers = await this.usersRepository.find({
      where: { referredBy: user.referralCode },
      select: ['id', 'nickname', 'createdAt'],
      order: { createdAt: 'DESC' },
    });

    const totalReferrals = referredUsers.length;
    const availableSlots = Math.max(0, 3 - totalReferrals);

    return {
      referralCode: user.referralCode,
      totalReferrals,
      availableSlots,
      referredUsers: referredUsers.map(user => ({
        id: user.id,
        nickname: user.nickname,
        createdAt: user.createdAt,
      })),
    };
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.userTeams', 'userTeams')
      .leftJoinAndSelect('userTeams.team', 'team')
      .where('user.email = :email', { email })
      .addSelect('user.password')
      .getOne();
  }

  /**
   * 특정 사용자가 팔로우하는 관계를 조회합니다.
   * @param userId 사용자 ID
   * @returns 팔로잉 관계 배열
   */
  async getFollowing(userId: string): Promise<Follow[]> {
    console.log(`[Service] 사용자 ${userId}의 팔로잉 조회 중`);
    const following = await this.followsRepository.find({
      where: { followerId: userId },
      relations: ['following'],
    });
    console.log(`[Service] 사용자 ${userId}의 팔로잉 조회 결과:`, following);
    return following || [];
  }

  /**
   * 특정 사용자의 팔로워 관계를 조회합니다.
   * @param userId 사용자 ID
   * @returns 팔로워 관계 배열
   */
  async getFollowers(userId: string): Promise<Follow[]> {
    console.log(`[Service] 사용자 ${userId}의 팔로워 조회 중`);
    const followers = await this.followsRepository.find({
      where: { followingId: userId },
      relations: ['follower'],
    });
    console.log(`[Service] 사용자 ${userId}의 팔로워 조회 결과:`, followers);
    return followers || [];
  }

  /**
   * 특정 사용자의 팔로워 수를 조회합니다.
   * @param userId 사용자 ID
   * @returns 팔로워 수
   */
  async getFollowerCount(userId: string): Promise<number> {
    return this.followsRepository.count({
      where: { followingId: userId },
    });
  }

  /**
   * 특정 사용자가 팔로우하는 사용자 수를 조회합니다.
   * @param userId 사용자 ID
   * @returns 팔로잉 수
   */
  async getFollowingCount(userId: string): Promise<number> {
    return this.followsRepository.count({
      where: { followerId: userId },
    });
  }

  /**
   * 특정 사용자가 작성한 게시물 수를 조회합니다.
   * @param userId 사용자 ID
   * @returns 게시물 수
   */
  async getPostCount(userId: string): Promise<number> {
    return this.postsRepository.count({
      where: { authorId: userId },
    });
  }

  /**
   * 현재 사용자가 특정 사용자를 팔로우하는지 확인합니다.
   * @param currentUserId 현재 사용자 ID
   * @param targetUserId 대상 사용자 ID
   * @returns 팔로우 여부
   */
  async isFollowing(
    currentUserId: string,
    targetUserId: string,
  ): Promise<boolean> {
    const follow = await this.followsRepository.findOne({
      where: {
        followerId: currentUserId,
        followingId: targetUserId,
      },
    });
    return !!follow;
  }

  /**
   * 사용자를 팔로우하거나 언팔로우합니다.
   * @param currentUserId 현재 로그인한 사용자 ID
   * @param targetUserId 팔로우/언팔로우할 대상 사용자 ID
   * @returns 새로운 팔로우 상태 (true: 팔로우, false: 언팔로우)
   */
  async toggleFollow(
    currentUserId: string,
    targetUserId: string,
  ): Promise<boolean> {
    if (currentUserId === targetUserId) {
      throw new Error('자기 자신을 팔로우할 수 없습니다.');
    }

    const targetUser = await this.usersRepository.findOneBy({
      id: targetUserId,
    });
    if (!targetUser) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    const existingFollow = await this.followsRepository.findOne({
      where: {
        followerId: currentUserId,
        followingId: targetUserId,
      },
    });

    if (existingFollow) {
      // 이미 팔로우 중이므로 언팔로우 처리
      await this.followsRepository.remove(existingFollow);

      // 언팔로우 알림 이벤트 발생 (관련 알림 삭제용)
      this.eventEmitter.emit('notification.follow.cancel', {
        followerId: currentUserId,
        followedId: targetUserId,
      });

      return false;
    } else {
      // 팔로우하고 있지 않으므로 팔로우 처리
      const newFollow = this.followsRepository.create({
        followerId: currentUserId,
        followingId: targetUserId,
      });
      await this.followsRepository.save(newFollow);

      // 팔로우 알림 이벤트 발생
      this.eventEmitter.emit('notification.follow', {
        followerId: currentUserId,
        followedId: targetUserId,
      });

      return true;
    }
  }

  /**
   * 사용자가 선택한 팀 목록을 조회합니다.
   * @param userId 사용자 ID
   * @returns 사용자가 선택한 팀 목록
   */
  async getUserTeams(userId: string): Promise<UserTeam[]> {
    return this.userTeamsRepository.find({
      where: { user: { id: userId } },
      relations: ['team', 'team.sport', 'user'],
      order: {
        priority: 'ASC',
        createdAt: 'ASC',
      },
    });
  }

  /**
   * 닉네임의 사용 가능 여부를 확인합니다.
   * @param nickname 확인할 닉네임
   * @param excludeUserId 제외할 사용자 ID (프로필 수정 시 본인 제외)
   * @returns 사용 가능 여부와 메시지
   */
  async checkNicknameAvailability(
    nickname: string,
    excludeUserId?: string,
  ): Promise<{ available: boolean; message: string }> {
    try {
      // 닉네임 유효성 검증
      if (!nickname || nickname.trim().length < 2) {
        return {
          available: false,
          message: '닉네임은 최소 2자 이상이어야 합니다.',
        };
      }

      if (nickname.length > 30) {
        return {
          available: false,
          message: '닉네임은 최대 30자까지 가능합니다.',
        };
      }

      // 닉네임 패턴 검증 (한글, 영문, 숫자, 언더스코어만 허용)
      const nicknameRegex = /^[a-zA-Z0-9가-힣_]+$/;
      if (!nicknameRegex.test(nickname)) {
        return {
          available: false,
          message:
            '닉네임은 한글, 영문, 숫자, 언더스코어만 사용할 수 있습니다.',
        };
      }

      // 데이터베이스에서 중복 확인
      const existingUser = await this.usersRepository.findOne({
        where: { nickname: nickname.trim() },
      });

      // 제외할 사용자 ID가 있고, 그 사용자의 닉네임인 경우 사용 가능
      if (excludeUserId && existingUser?.id === excludeUserId) {
        return {
          available: true,
          message: '현재 사용 중인 닉네임입니다.',
        };
      }

      // 다른 사용자가 사용 중인 경우
      if (existingUser) {
        return {
          available: false,
          message: '이미 사용 중인 닉네임입니다.',
        };
      }

      // 사용 가능한 닉네임
      return {
        available: true,
        message: '사용 가능한 닉네임입니다.',
      };
    } catch (error) {
      console.error('닉네임 중복 확인 중 오류 발생:', error);
      return {
        available: false,
        message: '닉네임 확인 중 오류가 발생했습니다.',
      };
    }
  }

  /**
   * 추천인 데이터 일관성 검증 및 복구
   * 세션 복원 시 데이터 무결성을 보장합니다.
   * @param userId 사용자 ID
   * @returns 검증 결과
   */
  async validateAndRepairReferralData(userId: string): Promise<{
    isValid: boolean;
    repaired: boolean;
    message: string;
  }> {
    try {
      const user = await this.usersRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        return {
          isValid: false,
          repaired: false,
          message: '사용자를 찾을 수 없습니다.',
        };
      }

      let hasChanges = false;

      // 1. referralCode 검증 및 복구
      if (!user.referralCode) {
        const referralCode = await this.createUniqueReferralCode();
        user.referralCode = referralCode;
        hasChanges = true;
        console.log(`[데이터 복구] 사용자 ${userId}의 추천인 코드 생성: ${referralCode}`);
      }

      // 2. referredBy 유효성 검증 (존재한다면)
      if (user.referredBy) {
        const referrer = await this.usersRepository.findOne({
          where: { referralCode: user.referredBy },
        });

        if (!referrer) {
          console.warn(
            `[데이터 검증] 사용자 ${userId}의 추천인 코드 ${user.referredBy}가 유효하지 않음`,
          );
          user.referredBy = undefined;
          hasChanges = true;
        }
      }

      // 변경사항이 있으면 저장
      if (hasChanges) {
        user.updatedAt = new Date();
        await this.usersRepository.save(user);
      }

      return {
        isValid: true,
        repaired: hasChanges,
        message: hasChanges ? '추천인 데이터가 복구되었습니다.' : '추천인 데이터가 유효합니다.',
      };
    } catch (error) {
      console.error('추천인 데이터 검증 중 오류 발생:', error);
      return {
        isValid: false,
        repaired: false,
        message: '추천인 데이터 검증 중 오류가 발생했습니다.',
      };
    }
  }
}
