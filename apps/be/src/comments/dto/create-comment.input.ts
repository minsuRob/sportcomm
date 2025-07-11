import { InputType, Field } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/**
 * @description 새로운 댓글 생성을 위한 입력 데이터 DTO입니다.
 * @summary GraphQL의 InputType으로 사용되며, createComment 뮤테이션의 인자로 사용됩니다.
 */
@InputType()
export class CreateCommentInput {
  /**
   * @description 댓글이 달릴 게시물의 ID
   * @summary UUID 형식이어야 합니다.
   */
  @Field(() => String, { description: '댓글을 작성할 게시물의 ID' })
  @IsUUID('4', { message: '유효한 게시물 ID(UUID)가 아닙니다.' })
  @IsNotEmpty({ message: '게시물 ID는 비워둘 수 없습니다.' })
  postId: string;

  /**
   * @description 댓글 내용
   * @summary 최대 1000자까지 입력할 수 있습니다.
   */
  @Field(() => String, { description: '댓글 내용' })
  @IsString({ message: '댓글 내용은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '댓글 내용은 비워둘 수 없습니다.' })
  @MaxLength(1000, { message: '댓글 내용은 최대 1000자를 넘을 수 없습니다.' })
  content: string;

  /**
   * @description 부모 댓글의 ID (대댓글인 경우)
   * @summary 이 필드가 제공되면 해당 댓글은 대댓글로 처리됩니다. UUID 형식이어야 합니다.
   */
  @Field(() => String, {
    nullable: true,
    description: '부모 댓글의 ID (대댓글인 경우)',
  })
  @IsOptional()
  @IsUUID('4', { message: '유효한 부모 댓글 ID(UUID)가 아닙니다.' })
  parentCommentId?: string;
}
