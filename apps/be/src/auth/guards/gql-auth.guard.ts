import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';

/**
 * @description GraphQL 환경에서 Local Strategy를 사용하기 위한 인증 가드입니다.
 * @summary 이 가드는 Passport의 'local' 전략을 트리거합니다.
 * `AuthGuard('local')`을 상속받아 구현하며, GraphQL 요청에서 HTTP 요청 객체를 추출하여
 * Passport 전략이 실행될 수 있도록 `getRequest` 메소드를 오버라이드합니다.
 *
 * 이 가드는 주로 로그인(login) 뮤테이션에 사용됩니다. 클라이언트가 제공한
 * 이메일과 비밀번호를 `LocalStrategy`로 전달하여 사용자 인증을 시도합니다.
 *
 * @see LocalStrategy - 실제 인증 로직(DB에서 사용자 조회 및 비밀번호 비교)을 담당합니다.
 *
 * @example
 * ```typescript
 * // 리졸버의 뮤테이션에 적용하는 예시
 * import { UseGuards } from '@nestjs/common';
 * import { Args, Mutation, Resolver } from '@nestjs/graphql';
 * import { GqlAuthGuard } from './guards/gql-auth.guard';
 *
 * @Resolver()
 * export class AuthResolver {
 *   @Mutation(() => LoginResponse)
 *   @UseGuards(GqlAuthGuard)
 *   async login(@Args('loginInput') loginInput: LoginInput, @Context() context) {
 *     // GqlAuthGuard가 성공적으로 통과하면 이 코드가 실행됩니다.
 *     // LocalStrategy의 validate 메소드에서 반환된 user 객체는
 *     // context.req.user에 저장됩니다.
 *     return this.authService.login(context.user);
 *   }
 * }
 * ```
 */
@Injectable()
export class GqlAuthGuard extends AuthGuard('local') {
  /**
   * @description Passport 전략이 사용할 요청(request) 객체를 반환합니다.
   * @param context - NestJS의 실행 컨텍스트
   * @returns HTTP 요청 객체
   */
  getRequest(context: ExecutionContext) {
    // GraphQL 실행 컨텍스트를 생성합니다.
    const ctx = GqlExecutionContext.create(context);
    // GraphQL 컨텍스트에서 HTTP 요청(request) 객체를 가져옵니다.
    const request = ctx.getContext().req;
    // `login` 뮤테이션의 인자(args)를 요청(request)의 body에 담아줍니다.
    // 이렇게 해야 Passport의 LocalStrategy가 `usernameField`와 `passwordField` 옵션을
    // 사용하여 요청 본문에서 자격 증명을 올바르게 추출할 수 있습니다.
    request.body = ctx.getArgs().loginInput;
    return request;
  }
}
