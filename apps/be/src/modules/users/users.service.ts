import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Follow } from '../../entities/follow.entity';
import { Post } from '../../entities/post.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Follow)
    private readonly followsRepository: Repository<Follow>,
    @InjectRepository(Post)
    private readonly postsRepository: Repository<Post>,
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
        'isEmailVerified',
        'isUserActive',
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
      return false;
    } else {
      // 팔로우하고 있지 않으므로 팔로우 처리
      const newFollow = this.followsRepository.create({
        followerId: currentUserId,
        followingId: targetUserId,
      });
      await this.followsRepository.save(newFollow);
      return true;
    }
  }
}
