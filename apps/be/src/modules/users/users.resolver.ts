import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';
import { UsersService } from './users.service';

@Resolver()
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  /**
   * 사용자를 팔로우하거나 언팔로우하는 뮤테이션
   * @param user 현재 로그인한 사용자
   * @param userId 팔로우/언팔로우할 대상 사용자 ID
   * @returns 새로운 팔로우 상태 (true: 팔로우, false: 언팔로우)
   */
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean)
  async toggleFollow(
    @CurrentUser() user: User,
    @Args('userId') userId: string,
  ): Promise<boolean> {
    return this.usersService.toggleFollow(user.id, userId);
  }
}