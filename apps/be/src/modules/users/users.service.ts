import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Follow } from '../../entities/follow.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Follow)
    private readonly followsRepository: Repository<Follow>,
  ) {}

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

    const targetUser = await this.usersRepository.findOneBy({ id: targetUserId });
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