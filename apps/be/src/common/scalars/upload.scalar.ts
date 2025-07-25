import { Scalar, CustomScalar } from '@nestjs/graphql';
import { ValueNode } from 'graphql';
import { Stream } from 'stream';

/**
 * Upload 스칼라 타입 정의
 *
 * NestJS GraphQL에서 파일 업로드를 처리하기 위한 커스텀 스칼라 타입입니다.
 * GraphQL multipart request spec을 따라 구현되었습니다.
 */

// FileUpload 인터페이스 정의
export interface FileUpload {
  filename: string;
  mimetype: string;
  encoding: string;
  createReadStream: () => Stream;
}

/**
 * Upload 스칼라 타입 구현
 * GraphQL에서 파일 업로드를 위한 커스텀 스칼라
 */
@Scalar('Upload')
export class UploadScalar implements CustomScalar<any, any> {
  description = '파일 업로드를 위한 스칼라 타입';

  parseValue(value: any): any {
    // 클라이언트에서 전송된 값을 파싱
    return value;
  }

  serialize(value: any): any {
    // 응답으로 직렬화 (파일 업로드는 응답으로 직렬화되지 않음)
    throw new Error('Upload 스칼라 타입은 직렬화할 수 없습니다.');
  }

  parseLiteral(ast: ValueNode): any {
    // GraphQL 쿼리 리터럴에서 파싱 (파일 업로드는 리터럴로 사용되지 않음)
    throw new Error('Upload 스칼라 타입은 리터럴로 파싱할 수 없습니다.');
  }
}

/**
 * GraphQLUpload - 타입 참조용 상수
 * 리졸버에서 @Args 데코레이터의 type 파라미터로 사용됩니다.
 */
export const GraphQLUpload = UploadScalar;
