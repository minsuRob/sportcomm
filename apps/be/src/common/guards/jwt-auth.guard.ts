import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

/**
 * JWT 인증 가드
 * REST API 및 GraphQL 요청에서 JWT 토큰을 검증하는 인증 가드입니다.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  handleRequest(error: any, user: any, info: any) {
    if (error || !user) {
      throw new UnauthorizedException(
        '인증에 실패했습니다. 유효한 인증 토큰이 필요합니다.',
      );
    }

    if (user.isUserActive === false) {
      throw new UnauthorizedException(
        '비활성화된 계정입니다. 관리자에게 문의하세요.',
      );
    }

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
