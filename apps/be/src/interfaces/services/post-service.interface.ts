/**
 * Post Service 인터페이스
 *
 * 게시물 관련 비즈니스 로직을 정의합니다.
 * 의존성 주입과 테스트 용이성을 위한 인터페이스입니다.
 */

import { Post } from '../../entities/post.entity';

export interface CreatePostDto {
  title?: string;
  content: string;
  type: string;
  teamId: string;
  mediaIds?: string[];
}

export interface UpdatePostDto {
  title?: string;
  content?: string;
  type?: string;
  teamId?: string;
  mediaIds?: string[];
}

export interface PostServiceInterface {
  /**
   * 게시물 생성
   */
  createPost(authorId: string, createPostDto: CreatePostDto): Promise<Post>;

  /**
   * 게시물 조회
   */
  findPostById(postId: string): Promise<Post>;

  /**
   * 게시물 목록 조회
   */
  findPosts(options?: {
    page?: number;
    limit?: number;
    type?: string;
    teamId?: string;
    authorId?: string;
  }): Promise<{
    data: Post[];
    total: number;
    page: number;
    limit: number;
  }>;

  /**
   * 게시물 수정
   */
  updatePost(
    postId: string,
    authorId: string,
    updatePostDto: UpdatePostDto,
  ): Promise<Post>;

  /**
   * 게시물 삭제
   */
  deletePost(postId: string, authorId: string): Promise<boolean>;

  /**
   * 게시물 좋아요
   */
  likePost(postId: string, userId: string): Promise<boolean>;

  /**
   * 게시물 좋아요 취소
   */
  unlikePost(postId: string, userId: string): Promise<boolean>;

  /**
   * 게시물 북마크
   */
  bookmarkPost(postId: string, userId: string): Promise<boolean>;

  /**
   * 게시물 북마크 취소
   */
  unbookmarkPost(postId: string, userId: string): Promise<boolean>;

  /**
   * 게시물 검색
   */
  searchPosts(
    query: string,
    options?: {
      page?: number;
      limit?: number;
      filters?: {
        type?: string;
        teamId?: string;
      };
    },
  ): Promise<{
    data: Post[];
    total: number;
    page: number;
    limit: number;
  }>;

  /**
   * 인기 게시물 조회
   */
  getPopularPosts(options?: {
    limit?: number;
    timeRange?: 'day' | 'week' | 'month' | 'all';
  }): Promise<Post[]>;
}
