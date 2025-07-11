import { InputType, Field } from '@nestjs/graphql';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { PostType } from '../post.entity';

/**
 * @description 새로운 게시물 생성을 위한 입력 데이터 DTO입니다.
 * @summary GraphQL의 InputType으로 사용되며, createPost 뮤테이션의 인자로 사용됩니다.
 */
@InputType()
export class CreatePostInput {
  /**
   * @description 게시물 내용
   * @summary 최대 20000자까지 입력할 수 있습니다.
   */
  @Field(() => String, { description: '게시물 내용' })
  @IsString({ message: '내용은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '내용은 비워둘 수 없습니다.' })
  @MaxLength(20000, {
    message: '내용은 최대 20000자를 넘을 수 없습니다.',
  })
  content: string;

  /**
   * @description 게시물 타입
   * @summary 'ANALYSIS'(분석), 'CHEERING'(응원), 'HIGHLIGHT'(하이라이트) 중 하나여야 합니다.
   */
  @Field(() => PostType, { description: '게시물 타입' })
  @IsEnum(PostType, { message: '유효한 게시물 타입이 아닙니다.' })
  type: PostType;
}
