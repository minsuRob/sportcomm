import { InputType, Field } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/**
 * @description 기존 댓글 수정을 위한 입력 데이터 DTO입니다.
 * @summary GraphQL의 InputType으로 사용되며, updateComment 뮤테이션의 인자로 사용됩니다.
 * 댓글 수정 시에는 내용(content)만 변경하는 것을 전제로 합니다.
 */
@InputType()
export class UpdateCommentInput {
  /**
   * @description 수정할 댓글의 ID
   * @summary UUID 형식이어야 합니다.
   */
  @Field(() => String, { description: '수정할 댓글의 ID' })
  @IsUUID('4', { message: '유효한 댓글 ID(UUID)가 아닙니다.' })
  @IsNotEmpty({ message: '댓글 ID는 비워둘 수 없습니다.' })
  id: string;

  /**
   * @description 새로 수정될 댓글 내용
   * @summary 최대 1000자까지 입력할 수 있습니다.
   */
  @Field(() => String, { description: '새로운 댓글 내용' })
  @IsString({ message: '댓글 내용은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '댓글 내용은 비워둘 수 없습니다.' })
  @MaxLength(1000, { message: '댓글 내용은 최대 1000자를 넘을 수 없습니다.' })
  content: string;
}
