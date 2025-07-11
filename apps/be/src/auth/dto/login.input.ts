import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

/**
 * @description 로그인 뮤테이션에 사용될 입력 데이터의 형태를 정의하는 DTO입니다.
 * @summary GraphQL의 InputType으로 사용되며, API 스키마에 `LoginInput` 타입으로 정의됩니다.
 */
@InputType()
export class LoginInput {
  /**
   * @description 사용자 이메일 주소
   * @summary 유효한 이메일 형식이어야 합니다.
   * @example "test@example.com"
   */
  @Field(() => String, { description: '사용자 이메일' })
  @IsEmail({}, { message: '유효한 이메일 형식이 아닙니다.' })
  @IsNotEmpty({ message: '이메일은 비워둘 수 없습니다.' })
  email: string;

  /**
   * @description 사용자 비밀번호
   * @summary 최소 8자 이상이어야 합니다.
   * @example "password123"
   */
  @Field(() => String, { description: '사용자 비밀번호' })
  @IsString({ message: '비밀번호는 문자열이어야 합니다.' })
  @MinLength(8, { message: '비밀번호는 최소 8자 이상이어야 합니다.' })
  @IsNotEmpty({ message: '비밀번호는 비워둘 수 없습니다.' })
  password: string;
}
