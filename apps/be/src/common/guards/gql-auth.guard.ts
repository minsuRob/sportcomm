import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Observable } from 'rxjs';

/**
 * GraphQL 인증 가드 (localhost용 간소화 버전)
 */
@Injectable()
export class GqlAuthGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req;
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  handleRequest(error: any, user: any, info: any) {
    if (error || !user) {
      throw new UnauthorizedException(
        '인증에 실패했습니다. 다시 로그인해주세요.',
      );
    }

    if (user.isActive === false) {
      throw new UnauthorizedException(
        '비활성화된 계정입니다. 관리자에게 문의하세요.',
      );
    }

    return user;
  }
}

/**
 * 선택적 GraphQL 인증 가드
 */
@Injectable()
export class OptionalGqlAuthGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req;
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  handleRequest(error: any, user: any, info: any) {
    if (error || !user) {
      return null;
    }

    if (user.isActive === false) {
      return null;
    }

    return user;
  }
}
