import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Observable } from 'rxjs';

/**
 * JWT 인증 가드
 * REST API 및 GraphQL 요청에서 JWT 토큰을 검증하는 인증 가드입니다.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor() {
    super();
  }

  /**
   * GraphQL 컨텍스트에서 요청 객체를 추출합니다.
   * @param context 실행 컨텍스트
   * @returns 요청 객체
   */
  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    const request = ctx.getContext().req || ctx.getContext().request;

    console.log('JwtAuthGuard getRequest:', {
      hasContext: !!ctx.getContext(),
      hasReq: !!ctx.getContext().req,
      hasRequest: !!ctx.getContext().request,
      hasHeaders: !!request?.headers,
      authHeader: request?.headers?.authorization?.substring(0, 20) + '...',
    });

    return request;
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  handleRequest(error: any, user: any, info: any) {
    console.log('JWT 인증 가드 디버깅:', {
      hasError: !!error,
      errorMessage: error?.message,
      hasUser: !!user,
      userId: user?.id,
      infoName: info?.name,
      infoMessage: info?.message,
    });

    if (error || !user) {
      const errorMessage =
        error?.message || info?.message || '인증에 실패했습니다.';
      console.error('JWT 인증 실패:', { error, info, user: !!user });

      throw new UnauthorizedException(`인증에 실패했습니다. ${errorMessage}`);
    }

    if (user.isUserActive === false) {
      throw new UnauthorizedException(
        '비활성화된 계정입니다. 관리자에게 문의하세요.',
      );
    }

    console.log('JWT 인증 성공:', { userId: user.id, email: user.email });
    return user;
  }
}

/**
 * 선택적 JWT 인증 가드
 * 인증 토큰이 없어도 요청을 처리할 수 있는 선택적 인증 가드입니다.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    try {
      return super.canActivate(context);
    } catch (error) {
      // 인증 실패해도 다음 단계로 진행
      return true;
    }
  }

  handleRequest(error: any, user: any, info: any) {
    // 에러가 있거나 사용자가 없어도 null 반환 (거부하지 않음)
    if (error || !user) {
      return null;
    }

    // 비활성화된 사용자는 null로 처리
    if (user.isUserActive === false) {
      return null;
    }

    return user;
  }
}
