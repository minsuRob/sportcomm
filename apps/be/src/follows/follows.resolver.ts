import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/user.entity';
import { Follow } from './follow.entity';
import { FollowsService } from './follows.service';

/**
 * @description 팔로우/언팔로우와 관련된 GraphQL 요청(뮤테이션, 쿼리)을 처리하는 리졸버입니다.
 * @summary `@Resolver()` 데코레이터에 `Follow` 엔티티를 전달하여 이 리졸버가 `Follow` 타입을 처리함을 명시합니다.
 * 모든 요청은 `JwtAuthGuard`를 통해 인증된 사용자만 접근할 수 있도록 보호됩니다.
 */
@Resolver(() => Follow)
export class FollowsResolver {
  /**
   * @param followsService - 팔로우 관련 비즈니스 로직을 담고 있는 서비스
   */
  constructor(private readonly followsService: FollowsService) {}

  /**
   * @description 특정 사용자를 팔로우하는 뮤테이션입니다.
   * @param user - `@CurrentUser()` 데코레이터를 통해 주입된 현재 사용자 정보 (팔로우를 하는 주체).
   * @param followingId - 팔로우할 대상 사용자의 ID.
   * @returns 생성된 팔로우 관계 객체.
   */
  @Mutation(() => Follow, { description: '특정 사용자를 팔로우합니다.' })
  @UseGuards(JwtAuthGuard)
  follow(
    @CurrentUser() user: { id: string },
    @Args('followingId', {
      type: () => String,
      description: '팔로우할 사용자의 ID',
    })
    followingId: string,
  ): Promise<Follow> {
    // 서비스 레이어에 팔로워 ID와 팔로잉 ID를 전달하여 로직을 위임합니다.
    return this.followsService.follow(user.id, followingId);
  }

  /**
   * @description 특정 사용자를 언팔로우하는 뮤테이션입니다.
   * @param user - 현재 사용자 정보 (언팔로우를 하는 주체).
   * @param followingId - 언팔로우할 대상 사용자의 ID.
   * @returns 삭제된 팔로우 관계 객체.
   */
  @Mutation(() => Follow, { description: '특정 사용자를 언팔로우합니다.' })
  @UseGuards(JwtAuthGuard)
  unfollow(
    @CurrentUser() user: { id: string },
    @Args('followingId', {
      type: () => String,
      description: '언팔로우할 사용자의 ID',
    })
    followingId: string,
  ): Promise<Follow> {
    // 서비스 레이어에 팔로워 ID와 팔로잉 ID를 전달하여 로직을 위임합니다.
    return this.followsService.unfollow(user.id, followingId);
  }

  /**
   * @description 특정 사용자의 팔로워 목록을 조회하는 쿼리입니다.
   * @param userId - 팔로워 목록을 조회할 사용자의 ID.
   * @returns 해당 사용자를 팔로우하는 사용자(User) 목록.
   */
  @Query(() => [User], {
    name: 'followers',
    description: '특정 사용자의 팔로워 목록을 조회합니다.',
  })
  @UseGuards(JwtAuthGuard) // 인증된 사용자만 조회 가능
  getFollowers(
    @Args('userId', { type: () => String, description: '조회할 사용자의 ID' })
    userId: string,
  ): Promise<User[]> {
    return this.followsService.getFollowers(userId);
  }

  /**
   * @description 특정 사용자의 팔로잉 목록을 조회하는 쿼리입니다.
   * @param userId - 팔로잉 목록을 조회할 사용자의 ID.
   * @returns 해당 사용자가 팔로우하는 사용자(User) 목록.
   */
  @Query(() => [User], {
    name: 'following',
    description: '특정 사용자가 팔로우하는 목록을 조회합니다.',
  })
  @UseGuards(JwtAuthGuard) // 인증된 사용자만 조회 가능
  getFollowing(
    @Args('userId', { type: () => String, description: '조회할 사용자의 ID' })
    userId: string,
  ): Promise<User[]> {
    return this.followsService.getFollowing(userId);
  }
}
