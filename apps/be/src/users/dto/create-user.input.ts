import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

/**
 * @description 사용자 회원가입(signup) 뮤테이션에 사용될 입력 데이터의 형태를 정의하는 DTO입니다.
 * @summary GraphQL의 InputType으로 사용되며, API 스키마에 `CreateUserInput` 타입으로 정의됩니다.
 * class-validator 데코레이터를 통해 각 필드의 유효성을 검사합니다.
 */
@InputType()
export class CreateUserInput {
  /**
   * @description 사용자 닉네임
   * @summary 2자 이상, 20자 이하의 문자열이어야 합니다.
   * @example "스포츠팬123"
   */
  @Field(() => String, { description: '사용자 닉네임' })
  @IsString({ message: '닉네임은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '닉네임은 비워둘 수 없습니다.' })
  @MinLength(2, { message: '닉네임은 최소 2자 이상이어야 합니다.' })
  @MaxLength(20, { message: '닉네임은 최대 20자를 넘을 수 없습니다.' })
  nickname: string;

  /**
   * @description 사용자 이메일 주소. 로그인 시 ID로 사용됩니다.
   * @summary 유효한 이메일 형식이어야 하며, 시스템 내에서 고유해야 합니다.
   * @example "user@example.com"
   */
  @Field(() => String, { description: '사용자 이메일' })
  @IsEmail({}, { message: '유효한 이메일 형식이 아닙니다.' })
  @IsNotEmpty({ message: '이메일은 비워둘 수 없습니다.' })
  email: string;

  /**
   * @description 사용자 비밀번호.
   * @summary 최소 8자 이상의 문자열이어야 합니다.
   * @example "password123!"
   */
  @Field(() => String, { description: '사용자 비밀번호' })
  @IsString({ message: '비밀번호는 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '비밀번호는 비워둘 수 없습니다.' })
  @MinLength(8, { message: '비밀번호는 최소 8자 이상이어야 합니다.' })
  password: string;
}
