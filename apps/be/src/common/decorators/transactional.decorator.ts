/**
 * 트랜잭션 데코레이터
 *
 * 메서드 실행을 트랜잭션으로 감싸는 데코레이터입니다.
 * 데이터 무결성을 보장하고 실패 시 자동 롤백을 수행합니다.
 */

import { SetMetadata } from '@nestjs/common';

export const TRANSACTIONAL_KEY = 'transactional';

/**
 * 트랜잭션 옵션
 */
export interface TransactionalOptions {
  /**
   * 트랜잭션 격리 수준
   */
  isolationLevel?:
    | 'READ UNCOMMITTED'
    | 'READ COMMITTED'
    | 'REPEATABLE READ'
    | 'SERIALIZABLE';

  /**
   * 읽기 전용 트랜잭션 여부
   */
  readOnly?: boolean;

  /**
   * 트랜잭션 타임아웃 (밀리초)
   */
  timeout?: number;

  /**
   * 트랜잭션 전파 방식
   */
  propagation?:
    | 'REQUIRED'
    | 'REQUIRES_NEW'
    | 'SUPPORTS'
    | 'NOT_SUPPORTED'
    | 'NEVER'
    | 'MANDATORY';
}

/**
 * 트랜잭션 데코레이터
 *
 * @param options 트랜잭션 옵션
 * @returns 메서드 데코레이터
 *
 * @example
 * ```typescript
 * @Transactional()
 * async createPost(data: CreatePostDto): Promise<Post> {
 *   // 이 메서드는 트랜잭션 내에서 실행됩니다
 *   // 오류 발생 시 자동으로 롤백됩니다
 * }
 *
 * @Transactional({ isolationLevel: 'SERIALIZABLE', readOnly: true })
 * async getPostStats(): Promise<PostStats> {
 *   // 읽기 전용 트랜잭션으로 실행됩니다
 * }
 * ```
 */
export const Transactional = (
  options: TransactionalOptions = {},
): MethodDecorator => {
  return SetMetadata(TRANSACTIONAL_KEY, {
    isolationLevel: options.isolationLevel || 'READ COMMITTED',
    readOnly: options.readOnly || false,
    timeout: options.timeout || 30000, // 30초 기본 타임아웃
    propagation: options.propagation || 'REQUIRED',
  });
};
