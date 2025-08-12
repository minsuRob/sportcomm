/**
 * 게시물 목록 조회 Query Handler
 *
 * CQRS 패턴에서 읽기 작업을 최적화하여 처리하는 핸들러입니다.
 */

import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { GetPostsQuery } from '../get-posts.query';
import { Post } from '../../../entities/post.entity';

export interface GetPostsResult {
  data: Post[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

@Injectable()
@QueryHandler(GetPostsQuery)
export class GetPostsHandler implements IQueryHandler<GetPostsQuery> {
  private readonly logger = new Logger(GetPostsHandler.name);

  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
  ) {}

  async execute(query: GetPostsQuery): Promise<GetPostsResult> {
    const {
      page,
      limit,
      type,
      teamId,
      authorId,
      sortBy,
      sortOrder,
      includeMedia,
      includeAuthor,
    } = query;

    this.logger.debug(`게시물 목록 조회: page=${page}, limit=${limit}`);

    // 쿼리 빌더 생성
    const queryBuilder = this.createQueryBuilder(query);

    // 총 개수 조회 (성능 최적화를 위해 별도 쿼리)
    const total = await this.getTotalCount(queryBuilder);

    // 페이지네이션 적용
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    // 정렬 적용
    queryBuilder.orderBy(`post.${sortBy}`, sortOrder);

    // 관계 데이터 로딩
    if (includeAuthor) {
      queryBuilder.leftJoinAndSelect('post.author', 'author');
    }

    if (includeMedia) {
      queryBuilder.leftJoinAndSelect('post.media', 'media');
    }

    // 쿼리 실행
    const posts = await queryBuilder.getMany();

    // 결과 계산
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    this.logger.debug(
      `게시물 목록 조회 완료: ${posts.length}개 조회, 총 ${total}개`,
    );

    return {
      data: posts,
      total,
      page,
      limit,
      totalPages,
      hasNext,
      hasPrev,
    };
  }

  /**
   * 쿼리 빌더 생성 및 필터 적용
   */
  private createQueryBuilder(query: GetPostsQuery): SelectQueryBuilder<Post> {
    const { type, teamId, authorId } = query;

    let queryBuilder = this.postRepository
      .createQueryBuilder('post')
      .where('post.deletedAt IS NULL'); // 소프트 삭제된 게시물 제외

    // 타입 필터
    if (type) {
      queryBuilder = queryBuilder.andWhere('post.type = :type', { type });
    }

    // 팀 필터
    if (teamId) {
      queryBuilder = queryBuilder.andWhere('post.teamId = :teamId', { teamId });
    }

    // 작성자 필터
    if (authorId) {
      queryBuilder = queryBuilder.andWhere('post.authorId = :authorId', {
        authorId,
      });
    }

    return queryBuilder;
  }

  /**
   * 총 개수 조회 (성능 최적화)
   */
  private async getTotalCount(
    queryBuilder: SelectQueryBuilder<Post>,
  ): Promise<number> {
    // 관계 조인 없이 개수만 조회하여 성능 최적화
    const countQueryBuilder = queryBuilder.clone();

    // SELECT와 ORDER BY 절 제거
    countQueryBuilder.select('COUNT(post.id)', 'count');
    countQueryBuilder.orderBy(); // ORDER BY 제거

    const result = await countQueryBuilder.getRawOne();
    return parseInt(result.count, 10);
  }
}
