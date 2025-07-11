import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

/**
 * @description GraphQL 요청 컨텍스트에서 현재 인증된 사용자 정보를 추출하는 커스텀 데코레이터입니다.
 * @summary 이 데코레이터는 `JwtAuthGuard`와 같은 인증 가드가 실행된 후에 사용되어야 합니다.
 * 가드는 JWT 토큰을 검증하고, 유효한 경우 요청(request) 객체에 `user` 속성을 추가합니다.
 * `@CurrentUser()` 데코레이터를 사용하여 리졸버의 파라미터에서 직접 `user` 객체를 주입받을 수 있습니다.
 *
 * @example
 * ```typescript
 * // 리졸버 메소드에서 사용하는 예시
 * import { UseGuards } from '@nestjs/common';
 * import { Query, Resolver } from '@nestjs/graphql';
 * import { JwtAuthGuard } from './guards/jwt-auth.guard';
 * import { CurrentUser } from './decorators/current-user.decorator';
 * import { User } from '../users/user.entity';
 *
 * @Resolver()
 * export class SomeResolver {
 *   @Query(() => User)
 *   @UseGuards(JwtAuthGuard)
 *   whoAmI(@CurrentUser() user: User): User {
 *     console.log(user); // 요청을 보낸 사용자의 정보
 *     return user;
 *   }
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    // GraphQL 실행 컨텍스트를 가져옵니다.
    const ctx = GqlExecutionContext.create(context);
    // 컨텍스트에서 요청(request) 객체를 추출하고, 해당 객체의 user 속성을 반환합니다.
    return ctx.getContext().req.user;
  },
);
