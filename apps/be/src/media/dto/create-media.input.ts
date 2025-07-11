import { InputType, Field } from '@nestjs/graphql';
import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';
import { MediaType } from '../media.entity';

/**
 * @description 새로운 미디어 레코드 생성을 위한 입력 데이터 DTO입니다.
 * @summary GraphQL의 InputType으로 사용되며, createMedia 뮤테이션의 인자로 사용됩니다.
 * 클라이언트는 이 뮤테이션을 호출하여 파일 업로드 전에 DB에 미디어 레코드를 생성합니다.
 */
@InputType()
export class CreateMediaInput {
  /**
   * @description 미디어를 첨부할 게시물의 ID
   * @summary UUID 형식이어야 합니다.
   */
  @Field(() => String, { description: '미디어를 첨부할 게시물의 ID' })
  @IsUUID('4', { message: '유효한 게시물 ID(UUID)가 아닙니다.' })
  @IsNotEmpty({ message: '게시물 ID는 비워둘 수 없습니다.' })
  postId: string;

  /**
   * @description 업로드할 미디어의 타입
   * @summary 'IMAGE' 또는 'VIDEO' 값 중 하나여야 합니다.
   */
  @Field(() => MediaType, { description: '미디어 타입 (IMAGE 또는 VIDEO)' })
  @IsEnum(MediaType, { message: '유효한 미디어 타입이 아닙니다.' })
  @IsNotEmpty({ message: '미디어 타입은 비워둘 수 없습니다.' })
  type: MediaType;
}
