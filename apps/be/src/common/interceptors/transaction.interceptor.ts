/**
 * 트랜잭션 인터셉터
 *
 * @Transactional 데코레이터가 적용된 메서드를 트랜잭션으로 감싸는 인터셉터입니다.
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { DataSource, QueryRunner } from 'typeorm';
import {
  TRANSACTIONAL_KEY,
  TransactionalOptions,
} from '../decorators/transactional.decorator';

@Injectable()
export class TransactionInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TransactionInterceptor.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    // 메서드에서 트랜잭션 메타데이터 확인
    const transactionalOptions = this.reflector.get<TransactionalOptions>(
      TRANSACTIONAL_KEY,
      context.getHandler(),
    );

    // 트랜잭션이 필요하지 않은 경우 그대로 실행
    if (!transactionalOptions) {
      return next.handle();
    }

    // 쿼리 러너 생성
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    // 트랜잭션 시작
    await queryRunner.startTransaction(transactionalOptions.isolationLevel);

    const startTime = Date.now();
    this.logger.debug(
      `트랜잭션 시작: ${context.getClass().name}.${context.getHandler().name}`,
    );

    try {
      // 컨텍스트에 쿼리 러너 추가 (서비스에서 사용할 수 있도록)
      const request = context.switchToHttp().getRequest();
      if (request) {
        request.queryRunner = queryRunner;
      }

      // 메서드 실행
      const result = await next.handle().toPromise();

      // 트랜잭션 커밋
      await queryRunner.commitTransaction();

      const duration = Date.now() - startTime;
      this.logger.debug(
        `트랜잭션 커밋 완료: ${context.getClass().name}.${context.getHandler().name} (${duration}ms)`,
      );

      return result;
    } catch (error) {
      // 트랜잭션 롤백
      await queryRunner.rollbackTransaction();

      const duration = Date.now() - startTime;
      this.logger.error(
        `트랜잭션 롤백: ${context.getClass().name}.${context.getHandler().name} (${duration}ms)`,
        error instanceof Error ? error.stack : String(error),
      );

      throw error;
    } finally {
      // 쿼리 러너 해제
      await queryRunner.release();
    }
  }
}
