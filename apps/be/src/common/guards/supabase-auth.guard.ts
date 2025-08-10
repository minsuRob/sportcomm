import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GqlExecutionContext } from '@nestjs/graphql';

/**
 * Supabase JWT 인증 가드
 * 
 * GraphQL과 REST API 모두에서 사용할 수 있는 인증 가드
 * Supabase에서 발급한 JWT 토큰을 검증합니다.
 */
@Injectable()
export class SupabaseAuthGuard extends AuthGuard('supabase-jwt') {
  /**
   * GraphQL 요청에서 request 객체를 가져오는 메서드
   * REST API 요청과 GraphQL 요청을 모두 처리할 수 있도록 합니다.
   */
  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req;
  }
}

/**
 * 선택적 Supabase JWT 인증 가드
 * 
 * 토큰이 있으면 인증을 수행하고, 없으면 그냥 통과시킵니다.
 * 로그인한 사용자와 비로그인 사용자 모두 접근 가능한 API에서 사용합니다.
 */
@Injectable()
export class OptionalSupabaseAuthGuard extends AuthGuard('supabase-jwt') {
  /**
   * GraphQL 요청에서 request 객체를 가져오는 메서드
   */
  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req;
  }

  /**
   * 인증 실패 시에도 요청을 계속 진행하도록 합니다.
   */
  handleRequest(err: any, user: any, info: any) {
    // 에러가 있거나 사용자가 없어도 그냥 통과
    return user;
  }
}
