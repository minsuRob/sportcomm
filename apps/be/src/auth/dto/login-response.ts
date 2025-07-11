import { Field, ObjectType } from '@nestjs/graphql';

/**
 * @description 로그인 성공 시 반환되는 데이터의 형태를 정의하는 DTO입니다.
 * @summary GraphQL의 ObjectType으로 사용되며, API 스키마에 `LoginResponse` 타입으로 정의됩니다.
 */
@ObjectType()
export class LoginResponse {
  /**
   * @description JWT 액세스 토큰
   * @summary 사용자가 인증된 요청을 보낼 때 사용하는 토큰입니다.
   */
  @Field(() => String, { description: 'JWT 액세스 토큰' })
  access_token: string;
}
