import { Scalar } from '@nestjs/graphql';
import { GraphQLScalarType, Kind } from 'graphql';
import { Stream } from 'stream';

/**
 * Upload 스칼라 타입 정의
 *
 * graphql-upload v16 버전을 사용한 파일 업로드 스칼라 타입입니다.
 * NestJS GraphQL에서 파일 업로드를 처리하기 위해 사용됩니다.
 */
// FileUpload 인터페이스 정의
export interface FileUpload {
  filename: string;
  mimetype: string;
  encoding: string;
  createReadStream: () => Stream;
}

@Scalar('Upload')
export class UploadScalar extends GraphQLScalarType {
  constructor() {
    super({
      name: 'Upload',
      description: '파일 업로드를 위한 스칼라 타입',
      parseValue: (value) => {
        return value;
      },
      parseLiteral: (ast) => {
        if (ast.kind !== Kind.OBJECT) {
          throw new Error('Upload 스칼라 타입은 리터럴로 파싱할 수 없습니다.');
        }
        return null;
      },
      serialize: () => {
        throw new Error('Upload 스칼라 타입은 직렬화할 수 없습니다.');
      },
    });
  }
}

/**
 * GraphQLUpload - 다른 파일에서 참조할 수 있도록 내보냅니다.
 */
export const GraphQLUpload = 'Upload';
