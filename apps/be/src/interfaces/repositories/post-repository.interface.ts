/**
 * Post Repository 인터페이스
 *
 * 게시물 관련 특화된 Repository 작업을 정의합니다.
 */

import { BaseRepositoryInterface } from './base-repository.interface';
import { Post } from '../../entities/post.entity';

export interface PostRepositoryInterface extends BaseRepositoryInterface<Post> {
  /**
   * 사용자별 게시물 조회
   */
  findByAuthor(
    authorId: string,
    options?: {
      page?: number;
      limit?: number;
    },
  ): Promise<{
    data: Post[];
    total: number;
    page: number;
    limit: number;
  }>;

  /**
   * 팀별 게시물 조회
   */
  findByTeam(
    teamId: string,
    options?: {
      page?: number;
      limit?: number;
    },
  ): Promise<{
    data: Post[];
    total: number;
    page: number;
    limit: number;
  }>;

  /**
   * 게시물 타입별 조회
   */
  findByType(
    type: string,
    options?: {
      page?: number;
      limit?: number;
    },
  ): Promise<{
    data: Post[];
    total: number;
    page: number;
    limit: number;
  }>;

  /**
   * 인기 게시물 조회 (좋아요 수 기준)
   */
  findPopular(options?: {
    limit?: number;
    timeRange?: 'day' | 'week' | 'month' | 'all';
  }): Promise<Post[]>;

  /**
   * 검색 기능
   */
  search(
    query: string,
    options?: {
      page?: number;
      limit?: number;
      filters?: {
        type?: string;
        teamId?: string;
        authorId?: string;
      };
    },
  ): Promise<{
    data: Post[];
    total: number;
    page: number;
    limit: number;
  }>;

  /**
   * 게시물 좋아요 수 업데이트
   */
  updateLikeCount(postId: string, increment: number): Promise<void>;

  /**
   * 게시물 댓글 수 업데이트
   */
  updateCommentCount(postId: string, increment: number): Promise<void>;

  /**
   * 게시물 조회수 증가
   */
  incrementViewCount(postId: string): Promise<void>;
}
