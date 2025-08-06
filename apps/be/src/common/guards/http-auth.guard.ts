import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable, lastValueFrom } from 'rxjs';

/**
 * HTTP 요청 인증 가드
 * REST API 엔드포인트에서 JWT 토큰을 검증하는 인증 가드입니다.
 */
@Injectable()
export class HttpAuthGuard extends AuthGuard('jwt') {
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

    if (user.isActive === false) {
      throw new UnauthorizedException(
        '비활성화된 계정입니다. 관리자에게 문의하세요.',
      );
    }

    return user;
  }
}

/**
 * 선택적 HTTP 인증 가드
 * 인증 토큰이 없어도 요청을 처리할 수 있는 선택적 인증 가드입니다.
 */
@Injectable()
export class OptionalHttpAuthGuard extends AuthGuard('jwt') {
  // 인증 실패해도 에러를 던지지 않도록 오버라이드
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const result = super.canActivate(context);
      // Observable을 반환하는 경우 Promise로 변환
      if (result instanceof Observable) {
        return await lastValueFrom(result);
      }
      // boolean 또는 Promise<boolean>을 반환하는 경우
      return await result;
    } catch (error) {
      // 인증 실패해도 다음 단계로 진행
      console.log('인증 건너뜀 (선택적 인증):', error.message);
      return true;
    }
  }

  handleRequest(error: any, user: any, info: any) {
    // 에러가 있거나 사용자가 없어도 null 반환 (거부하지 않음)
    if (error || !user) {
      return null;
    }

    // 비활성화된 사용자는 null로 처리
    if (user.isActive === false) {
      return null;
    }

    return user;
  }
}
