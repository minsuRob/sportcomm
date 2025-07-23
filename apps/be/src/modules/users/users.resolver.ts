import { UseGuards } from '@nestjs/common';
import {
  Args,
  Mutation,
  Resolver,
  ResolveField,
  Query,
  Parent,
} from '@nestjs/graphql';
import { Follow } from '../../entities/follow.entity';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import {
  CurrentUser,
  CurrentUserId,
} from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { User } from '../../entities/user.entity';

@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  /**
   * 사용자의 팔로잉 목록을 반환하는 리졸버
   * @param user 현재 처리 중인 User 객체
   * @returns 팔로잉 목록 배열 (항상 배열 반환, null 아님)
   */
  @ResolveField(() => [Follow], { nullable: false })
  async following(@Parent() user: User): Promise<Follow[]> {
    console.log(`[Resolver] 사용자 ${user.id}의 팔로잉 조회 요청`);
    const following = await this.usersService.getFollowing(user.id);
    console.log(`[Resolver] 사용자 ${user.id}의 팔로잉 조회 결과:`, following);
    return following || [];
  }

  /**
   * 사용자의 팔로워 목록을 반환하는 리졸버
   * @param user 현재 처리 중인 User 객체
   * @returns 팔로워 목록 배열 (항상 배열 반환, null 아님)
   */
  @ResolveField(() => [Follow], { nullable: false })
  async followers(@Parent() user: User): Promise<Follow[]> {
    console.log(`[Resolver] 사용자 ${user.id}의 팔로워 조회 요청`);
    const followers = await this.usersService.getFollowers(user.id);
    console.log(`[Resolver] 사용자 ${user.id}의 팔로워 조회 결과:`, followers);
    return followers || [];
  }

  /**
   * 사용자 ID로 사용자 정보를 조회하는 쿼리
   * @param userId 조회할 사용자 ID
   * @returns 사용자 정보
   */
  @UseGuards(GqlAuthGuard)
  @Query(() => User, { description: '사용자 ID로 사용자 정보 조회' })
  async getUserById(@Args('userId') userId: string): Promise<User> {
    return this.usersService.findById(userId);
  }

  /**
   * 사용자를 팔로우하거나 언팔로우하는 뮤테이션
   * @param userId 팔로우/언팔로우할 대상 사용자 ID
   * @param currentUserId 현재 로그인한 사용자 ID
   * @returns 새로운 팔로우 상태 (true: 팔로우, false: 언팔로우)
   */
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean)
  async toggleFollow(
    @Args('userId') userId: string,
    @CurrentUserId() currentUserId: string,
  ): Promise<boolean> {
    return this.usersService.toggleFollow(currentUserId, userId);
  }

  /**
   * 특정 사용자의 팔로워 수를 반환하는 리졸버
   * @param user 현재 처리 중인 User 객체
   * @returns 팔로워 수
   */
  @ResolveField(() => Number, { description: '이 사용자의 팔로워 수' })
  async followerCount(@Parent() user: User): Promise<number> {
    return this.usersService.getFollowerCount(user.id);
  }

  /**
   * 특정 사용자가 팔로우하는 사용자 수를 반환하는 리졸버
   * @param user 현재 처리 중인 User 객체
   * @returns 팔로잉 수
   */
  @ResolveField(() => Number, {
    description: '이 사용자가 팔로우하는 사용자 수',
  })
  async followingCount(@Parent() user: User): Promise<number> {
    return this.usersService.getFollowingCount(user.id);
  }

  /**
   * 특정 사용자가 작성한 게시물 수를 반환하는 리졸버
   * @param user 현재 처리 중인 User 객체
   * @returns 게시물 수
   */
  @ResolveField(() => Number, { description: '이 사용자가 작성한 게시물 수' })
  async postCount(@Parent() user: User): Promise<number> {
    return this.usersService.getPostCount(user.id);
  }

  /**
   * 현재 로그인한 사용자가 특정 사용자를 팔로우하는지 여부를 반환하는 리졸버
   * @param user 현재 처리 중인 User 객체
   * @param currentUser 현재 로그인한 사용자 정보 (선택적)
   * @returns 팔로우 여부
   */
  @ResolveField(() => Boolean, {
    description: '현재 사용자가 이 사용자를 팔로우하는지 여부',
  })
  async isFollowing(
    @Parent() user: User,
    @CurrentUser() currentUser: User,
  ): Promise<boolean> {
    if (!currentUser || currentUser.id === user.id) {
      return false;
    }
    return this.usersService.isFollowing(currentUser.id, user.id);
  }
}
