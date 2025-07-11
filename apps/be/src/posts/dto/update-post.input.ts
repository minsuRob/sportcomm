import { CreatePostInput } from './create-post.input';
import { InputType, Field, ID, PartialType } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/**
 * @description 기존 게시물 수정을 위한 입력 데이터 DTO입니다.
 * @summary `PartialType`을 사용하여 `CreatePostInput`의 모든 필드(content, type)를
 * 선택적으로(optional) 만듭니다. 수정할 게시물을 식별하기 위한 `id`는 필수로 유지합니다.
 */
@InputType()
export class UpdatePostInput extends PartialType(CreatePostInput) {
  /**
   * @description 수정할 게시물의 ID
   * @summary UUID 형식이어야 하며, 반드시 제공되어야 합니다.
   */
  @Field(() => ID, { description: '수정할 게시물의 ID' })
  @IsNotEmpty({ message: '게시물 ID는 비워둘 수 없습니다.' })
  @IsUUID('4', { message: '유효한 게시물 ID(UUID)가 아닙니다.' })
  id: string;

  /**
   * @description 게시물 수정 사유
   * @summary 선택적으로 제공할 수 있으며, 최대 255자까지 입력할 수 있습니다.
   */
  @Field(() => String, { nullable: true, description: '게시물 수정 사유' })
  @IsOptional()
  @IsString({ message: '수정 사유는 문자열이어야 합니다.' })
  @MaxLength(255, {
    message: '수정 사유는 최대 255자를 넘을 수 없습니다.',
  })
  editReason?: string;
}
