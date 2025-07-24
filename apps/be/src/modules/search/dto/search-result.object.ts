import { Field, ObjectType, createUnionType } from '@nestjs/graphql';
import { Post } from '../../../entities/post.entity';
import { User } from '../../../entities/user.entity';

/**
 * 검색 결과 항목 유니온 타입
 * 게시물 또는 사용자 엔티티가 될 수 있습니다.
 */
export const SearchResultItem = createUnionType({
  name: 'SearchResultItem',
  types: () => [Post, User],
  resolveType(value) {
    if ('nickname' in value) {
      return User;
    }
    if ('title' in value) {
      return Post;
    }
    return null;
  },
});

/**
 * 검색 메타데이터 객체
 * 검색 결과의 총 개수와 페이지 정보를 포함합니다.
 */
@ObjectType()
export class SearchMetadata {
  /**
   * 총 검색 결과 개수
   */
  @Field(() => Number, { description: '총 검색 결과 개수' })
  totalCount: number;

  /**
   * 현재 페이지 번호
   */
  @Field(() => Number, { description: '현재 페이지 번호' })
  currentPage: number;

  /**
   * 페이지당 항목 수
   */
  @Field(() => Number, { description: '페이지당 항목 수' })
  pageSize: number;

  /**
   * 총 페이지 수
   */
  @Field(() => Number, { description: '총 페이지 수' })
  totalPages: number;

  /**
   * 다음 페이지 존재 여부
   */
  @Field(() => Boolean, { description: '다음 페이지 존재 여부' })
  hasNextPage: boolean;

  /**
   * 이전 페이지 존재 여부
   */
  @Field(() => Boolean, { description: '이전 페이지 존재 여부' })
  hasPreviousPage: boolean;
}

/**
 * 검색 결과 객체
 * 검색 결과 항목 목록과 메타데이터를 포함합니다.
 */
@ObjectType()
export class SearchResult {
  /**
   * 검색 결과 항목 목록
   * 게시물과 사용자의 유니온 타입입니다.
   */
  @Field(() => [SearchResultItem], { description: '검색 결과 항목 목록' })
  items: Array<typeof SearchResultItem>;

  /**
   * 게시물 검색 결과 목록
   * 게시물 검색 결과만 포함합니다.
   */
  @Field(() => [Post], { description: '게시물 검색 결과', nullable: true })
  posts?: Post[];

  /**
   * 사용자 검색 결과 목록
   * 사용자 검색 결과만 포함합니다.
   */
  @Field(() => [User], { description: '사용자 검색 결과', nullable: true })
  users?: User[];

  /**
   * 검색 메타데이터
   * 검색 결과의 페이지 정보를 포함합니다.
   */
  @Field(() => SearchMetadata, { description: '검색 메타데이터' })
  metadata: SearchMetadata;
}
