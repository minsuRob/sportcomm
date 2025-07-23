import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';

@Resolver()
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

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
}
