import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { User } from '../../entities/user.entity';

/**
 * 현재 인증된 사용자 정보를 추출하는 데코레이터
 *
 * GraphQL 리졸버에서 현재 로그인한 사용자의 정보를 쉽게 가져올 수 있습니다.
 * JWT 토큰을 통해 인증된 사용자 정보가 요청 컨텍스트에 저장된 상태에서 사용됩니다.
 *
 * @example
 * ```typescript
 * @Query(() => User)
 * async getCurrentUser(@CurrentUser() user: User): Promise<User> {
 *   return user;
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, context: ExecutionContext): User => {
    // GraphQL 컨텍스트에서 사용자 정보 추출
    const ctx = GqlExecutionContext.create(context);
    const request = ctx.getContext().req;

    // 요청 객체에서 사용자 정보 가져오기
    const user = request.user;

    // 사용자 정보가 없는 경우 에러 발생
    if (!user) {
      throw new Error('인증되지 않은 사용자입니다. 로그인이 필요합니다.');
    }

    // 특정 속성만 반환하는 경우
    if (data && typeof data === 'string') {
      const userProperty = user[data];
      if (userProperty === undefined) {
        throw new Error(`사용자 객체에서 '${data}' 속성을 찾을 수 없습니다.`);
      }
      return userProperty;
    }

    // 전체 사용자 객체 반환
    return user;
  },
);

/**
 * 현재 사용자 ID만 추출하는 데코레이터
 *
 * 사용자 ID만 필요한 경우 간편하게 사용할 수 있습니다.
 *
 * @example
 * ```typescript
 * @Mutation(() => Post)
 * async createPost(
 *   @CurrentUserId() userId: string,
 *   @Args('input') input: CreatePostInput
 * ): Promise<Post> {
 *   return this.postsService.create(userId, input);
 * }
 * ```
 */
export const CurrentUserId = createParamDecorator(
  (data: unknown, context: ExecutionContext): string => {
    const ctx = GqlExecutionContext.create(context);
    const request = ctx.getContext().req;

    const user = request.user;
    if (!user) {
      throw new Error('인증되지 않은 사용자입니다. 로그인이 필요합니다.');
    }

    if (!user.id) {
      throw new Error('사용자 ID를 찾을 수 없습니다.');
    }

    return user.id;
  },
);

/**
 * 현재 사용자 역할을 추출하는 데코레이터
 *
 * 사용자 역할 기반 로직에서 사용할 수 있습니다.
 *
 * @example
 * ```typescript
 * @Mutation(() => Boolean)
 * async deletePost(
 *   @CurrentUserRole() userRole: UserRole,
 *   @Args('id') id: string
 * ): Promise<boolean> {
 *   if (userRole !== UserRole.ADMIN) {
 *     throw new Error('관리자만 삭제할 수 있습니다.');
 *   }
 *   return this.postsService.delete(id);
 * }
 * ```
 */
export const CurrentUserRole = createParamDecorator(
  (data: unknown, context: ExecutionContext): string => {
    const ctx = GqlExecutionContext.create(context);
    const request = ctx.getContext().req;

    const user = request.user;
    if (!user) {
      throw new Error('인증되지 않은 사용자입니다. 로그인이 필요합니다.');
    }

    if (!user.role) {
      throw new Error('사용자 역할을 찾을 수 없습니다.');
    }

    return user.role;
  },
);

/**
 * 선택적 사용자 정보 추출 데코레이터
 *
 * 인증이 선택적인 경우 사용합니다.
 * 인증되지 않은 사용자의 경우 null을 반환합니다.
 *
 * @example
 * ```typescript
 * @Query(() => [Post])
 * async getPosts(
 *   @OptionalCurrentUser() user: User | null
 * ): Promise<Post[]> {
 *   if (user) {
 *     // 로그인한 사용자용 게시물 조회
 *     return this.postsService.getPersonalizedPosts(user.id);
 *   } else {
 *     // 비로그인 사용자용 공개 게시물 조회
 *     return this.postsService.getPublicPosts();
 *   }
 * }
 * ```
 */
export const OptionalCurrentUser = createParamDecorator(
  (data: string | undefined, context: ExecutionContext): User | null => {
    try {
      const ctx = GqlExecutionContext.create(context);
      const request = ctx.getContext().req;

      const user = request.user;
      if (!user) {
        return null;
      }

      // 특정 속성만 반환하는 경우
      if (data && typeof data === 'string') {
        const userProperty = user[data];
        return userProperty || null;
      }

      return user;
    } catch (error) {
      // 에러가 발생한 경우 null 반환 (선택적 인증이므로)
      return null;
    }
  },
);
