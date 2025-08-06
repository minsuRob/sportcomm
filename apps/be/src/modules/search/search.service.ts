import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from '../../entities/post.entity';
import { User } from '../../entities/user.entity';
import { PostLike } from '../../entities/post-like.entity';
import { SearchInput, SearchSortBy, SearchType } from './dto/search.input';
import { SearchMetadata, SearchResult } from './dto/search-result.object';

/**
 * 검색 서비스
 *
 * 게시물 및 사용자를 검색하는 기능을 제공합니다.
 * 인기순, 최신순, 관련성순으로 정렬할 수 있으며
 * 게시물 내용, 제목 및 사용자 닉네임, 소개에서 검색합니다.
 */
@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(PostLike)
    private readonly postLikeRepository: Repository<PostLike>,
  ) {}

  /**
   * 검색 실행
   * 입력받은 검색어와 옵션에 따라 검색을 수행합니다.
   *
   * @param input 검색 입력 (검색어, 유형, 정렬방식 등)
   * @param currentUserId 현재 사용자 ID (좋아요 상태 확인용)
   * @returns 검색 결과
   */
  async search(
    input: SearchInput,
    currentUserId?: string,
  ): Promise<SearchResult> {
    this.logger.log(`검색 시작: ${JSON.stringify(input)}`);

    const {
      query,
      type = SearchType.ALL,
      sortBy = SearchSortBy.RELEVANCE,
    } = input;
    const page = input.page || 0;
    const pageSize = input.pageSize || 10;

    // 검색 쿼리 준비
    const searchQuery = `%${query}%`;

    // 결과 객체 초기화
    const result: SearchResult = {
      items: [],
      metadata: {
        totalCount: 0,
        currentPage: page,
        pageSize: pageSize,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: page > 0,
      },
      posts: [],
      users: [],
    };

    // 검색 실행 - 게시물
    if (type === SearchType.ALL || type === SearchType.POSTS) {
      const [posts, postsCount] = await this.searchPosts(
        searchQuery,
        sortBy,
        page,
        pageSize,
      );

      // 각 게시물에 대해 isLiked 상태 설정
      if (currentUserId) {
        for (const post of posts) {
          post.isLiked = await this.isPostLikedByUser(post.id, currentUserId);
        }
      } else {
        // 로그인하지 않은 경우 모든 게시물의 isLiked를 false로 설정
        for (const post of posts) {
          post.isLiked = false;
        }
      }

      result.posts = posts;
      result.items.push(...posts);
      result.metadata.totalCount += postsCount;
    }

    // 검색 실행 - 사용자
    if (type === SearchType.ALL || type === SearchType.USERS) {
      const [users, usersCount] = await this.searchUsers(
        searchQuery,
        sortBy,
        page,
        pageSize,
      );
      result.users = users;
      result.items.push(...users);
      result.metadata.totalCount += usersCount;
    }

    // 메타데이터 계산
    result.metadata.totalPages = Math.ceil(
      result.metadata.totalCount / pageSize,
    );
    result.metadata.hasNextPage = page < result.metadata.totalPages - 1;

    // 통합 정렬 (인기순/최신순)
    if (type === SearchType.ALL) {
      this.sortCombinedResults(result.items, sortBy);
    }

    this.logger.log(`검색 완료: ${result.metadata.totalCount}개 결과 반환`);
    return result;
  }

  /**
   * 사용자가 특정 게시물에 좋아요를 눌렀는지 확인
   *
   * @param postId 게시물 ID
   * @param userId 사용자 ID
   * @returns 좋아요를 눌렀으면 true, 아니면 false
   */
  private async isPostLikedByUser(
    postId: string,
    userId: string,
  ): Promise<boolean> {
    const like = await this.postLikeRepository.findOne({
      where: {
        post: { id: postId },
        user: { id: userId },
      },
    });
    return !!like;
  }

  /**
   * 게시물 검색
   * 제목과 내용에서 검색어를 찾습니다.
   *
   * @param searchQuery 검색 쿼리
   * @param sortBy 정렬 방식
   * @param page 페이지 번호
   * @param pageSize 페이지 크기
   * @returns 검색된 게시물과 총 개수
   */
  private async searchPosts(
    searchQuery: string,
    sortBy: SearchSortBy,
    page: number,
    pageSize: number,
  ): Promise<[Post[], number]> {
    const queryBuilder = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .where('post.title ILIKE :query', { query: searchQuery })
      .orWhere('post.content ILIKE :query', { query: searchQuery })
      .andWhere('post.isPublic = :isPublic', { isPublic: true });

    // 정렬 방식 적용
    switch (sortBy) {
      case SearchSortBy.POPULAR:
        // 인기순: 좋아요, 댓글, 조회수를 가중치로 계산
        queryBuilder
          .addSelect(
            `(post.likeCount * 3 + post.commentCount * 2 + post.viewCount * 0.5)`,
            'popularity_score',
          )
          .orderBy('popularity_score', 'DESC');
        break;
      case SearchSortBy.RECENT:
        // 최신순
        queryBuilder.orderBy('post.createdAt', 'DESC');
        break;
      case SearchSortBy.RELEVANCE:
      default:
        // 관련성순: PostgreSQL의 ts_rank 사용 (Full-Text Search)
        // 참고: 실제 구현에서는 tsvector와 tsquery를 사용해야 함
        queryBuilder
          .addSelect(
            `CASE
              WHEN post.title ILIKE :exactQuery THEN 3
              WHEN post.title ILIKE :startQuery THEN 2
              WHEN post.title ILIKE :query THEN 1
              ELSE 0.5
            END`,
            'relevance_score',
          )
          .setParameter('exactQuery', searchQuery.replace(/%/g, ''))
          .setParameter('startQuery', searchQuery.replace(/^%/, ''))
          .orderBy('relevance_score', 'DESC')
          .addOrderBy('post.createdAt', 'DESC');
    }

    // 페이징 처리
    queryBuilder.skip(page * pageSize).take(pageSize);

    return await queryBuilder.getManyAndCount();
  }

  /**
   * 사용자 검색
   * 닉네임과 자기소개에서 검색어를 찾습니다.
   *
   * @param searchQuery 검색 쿼리
   * @param sortBy 정렬 방식
   * @param page 페이지 번호
   * @param pageSize 페이지 크기
   * @returns 검색된 사용자와 총 개수
   */
  private async searchUsers(
    searchQuery: string,
    sortBy: SearchSortBy,
    page: number,
    pageSize: number,
  ): Promise<[User[], number]> {
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .where('user.nickname ILIKE :query', { query: searchQuery })
      .orWhere('user.bio ILIKE :query', { query: searchQuery })
      .andWhere('user.isActive = :isActive', { isActive: true });

    // 정렬 방식 적용
    switch (sortBy) {
      case SearchSortBy.RECENT:
        // 최근 가입 순
        queryBuilder.orderBy('user.createdAt', 'DESC');
        break;
      case SearchSortBy.POPULAR:
        // 인기순: 팔로워 수로 정렬
        queryBuilder
          .leftJoin('user.followers', 'followers')
          .addSelect('COUNT(followers.id)', 'follower_count')
          .groupBy('user.id')
          .orderBy('follower_count', 'DESC');
        break;
      case SearchSortBy.RELEVANCE:
      default:
        // 관련성순: 닉네임 일치도로 정렬
        queryBuilder
          .addSelect(
            `CASE
              WHEN user.nickname ILIKE :exactQuery THEN 3
              WHEN user.nickname ILIKE :startQuery THEN 2
              WHEN user.nickname ILIKE :query THEN 1
              ELSE 0.5
            END`,
            'relevance_score',
          )
          .setParameter('exactQuery', searchQuery.replace(/%/g, ''))
          .setParameter('startQuery', searchQuery.replace(/^%/, ''))
          .orderBy('relevance_score', 'DESC');
    }

    // 페이징 처리
    queryBuilder.skip(page * pageSize).take(pageSize);

    return await queryBuilder.getManyAndCount();
  }

  /**
   * 통합 검색 결과 정렬
   * 게시물과 사용자가 혼합된 결과를 정렬합니다.
   *
   * @param items 정렬할 아이템 배열
   * @param sortBy 정렬 방식
   */
  private sortCombinedResults(items: any[], sortBy: SearchSortBy): void {
    switch (sortBy) {
      case SearchSortBy.POPULAR:
        // 인기순 정렬
        items.sort((a, b) => {
          const scoreA = this.calculatePopularityScore(a);
          const scoreB = this.calculatePopularityScore(b);
          return scoreB - scoreA;
        });
        break;
      case SearchSortBy.RECENT:
        // 최신순 정렬
        items.sort((a, b) => {
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
        break;
      // RELEVANCE는 이미 개별 쿼리에서 적용되었으므로 추가 정렬 필요 없음
    }
  }

  /**
   * 인기도 점수 계산
   * 게시물과 사용자의 인기도를 계산합니다.
   *
   * @param item 게시물 또는 사용자 객체
   * @returns 계산된 인기도 점수
   */
  private calculatePopularityScore(item: Post | User): number {
    if ('title' in item) {
      // 게시물 인기도: 좋아요 * 3 + 댓글 * 2 + 조회수 * 0.5
      return (
        (item.likeCount || 0) * 3 +
        (item.commentCount || 0) * 2 +
        (item.viewCount || 0) * 0.5
      );
    } else if ('nickname' in item) {
      // 사용자 인기도: 팔로워 수
      return (item.followers?.length || 0) * 2;
    }
    return 0;
  }
}
