import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';

/**
 * @description GraphQL 환경에서 JWT(JSON Web Token)를 사용하기 위한 인증 가드입니다.
 * @summary 이 가드는 Passport의 'jwt' 전략을 트리거합니다.
 * `AuthGuard('jwt')`를 상속받아 구현하며, GraphQL 요청에서 HTTP 요청 객체를 추출하여
 * Passport의 JWT 전략이 실행될 수 있도록 `getRequest` 메소드를 오버라이드합니다.
 *
 * 이 가드는 인증이 필요한 모든 GraphQL 쿼리 또는 뮤테이션에 적용되어야 합니다.
 * 클라이언트가 요청 헤더에 포함시킨 JWT를 검증하고, 토큰이 유효하면
 * 페이로드에 담긴 사용자 정보를 요청(request) 객체의 `user` 속성에 첨부합니다.
 *
 * @see JwtStrategy - 실제 JWT 검증 로직(토큰 서명 확인, 만료 시간 체크 등)을 담당합니다.
 *
 * @example
 * ```typescript
 * // 리졸버의 쿼리에 적용하는 예시
 * import { UseGuards } from '@nestjs/common';
 * import { Query, Resolver } from '@nestjs/graphql';
 * import { JwtAuthGuard } from './guards/jwt-auth.guard';
 * import { CurrentUser } from '../decorators/current-user.decorator';
 * import { User } from '../users/user.entity';
 *
 * @Resolver()
 * export class SomeResolver {
 *   @Query(() => User)
 *   @UseGuards(JwtAuthGuard)
 *   getProfile(@CurrentUser() user: User): User {
 *     // JwtAuthGuard를 통과하면, CurrentUser 데코레이터가
 *     // 요청(request) 객체에 추가된 user 정보를 반환합니다.
 *     return user;
 *   }
 * }
 * ```
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  /**
   * @description Passport 전략이 사용할 요청(request) 객체를 반환합니다.
   * @param context - NestJS의 실행 컨텍스트
   * @returns HTTP 요청 객체
   */
  getRequest(context: ExecutionContext) {
    // GraphQL 실행 컨텍스트를 생성합니다.
    const ctx = GqlExecutionContext.create(context);
    // GraphQL 컨텍스트에서 HTTP 요청(request) 객체를 반환합니다.
    // JwtStrategy는 이 요청 객체의 헤더에서 토큰을 추출합니다.
    return ctx.getContext().req;
  }
}
