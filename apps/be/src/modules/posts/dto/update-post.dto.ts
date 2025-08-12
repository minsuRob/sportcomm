/**
 * 게시물 수정 DTO
 *
 * 부분 업데이트를 위한 DTO입니다.
 * 모든 필드가 선택사항이며, 제공된 필드만 업데이트됩니다.
 */

import {
  IsString,
  IsOptional,
  IsUUID,
  IsArray,
  IsEnum,
  MaxLength,
  MinLength,
  ArrayMaxSize,
  ArrayMinSize,
  Matches,
  IsIn,
  ValidateIf,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Field, InputType } from '@nestjs/graphql';
import { PostType } from './create-post.dto';

@InputType()
export class UpdatePostDto {
  /**
   * 게시물 제목 (선택사항)
   */
  @Field({ nullable: true })
  @IsOptional()
  @ValidateIf((o, value) => value !== undefined) // undefined가 아닐 때만 검증
  @IsString({ message: '제목은 문자열이어야 합니다.' })
  @MinLength(1, { message: '제목은 최소 1자 이상이어야 합니다.' })
  @MaxLength(200, { message: '제목은 최대 200자까지 입력할 수 있습니다.' })
  @Transform(({ value }) => (value === null ? null : value?.trim())) // null 허용
  title?: string | null;

  /**
   * 게시물 내용 (선택사항)
   */
  @Field({ nullable: true })
  @IsOptional()
  @ValidateIf((o, value) => value !== undefined)
  @IsString({ message: '내용은 문자열이어야 합니다.' })
  @MinLength(1, { message: '내용은 최소 1자 이상이어야 합니다.' })
  @MaxLength(5000, { message: '내용은 최대 5000자까지 입력할 수 있습니다.' })
  @Transform(({ value }) => value?.trim())
  content?: string;

  /**
   * 게시물 타입 (선택사항)
   */
  @Field({ nullable: true })
  @IsOptional()
  @ValidateIf((o, value) => value !== undefined)
  @IsEnum(PostType, {
    message:
      '유효하지 않은 게시물 타입입니다. ANALYSIS, CHEERING, HIGHLIGHT 중 하나를 선택해주세요.',
  })
  type?: PostType;

  /**
   * 팀 ID (선택사항)
   */
  @Field({ nullable: true })
  @IsOptional()
  @ValidateIf((o, value) => value !== undefined)
  @IsUUID('4', { message: '유효하지 않은 팀 ID입니다.' })
  teamId?: string;

  /**
   * 미디어 파일 ID 목록 (선택사항)
   * null을 전달하면 모든 미디어 제거, 빈 배열을 전달하면 모든 미디어 제거
   * 배열을 전달하면 해당 미디어로 교체
   */
  @Field(() => [String], { nullable: true })
  @IsOptional()
  @ValidateIf((o, value) => value !== undefined && value !== null)
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
  mediaIds?: string[] | null;

  /**
   * 해시태그 목록 (선택사항)
   */
  @Field(() => [String], { nullable: true })
  @IsOptional()
  @ValidateIf((o, value) => value !== undefined && value !== null)
  @IsArray({ message: '해시태그는 배열 형태여야 합니다.' })
  @ArrayMaxSize(10, { message: '해시태그는 최대 10개까지 추가할 수 있습니다.' })
  @IsString({ each: true, message: '해시태그는 문자열이어야 합니다.' })
  @MaxLength(50, {
    each: true,
    message: '해시태그는 최대 50자까지 입력할 수 있습니다.',
  })
  @Matches(/^[가-힣a-zA-Z0-9_]+$/, {
    each: true,
    message: '해시태그는 한글, 영문, 숫자, 언더스코어만 사용할 수 있습니다.',
  })
  @Transform(({ value }) =>
    value === null
      ? null
      : Array.isArray(value)
        ? value
            .map((tag) => tag.trim().toLowerCase())
            .filter((tag) => tag.length > 0)
        : value,
  )
  hashtags?: string[] | null;

  /**
   * 공개 범위 (선택사항)
   */
  @Field({ nullable: true })
  @IsOptional()
  @ValidateIf((o, value) => value !== undefined)
  @IsIn(['PUBLIC', 'TEAM_ONLY', 'FOLLOWERS_ONLY'], {
    message:
      '공개 범위는 PUBLIC, TEAM_ONLY, FOLLOWERS_ONLY 중 하나여야 합니다.',
  })
  visibility?: 'PUBLIC' | 'TEAM_ONLY' | 'FOLLOWERS_ONLY';

  /**
   * 댓글 허용 여부 (선택사항)
   */
  @Field({ nullable: true })
  @IsOptional()
  @ValidateIf((o, value) => value !== undefined)
  @Type(() => Boolean)
  allowComments?: boolean;

  /**
   * 위치 정보 (선택사항)
   */
  @Field({ nullable: true })
  @IsOptional()
  @ValidateIf((o, value) => value !== undefined)
  @IsString({ message: '위치 정보는 문자열이어야 합니다.' })
  @MaxLength(100, { message: '위치 정보는 최대 100자까지 입력할 수 있습니다.' })
  @Transform(({ value }) => (value === null ? null : value?.trim()))
  location?: string | null;
}
