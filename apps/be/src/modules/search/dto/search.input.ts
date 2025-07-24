import { Field, InputType, Int } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * 검색 유형 열거형
 * 검색 대상에 따른 유형을 정의합니다.
 */
export enum SearchType {
  /** 모든 컨텐츠 검색 */
  ALL = 'ALL',
  /** 게시물만 검색 */
  POSTS = 'POSTS',
  /** 사용자만 검색 */
  USERS = 'USERS',
}

/**
 * 검색 정렬 방식 열거형
 * 검색 결과 정렬 방식을 정의합니다.
 */
export enum SearchSortBy {
  /** 인기순 (좋아요, 댓글, 조회수 가중치) */
  POPULAR = 'POPULAR',
  /** 최신순 */
  RECENT = 'RECENT',
  /** 관련성순 */
  RELEVANCE = 'RELEVANCE',
}

/**
 * 검색 입력 DTO
 *
 * 검색 쿼리와 필터링 옵션을 정의합니다.
 */
@InputType()
export class SearchInput {
  /**
   * 검색 키워드
   */
  @Field(() => String, { description: '검색 키워드' })
  @IsString({ message: '검색어는 문자열이어야 합니다.' })
  query: string;

  /**
   * 검색 유형
   * 기본값: ALL
   */
  @Field(() => String, {
    description: '검색 유형 (ALL, POSTS, USERS)',
    defaultValue: SearchType.ALL
  })
  @IsEnum(SearchType, { message: '올바른 검색 유형을 선택해주세요.' })
  @IsOptional()
  type?: SearchType;

  /**
   * 정렬 방식
   * 기본값: RELEVANCE
   */
  @Field(() => String, {
    description: '정렬 방식 (POPULAR, RECENT, RELEVANCE)',
    defaultValue: SearchSortBy.RELEVANCE
  })
  @IsEnum(SearchSortBy, { message: '올바른 정렬 방식을 선택해주세요.' })
  @IsOptional()
  sortBy?: SearchSortBy;

  /**
   * 페이지 번호
   * 기본값: 0
   */
  @Field(() => Int, { description: '페이지 번호 (0부터 시작)', defaultValue: 0 })
  @Min(0, { message: '페이지 번호는 0 이상이어야 합니다.' })
  @IsOptional()
  page?: number;

  /**
   * 페이지당 항목 수
   * 기본값: 10, 최대: 50
   */
  @Field(() => Int, { description: '페이지당 항목 수', defaultValue: 10 })
  @Min(1, { message: '페이지 크기는 1 이상이어야 합니다.' })
  @Max(50, { message: '페이지 크기는 최대 50까지 가능합니다.' })
  @IsOptional()
  pageSize?: number;
}
