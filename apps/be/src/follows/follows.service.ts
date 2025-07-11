import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Follow } from './follow.entity';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';

/**
 * @description 팔로우/언팔로우와 관련된 비즈니스 로직을 처리하는 서비스 클래스입니다.
 * @summary 데이터베이스와의 상호작용(생성, 삭제, 조회)을 담당하며, FollowsResolver에 의해 호출됩니다.
 */
@Injectable()
export class FollowsService {
  /**
   * @param followRepository TypeORM의 Follow 리포지토리.
   * @param usersService 사용자의 존재 여부를 확인하기 위한 UsersService.
   */
  constructor(
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
    private readonly usersService: UsersService,
  ) {}

  /**
   * @description 특정 사용자를 팔로우합니다.
   * @param followerId - 팔로우를 요청하는 사용자의 ID.
   * @param followingId - 팔로우 대상 사용자의 ID.
   * @returns 생성된 팔로우 관계 객체.
   * @throws {BadRequestException} - 자기 자신을 팔로우하려고 할 경우 발생합니다.
   * @throws {NotFoundException} - 팔로우 대상 사용자를 찾을 수 없을 경우 발생합니다.
   * @throws {ConflictException} - 이미 팔로우하고 있는 사용자일 경우 발생합니다.
   */
  async follow(followerId: string, followingId: string): Promise<Follow> {
    if (followerId === followingId) {
      throw new BadRequestException('자기 자신을 팔로우할 수 없습니다.');
    }

    // 팔로우할 사용자가 존재하는지 확인합니다.
    await this.usersService.findOne(followingId);

    // 이미 팔로우 관계가 존재하는지 확인합니다.
    const existingFollow = await this.followRepository.findOne({
      where: { followerId, followingId },
    });

    if (existingFollow) {
      throw new ConflictException('이미 팔로우하고 있는 사용자입니다.');
    }

    // 새로운 팔로우 관계를 생성하고 저장합니다.
    const newFollow = this.followRepository.create({
      followerId,
      followingId,
    });

    return this.followRepository.save(newFollow);
  }

  /**
   * @description 특정 사용자를 언팔로우합니다.
   * @param followerId - 언팔로우를 요청하는 사용자의 ID.
   * @param followingId - 언팔로우 대상 사용자의 ID.
   * @returns 삭제된 팔로우 관계 객체.
   * @throws {NotFoundException} - 팔로우 관계를 찾을 수 없을 경우 발생합니다.
   */
  async unfollow(followerId: string, followingId: string): Promise<Follow> {
    const follow = await this.followRepository.findOne({
      where: { followerId, followingId },
    });

    if (!follow) {
      throw new NotFoundException('해당 사용자를 팔로우하고 있지 않습니다.');
    }

    // remove는 엔티티를 데이터베이스에서 완전히 삭제합니다.
    await this.followRepository.remove(follow);

    // 삭제된 객체를 반환하여 어떤 관계가 해제되었는지 명확히 합니다.
    return follow;
  }

  /**
   * @description 특정 사용자를 팔로우하는 사용자 목록(팔로워)을 조회합니다.
   * @param userId - 팔로워 목록을 조회할 사용자의 ID.
   * @returns 해당 사용자를 팔로우하는 사용자(User)의 배열.
   * @throws {NotFoundException} - 대상 사용자를 찾을 수 없을 경우 발생합니다.
   */
  async getFollowers(userId: string): Promise<User[]> {
    await this.usersService.findOne(userId); // 사용자가 존재하는지 먼저 확인

    const follows = await this.followRepository.find({
      where: { followingId: userId },
      relations: ['follower'], // Follow 엔티티에 정의된 'follower' 관계를 로드
    });

    // Follow 객체 배열에서 'follower' (User) 객체만 추출하여 반환
    return follows.map(follow => follow.follower);
  }

  /**
   * @description 특정 사용자가 팔로우하는 사용자 목록(팔로잉)을 조회합니다.
   * @param userId - 팔로잉 목록을 조회할 사용자의 ID.
   * @returns 해당 사용자가 팔로우하는 사용자(User)의 배열.
   * @throws {NotFoundException} - 대상 사용자를 찾을 수 없을 경우 발생합니다.
   */
  async getFollowing(userId: string): Promise<User[]> {
    await this.usersService.findOne(userId); // 사용자가 존재하는지 먼저 확인

    const follows = await this.followRepository.find({
      where: { followerId: userId },
      relations: ['following'], // Follow 엔티티에 정의된 'following' 관계를 로드
    });

    // Follow 객체 배열에서 'following' (User) 객체만 추출하여 반환
    return follows.map(follow => follow.following);
  }
}
