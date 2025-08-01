import { Resolver, Mutation, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { BookmarkService } from './bookmark.service';
import { Post } from '../../entities/post.entity';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';

/**
 * 북마크 GraphQL 리졸버
 *
 * 북마크 관련 GraphQL 쿼리와 뮤테이션을 처리합니다.
 */
@Resolver()
@UseGuards(GqlAuthGuard)
export class BookmarkResolver {
  constructor(private readonly bookmarkService: BookmarkService) {}

  /**
   * 북마크 토글 뮤테이션
   * 게시물을 북마크에 추가하거나 제거합니다.
   *
   * @param postId 게시물 ID
   * @param currentUser 현재 로그인한 사용자
   * @returns 북마크 추가 시 true, 제거 시 false
   */
  @Mutation(() => Boolean, {
    description: '게시물 북마크 토글 (추가/제거)',
  })
  async toggleBookmark(
    @Args('postId', { type: () => String }) postId: string,
    @CurrentUser() currentUser: User,
  ): Promise<boolean> {
    return await this.bookmarkService.toggleBookmark(currentUser.id, postId);
  }

  /**
   * 사용자의 북마크 목록 조회 쿼리
   *
   * @param userId 사용자 ID (선택적, 없으면 현재 사용자)
   * @param currentUser 현재 로그인한 사용자
   * @returns 북마크된 게시물 목록
   */
  @Query(() => [Post], {
    description: '사용자의 북마크 목록 조회',
  })
  async getUserBookmarks(
    @Args('userId', { type: () => String, nullable: true }) userId?: string,
    @CurrentUser() currentUser?: User,
  ): Promise<Post[]> {
    // userId가 제공되지 않으면 현재 사용자의 북마크를 조회
    const targetUserId = userId || currentUser?.id;

    if (!targetUserId) {
      return [];
    }

    return await this.bookmarkService.getUserBookmarks(targetUserId);
  }

  /**
   * 게시물이 현재 사용자에 의해 북마크되었는지 확인하는 쿼리
   *
   * @param postId 게시물 ID
   * @param currentUser 현재 로그인한 사용자
   * @returns 북마크되어 있으면 true, 아니면 false
   */
  @Query(() => Boolean, {
    description: '게시물이 현재 사용자에 의해 북마크되었는지 확인',
  })
  async isPostBookmarked(
    @Args('postId', { type: () => String }) postId: string,
    @CurrentUser() currentUser: User,
  ): Promise<boolean> {
    return await this.bookmarkService.isBookmarkedByUser(
      currentUser.id,
      postId,
    );
  }

  /**
   * 게시물의 총 북마크 수 조회 쿼리
   *
   * @param postId 게시물 ID
   * @returns 북마크 수
   */
  @Query(() => Number, {
    description: '게시물의 총 북마크 수 조회',
  })
  async getPostBookmarkCount(
    @Args('postId', { type: () => String }) postId: string,
  ): Promise<number> {
    return await this.bookmarkService.getBookmarkCount(postId);
  }

  /**
   * 사용자의 총 북마크 수 조회 쿼리
   *
   * @param userId 사용자 ID (선택적, 없으면 현재 사용자)
   * @param currentUser 현재 로그인한 사용자
   * @returns 북마크 수
   */
  @Query(() => Number, {
    description: '사용자의 총 북마크 수 조회',
  })
  async getUserBookmarkCount(
    @Args('userId', { type: () => String, nullable: true }) userId?: string,
    @CurrentUser() currentUser?: User,
  ): Promise<number> {
    const targetUserId = userId || currentUser?.id;

    if (!targetUserId) {
      return 0;
    }

    return await this.bookmarkService.getUserBookmarkCount(targetUserId);
  }
}
