import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Observable } from 'rxjs';

/**
 * GraphQL 인증 가드
 *
 * JWT 토큰을 통해 사용자를 인증하고 GraphQL 컨텍스트에 사용자 정보를 주입합니다.
 * Passport JWT 전략을 사용하여 토큰을 검증하고 사용자 정보를 추출합니다.
 *
 * @example
 * ```typescript
 * @UseGuards(GqlAuthGuard)
 * @Query(() => User)
 * async getCurrentUser(@CurrentUser() user: User): Promise<User> {
 *   return user;
 * }
 * ```
 */
@Injectable()
export class GqlAuthGuard extends AuthGuard('jwt') {
  /**
   * GraphQL 컨텍스트에서 요청 객체를 추출합니다.
   *
   * @param context - 실행 컨텍스트
   * @returns HTTP 요청 객체
   */
  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    const request = ctx.getContext().req;

    if (!request) {
      throw new UnauthorizedException('요청 객체를 찾을 수 없습니다.');
    }

    return request;
  }

  /**
   * 인증 여부를 확인합니다.
   *
   * @param context - 실행 컨텍스트
   * @returns 인증 결과
   */
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    try {
      return super.canActivate(context);
    } catch (error) {
      console.error('인증 가드 실행 중 오류 발생:', error);
      throw new UnauthorizedException('인증에 실패했습니다.');
    }
  }

  /**
   * 인증 실패 시 호출되는 메서드입니다.
   *
   * @param error - 인증 에러
   * @param user - 사용자 정보 (실패 시 false)
   * @returns 인증 실패 에러
   */
  handleRequest(error: any, user: any, info: any) {
    // 에러가 발생한 경우
    if (error) {
      console.error('JWT 인증 에러:', error);
      throw new UnauthorizedException('토큰 검증 중 오류가 발생했습니다.');
    }

    // 사용자 정보가 없는 경우
    if (!user) {
      const message = this.getErrorMessage(info);
      throw new UnauthorizedException(message);
    }

    // 사용자 계정이 비활성화된 경우
    if (user.isUserActive === false) {
      throw new UnauthorizedException(
        '비활성화된 계정입니다. 관리자에게 문의하세요.',
      );
    }

    // 이메일 인증이 되지 않은 경우 (필요시 활성화)
    // if (!user.isEmailVerified) {
    //   throw new UnauthorizedException('이메일 인증이 필요합니다.');
    // }

    return user;
  }

  /**
   * 인증 실패 사유에 따른 에러 메시지를 반환합니다.
   *
   * @param info - 인증 정보
   * @returns 에러 메시지
   */
  private getErrorMessage(info: any): string {
    if (!info) {
      return '인증 토큰이 제공되지 않았습니다.';
    }

    switch (info.name) {
      case 'TokenExpiredError':
        return '토큰이 만료되었습니다. 다시 로그인해주세요.';

      case 'JsonWebTokenError':
        return '유효하지 않은 토큰입니다.';

      case 'NotBeforeError':
        return '토큰이 아직 활성화되지 않았습니다.';

      case 'NoAuthTokenError':
        return '인증 토큰이 제공되지 않았습니다.';

      default:
        return '인증에 실패했습니다. 다시 로그인해주세요.';
    }
  }
}

/**
 * 선택적 GraphQL 인증 가드
 *
 * 인증이 선택적인 경우 사용합니다.
 * 토큰이 없거나 유효하지 않아도 에러를 발생시키지 않습니다.
 *
 * @example
 * ```typescript
 * @UseGuards(OptionalGqlAuthGuard)
 * @Query(() => [Post])
 * async getPosts(@OptionalCurrentUser() user: User | null): Promise<Post[]> {
 *   if (user) {
 *     return this.postsService.getPersonalizedPosts(user.id);
 *   } else {
 *     return this.postsService.getPublicPosts();
 *   }
 * }
 * ```
 */
@Injectable()
export class OptionalGqlAuthGuard extends AuthGuard('jwt') {
  /**
   * GraphQL 컨텍스트에서 요청 객체를 추출합니다.
   */
  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req;
  }

  /**
   * 선택적 인증이므로 항상 true를 반환합니다.
   */
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  /**
   * 선택적 인증이므로 에러를 발생시키지 않습니다.
   */
  handleRequest(error: any, user: any, info: any) {
    // 에러가 발생하거나 사용자가 없어도 null을 반환 (에러 발생 X)
    if (error || !user) {
      return null;
    }

    // 계정이 비활성화된 경우에도 null 반환
    if (user.isUserActive === false) {
      return null;
    }

    return user;
  }
}
