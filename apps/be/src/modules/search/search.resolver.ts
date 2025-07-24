import { Args, Query, Resolver } from '@nestjs/graphql';
import { SearchService } from './search.service';
import { SearchResult } from './dto/search-result.object';
import { SearchInput } from './dto/search.input.ts';

/**
 * 검색 리졸버
 *
 * GraphQL API를 통해 검색 기능을 제공합니다.
 * 게시물과 사용자를 검색하고, 인기순/최신순/관련성순으로 정렬할 수 있습니다.
 */
@Resolver()
export class SearchResolver {
  constructor(private readonly searchService: SearchService) {}

  /**
   * 검색 쿼리
   * 키워드, 유형, 정렬 방식에 따라 검색을 수행합니다.
   *
   * @param input 검색 입력 (검색어, 유형, 정렬 방식 등)
   * @returns 검색 결과
   */
  @Query(() => SearchResult, {
    description: '검색 기능. 키워드로 게시물과 사용자를 검색합니다.',
  })
  async search(
    @Args('input') input: SearchInput,
  ): Promise<SearchResult> {
    return this.searchService.search(input);
  }

  /**
   * 인기 검색어 쿼리
   * 현재 인기있는 검색어를 반환합니다.
   *
   * @param limit 반환할 검색어 수
   * @returns 인기 검색어 배열
   */
  @Query(() => [String], {
    description: '인기 검색어를 반환합니다.',
  })
  async popularSearchTerms(
    @Args('limit', { type: () => Number, defaultValue: 10 }) limit: number,
  ): Promise<string[]> {
    // TODO: 인기 검색어 로직 구현
    // 현재는 예시 데이터 반환
    return [
      '챔피언스리그',
      '손흥민',
      'EPL',
      '월드컵',
      '류현진',
      'NBA',
      '메이저리그',
      '축구',
      '야구',
      'KBO',
    ].slice(0, limit);
  }
}
