import { UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';
import { CreateUserInput } from '../users/dto/create-user.input';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { LoginResponse } from './dto/login-response';
import { LoginInput } from './dto/login.input';
import { GqlAuthGuard } from './guards/gql-auth.guard';

/**
 * @description 인증(로그인, 회원가입)과 관련된 GraphQL 요청을 처리하는 리졸버입니다.
 */
@Resolver()
export class AuthResolver {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * @description 사용자를 로그인 처리하고 JWT를 발급합니다.
   * @summary `GqlAuthGuard`가 `LocalStrategy`를 실행하여 사용자를 검증합니다.
   * @param loginInput - 로그인 정보 (이메일, 비밀번호). `GqlAuthGuard`에 의해 사용됩니다.
   * @param context - GraphQL 컨텍스트. `GqlAuthGuard`에 의해 `user` 객체가 주입됩니다.
   * @returns 로그인 응답 (액세스 토큰 포함).
   */
  @Mutation(() => LoginResponse, { description: '사용자 로그인' })
  @UseGuards(GqlAuthGuard)
  async login(
    // loginInput은 GqlAuthGuard에서 사용되므로, 여기서 직접 사용하지 않더라도 선언해야 합니다.
    @Args('loginInput') loginInput: LoginInput,
    @Context() context,
  ): Promise<LoginResponse> {
    // GqlAuthGuard -> LocalStrategy -> AuthService.validateUser를 거쳐
    // 검증이 완료된 사용자 정보(context.user)를 login 메소드에 전달합니다.
    return this.authService.login(context.user);
  }

  /**
   * @description 새로운 사용자를 등록(회원가입)합니다.
   * @param createUserInput - 생성할 사용자 정보 (nickname, email, password).
   * @returns 생성된 사용자 객체 (GraphQL 스키마에 따라 passwordHash 제외).
   */
  @Mutation(() => User, { description: '사용자 회원가입' })
  signup(
    @Args('createUserInput') createUserInput: CreateUserInput,
  ): Promise<Omit<User, 'passwordHash'>> {
    // UsersService의 create 메소드는 passwordHash가 제외된 사용자 객체를 반환하므로,
    // TypeScript의 반환 타입도 이에 맞춰 Omit<User, 'passwordHash'>으로 지정합니다.
    // GraphQL의 User 타입에는 passwordHash 필드가 없으므로 스키마와 실제 반환 데이터는 일치합니다.
    return this.usersService.create(createUserInput);
  }
}
