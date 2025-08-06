import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Observable } from 'rxjs';

/**
 * GraphQL 인증 가드 (Supabase JWT 사용)
 */
@Injectable()
export class GqlAuthGuard extends AuthGuard('supabase-jwt') {
  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    const req = ctx.getContext().req;

    // 토큰 디버깅
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      console.log('🔍 받은 토큰 (처음 50자):', token.substring(0, 50) + '...');

      // JWT 페이로드 디코딩 (검증 없이)
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(
            Buffer.from(parts[1], 'base64').toString(),
          );
          console.log('🔍 토큰 페이로드:', {
            sub: payload.sub,
            email: payload.email,
            iss: payload.iss,
            aud: payload.aud,
            exp: payload.exp,
            iat: payload.iat,
          });
        }
      } catch (e) {
        console.error('❌ 토큰 디코딩 실패:', e.message);
      }
    } else {
      console.log('❌ Authorization 헤더가 없습니다');
    }

    return req;
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  handleRequest(error: any, user: any, info: any) {
    console.log('🔍 GqlAuthGuard.handleRequest:', {
      error: error?.message || error,
      user: user ? `User ID: ${user.id}` : 'No user',
      info: info?.message || info,
    });

    if (error || !user) {
      console.error('❌ 인증 실패:', { error, info });
      throw new UnauthorizedException(
        '인증에 실패했습니다. 다시 로그인해주세요.',
      );
    }

    if (user.isActive === false) {
      throw new UnauthorizedException(
        '비활성화된 계정입니다. 관리자에게 문의하세요.',
      );
    }

    console.log('✅ 인증 성공:', { userId: user.id, nickname: user.nickname });
    return user;
  }
}

/**
 * 선택적 GraphQL 인증 가드 (Supabase JWT 사용)
 */
@Injectable()
export class OptionalGqlAuthGuard extends AuthGuard('supabase-jwt') {
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
