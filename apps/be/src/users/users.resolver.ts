import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from './user.entity';
import { UsersService } from './users.service';

/**
 * @description 사용자 데이터와 관련된 GraphQL 쿼리를 처리하는 리졸버입니다.
 * @summary `@Resolver()` 데코레이터에 `User` 엔티티를 전달하여 이 리졸버가 `User` 타입을 처리함을 명시합니다.
 */
@Resolver(() => User)
export class UsersResolver {
  /**
   * @param usersService - 사용자 관련 비즈니스 로직을 담고 있는 서비스
   */
  constructor(private readonly usersService: UsersService) {}

  /**
   * @description 현재 인증된 사용자의 프로필 정보를 조회합니다.
   * @summary `JwtAuthGuard`를 통해 요청이 인증되었는지 확인합니다.
   * `CurrentUser` 데코레이터를 사용하여 요청 컨텍스트에 주입된 사용자 정보를 가져옵니다.
   * @param currentUser - `@CurrentUser()` 데코레이터에 의해 주입된 현재 사용자 객체.
   *                   JwtStrategy에서 반환한 페이로드 정보를 담고 있습니다.
   * @returns 현재 로그인된 사용자의 전체 정보 (비밀번호 제외).
   */
  @Query(() => User, {
    name: 'me',
    description: '현재 인증된 사용자의 프로필 정보를 반환합니다.',
  })
  @UseGuards(JwtAuthGuard)
  me(
    @CurrentUser() currentUser: { id: string },
  ): Promise<Omit<User, 'password'>> {
    // CurrentUser 데코레이터에서 받은 user 객체에는 id, nickname, role만 있으므로,
    // 전체 사용자 정보를 얻기 위해 DB에서 다시 조회합니다.
    return this.usersService.findOne(currentUser.id);
  }

  /**
   * @description 특정 ID를 가진 사용자의 정보를 조회합니다.
   * @summary 이 쿼리는 예시이며, 실제 서비스에서는 친구 관계 등 특정 조건 하에서만
   * 다른 사용자의 정보를 조회할 수 있도록 접근 제어 로직이 추가되어야 합니다.
   * 현재는 JWT 인증만 통과하면 누구나 다른 사용자의 정보를 ID로 조회할 수 있습니다.
   * @param id - 조회할 사용자의 UUID.
   * @returns 조회된 사용자 객체 (비밀번호 제외).
   */
  @Query(() => User, {
    name: 'user',
    description: 'ID로 특정 사용자를 조회합니다.',
  })
  @UseGuards(JwtAuthGuard) // 최소한 로그인한 사용자만 조회 가능하도록 보호합니다.
  findOneById(
    @Args('id', { type: () => String, description: '조회할 사용자의 ID' })
    id: string,
  ): Promise<Omit<User, 'password'>> {
    return this.usersService.findOne(id);
  }
}
