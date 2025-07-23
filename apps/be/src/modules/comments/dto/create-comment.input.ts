import { InputType, Field } from '@nestjs/graphql';
import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * 댓글 생성 입력 DTO
 *
 * 댓글 생성에 필요한 정보를 담습니다.
 * 게시물 ID, 댓글 내용, 부모 댓글 ID(대댓글인 경우) 정보가 포함됩니다.
 */
@InputType()
export class CreateCommentInput {
  /**
   * 댓글을 작성할 게시물의 ID
   */
  @Field(() => String, { description: '게시물 ID' })
  @IsUUID('4', { message: '올바른 게시물 ID 형식이 아닙니다.' })
  postId: string;

  /**
   * 댓글 내용
   */
  @Field(() => String, { description: '댓글 내용' })
  @IsString({ message: '댓글 내용은 문자열이어야 합니다.' })
  @MinLength(1, { message: '댓글 내용은 최소 1자 이상이어야 합니다.' })
  @MaxLength(1000, { message: '댓글 내용은 최대 1,000자까지 가능합니다.' })
  content: string;

  /**
   * 부모 댓글 ID (대댓글인 경우)
   * 최상위 댓글인 경우 null
   */
  @Field(() => String, {
    description: '부모 댓글 ID (대댓글인 경우)',
    nullable: true,
  })
  @IsOptional()
  @IsUUID('4', { message: '올바른 댓글 ID 형식이 아닙니다.' })
  parentCommentId?: string;
}
