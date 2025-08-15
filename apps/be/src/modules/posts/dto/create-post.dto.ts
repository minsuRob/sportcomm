/**
 * 게시물 생성 DTO
 *
 * 강력한 유효성 검사와 타입 변환을 포함한 DTO입니다.
 * Mass Assignment 공격을 방지하고 데이터 무결성을 보장합니다.
 */

import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsUUID,
  IsArray,
  IsEnum,
  MaxLength,
  MinLength,
  ArrayMaxSize,
  ArrayMinSize,
  Matches,
  IsIn,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Field, InputType } from '@nestjs/graphql';

/**
 * 게시물 타입 열거형
 */
export enum PostType {
  ANALYSIS = 'ANALYSIS',
  CHEERING = 'CHEERING',
  HIGHLIGHT = 'HIGHLIGHT',
}

@InputType()
export class CreatePostDto {
  /**
   * 게시물 제목 (선택사항)
   */
  @Field({ nullable: true })
  @IsOptional()
  @IsString({ message: '제목은 문자열이어야 합니다.' })
  @MinLength(1, { message: '제목은 최소 1자 이상이어야 합니다.' })
  @MaxLength(200, { message: '제목은 최대 200자까지 입력할 수 있습니다.' })
  @Transform(({ value }) => value?.trim()) // 앞뒤 공백 제거
  title?: string;

  /**
   * 게시물 내용 (필수)
   */
  @Field()
  @IsNotEmpty({ message: '내용을 입력해주세요.' })
  @IsString({ message: '내용은 문자열이어야 합니다.' })
  @MinLength(1, { message: '내용은 최소 1자 이상이어야 합니다.' })
  @MaxLength(5000, { message: '내용은 최대 5000자까지 입력할 수 있습니다.' })
  @Transform(({ value }) => value?.trim()) // 앞뒤 공백 제거
  content: string;

  /**
   * 게시물 타입 (필수)
   */
  @Field()
  @IsNotEmpty({ message: '게시물 타입을 선택해주세요.' })
  @IsEnum(PostType, {
    message:
      '유효하지 않은 게시물 타입입니다. ANALYSIS, CHEERING, HIGHLIGHT 중 하나를 선택해주세요.',
  })
  type: PostType;

  /**
   * 팀 ID (필수)
   */
  @Field()
  @IsNotEmpty({ message: '팀을 선택해주세요.' })
  @IsUUID('4', { message: '유효하지 않은 팀 ID입니다.' })
  teamId: string;

  /**
   * 미디어 파일 ID 목록 (선택사항)
   */
  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray({ message: '미디어 ID는 배열 형태여야 합니다.' })
  @ArrayMinSize(0, { message: '미디어 파일은 최소 0개입니다.' })
  @ArrayMaxSize(10, {
    message: '미디어 파일은 최대 10개까지 첨부할 수 있습니다.',
  })
  @IsUUID('4', {
    each: true,
    message: '유효하지 않은 미디어 ID가 포함되어 있습니다.',
  })
  @Type(() => String)
  mediaIds?: string[];

  /**
   * 태그 목록 (선택사항)
   * 게시물의 주제나 카테고리를 나타내는 태그들입니다.
   */
  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray({ message: '태그는 배열 형태여야 합니다.' })
  @ArrayMaxSize(10, { message: '태그는 최대 10개까지 추가할 수 있습니다.' })
  @IsString({ each: true, message: '태그는 문자열이어야 합니다.' })
  @MinLength(1, {
    each: true,
    message: '태그는 최소 1자 이상이어야 합니다.',
  })
  @MaxLength(50, {
    each: true,
    message: '태그는 최대 50자까지 입력할 수 있습니다.',
  })
  @Matches(/^[가-힣a-zA-Z0-9_\s]+$/, {
    each: true,
    message: '태그는 한글, 영문, 숫자, 언더스코어, 공백만 사용할 수 있습니다.',
  })
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0)
          .slice(0, 10) // 최대 10개로 제한
      : value,
  )
  tags?: string[];

  /**
   * 공개 범위 (선택사항, 기본값: PUBLIC)
   */
  @Field({ nullable: true })
  @IsOptional()
  @IsIn(['PUBLIC', 'TEAM_ONLY', 'FOLLOWERS_ONLY'], {
    message:
      '공개 범위는 PUBLIC, TEAM_ONLY, FOLLOWERS_ONLY 중 하나여야 합니다.',
  })
  visibility?: 'PUBLIC' | 'TEAM_ONLY' | 'FOLLOWERS_ONLY' = 'PUBLIC';

  /**
   * 댓글 허용 여부 (선택사항, 기본값: true)
   */
  @Field({ nullable: true })
  @IsOptional()
  @Type(() => Boolean)
  allowComments?: boolean = true;

  /**
   * 위치 정보 (선택사항)
   */
  @Field({ nullable: true })
  @IsOptional()
  @IsString({ message: '위치 정보는 문자열이어야 합니다.' })
  @MaxLength(100, { message: '위치 정보는 최대 100자까지 입력할 수 있습니다.' })
  @Transform(({ value }) => value?.trim())
  location?: string;
}
