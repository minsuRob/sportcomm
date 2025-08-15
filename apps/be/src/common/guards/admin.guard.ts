import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { UserRole } from '../../entities/user.entity';

/**
 * 관리자 권한 가드
 *
 * GraphQL 리졸버에서 관리자 권한이 필요한 작업을 보호합니다.
 * GqlAuthGuard와 함께 사용하여 인증된 관리자만 접근할 수 있도록 합니다.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const ctx = GqlExecutionContext.create(context);
    const { req } = ctx.getContext();

    const user = req?.user;

    if (!user) {
      throw new ForbiddenException('인증이 필요합니다.');
    }

    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('관리자 권한이 필요합니다.');
    }

    return true;
  }
}
