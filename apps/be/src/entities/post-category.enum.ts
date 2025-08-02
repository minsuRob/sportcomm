import { registerEnumType } from '@nestjs/graphql';

/**
 * 게시물 카테고리 유형 열거형
 * 게시물의 콘텐츠 유형을 분류합니다.
 */
export enum PostCategoryType {
  /** 응원글 */
  CHEERING = 'CHEERING',
  /** 분석글 */
  ANALYSIS = 'ANALYSIS',
  /** 하이라이트 */
  HIGHLIGHT = 'HIGHLIGHT',
}

// GraphQL 스키마에 PostCategoryType enum 등록
registerEnumType(PostCategoryType, {
  name: 'PostCategoryType',
  description: '게시물 카테고리 유형',
  valuesMap: {
    CHEERING: { description: '응원글' },
    ANALYSIS: { description: '분석글' },
    HIGHLIGHT: { description: '하이라이트' },
  },
});
