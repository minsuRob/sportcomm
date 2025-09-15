import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
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
        'createdAt',
        'updatedAt',
      ],
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    return user;
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
}
