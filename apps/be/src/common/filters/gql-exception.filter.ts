import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExceptionFilter, GqlContextType } from '@nestjs/graphql';

/**
 * GraphQL 전용 예외 필터
 * GraphQL 요청 처리 중 발생하는 모든 예외를 처리하는 필터입니다.
 */
@Catch()
export class GraphQLExceptionFilter implements GqlExceptionFilter {
  private readonly logger = new Logger(GraphQLExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): any {
    // GraphQL 컨텍스트가 아닌 경우는 처리하지 않음
    if (String(host.getType()) !== 'graphql') {
      return exception;
    }

    // 기본 응답 객체
    const response: any = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
    };

    // 예외 타입에 따른 응답 처리
    if (exception instanceof HttpException) {
      // NestJS HTTP 예외 처리
      const nestResponse = exception.getResponse();
      response.statusCode = exception.getStatus();

      // 에러 메시지 추출
      if (
        typeof nestResponse === 'object' &&
        nestResponse !== null &&
        'message' in nestResponse
      ) {
        response.message = Array.isArray(nestResponse['message'])
          ? nestResponse['message'][0]
          : nestResponse['message'];
      } else {
        response.message = exception.message;
      }

      // 개발 환경에서만 세부 정보 추가
      if (process.env.NODE_ENV === 'development') {
        response.details = nestResponse;
      }
    } else if (exception instanceof Error) {
      // 일반 JavaScript Error 객체 처리
      response.message = exception.message;

      // 개발 환경에서만 스택 트레이스 포함
      if (process.env.NODE_ENV === 'development') {
        response.stack = exception.stack
          ?.split('\n')
          .map((line) => line.trim());
      }

      // 인증 관련 오류 처리
      if (
        exception.message.includes('인증되지 않은 사용자입니다') ||
        exception.message.includes('로그인이 필요합니다')
      ) {
        response.statusCode = HttpStatus.UNAUTHORIZED;
      }
    }

    // Sharp 라이브러리 관련 특정 오류 메시지 사용자 친화적으로 변환
    if (
      response.message.includes('unsupported image format') ||
      (exception instanceof Error && exception.stack?.includes('sharp'))
    ) {
      response.message =
        '지원되지 않는 이미지 형식입니다. JPG, PNG, GIF, WebP 형식만 지원합니다.';
    }

    // 로깅
    const contextInfo = this.getContextInfo(host);

    // 로그 레벨 결정 (인증 오류는 경고로 처리)
    const isAuthError =
      exception instanceof UnauthorizedException ||
      response.statusCode === HttpStatus.UNAUTHORIZED ||
      (exception instanceof Error &&
        (exception.message.includes('인증되지 않은 사용자입니다') ||
          exception.message.includes('로그인이 필요합니다') ||
          exception.message.includes('이메일 또는 비밀번호가 잘못되었습니다')));

    if (isAuthError) {
      this.logger.warn(`GraphQL 인증 오류: ${response.message}`, {
        context: contextInfo,
        statusCode: response.statusCode,
      });
    } else {
      this.logger.error(`GraphQL 예외 발생: ${response.message}`, {
        exception:
          exception instanceof Error ? exception.stack : String(exception),
        context: contextInfo,
        statusCode: response.statusCode,
      });
    }

    // 에러 코드 매핑
    let errorCode = 'INTERNAL_SERVER_ERROR';
    if (
      exception instanceof UnauthorizedException ||
      response.statusCode === HttpStatus.UNAUTHORIZED
    ) {
      errorCode = 'UNAUTHENTICATED';
    } else if (response.statusCode === HttpStatus.FORBIDDEN) {
      errorCode = 'FORBIDDEN';
    } else if (response.statusCode === HttpStatus.BAD_REQUEST) {
      errorCode = 'BAD_USER_INPUT';
    } else if (response.statusCode !== HttpStatus.INTERNAL_SERVER_ERROR) {
      errorCode = response.statusCode.toString();
    }

    // GraphQL 응답 형식으로 변환
    const gqlResponse = {
      message: response.message,
      statusCode: response.statusCode,
      timestamp: response.timestamp,
      path: contextInfo.operationName || 'unknown',
    };

    // 개발 환경에서만 세부 정보 포함
    if (process.env.NODE_ENV === 'development' && 'details' in response) {
      gqlResponse['details'] = response.details;
    }
    if (process.env.NODE_ENV === 'development' && 'stack' in response) {
      gqlResponse['stack'] = response.stack;
    }

    // GraphQL 형식으로 에러 반환
    return {
      extensions: {
        code: errorCode,
        response: gqlResponse,
      },
      message: response.message,
    };
  }

  /**
   * GraphQL 컨텍스트에서 유용한 정보 추출
   */
  private getContextInfo(host: ArgumentsHost): any {
    try {
      // GraphQL 컨텍스트에서 정보 추출 시도
      const context = host.getArgByIndex(2) || {};
      const info = host.getArgByIndex(3) || {};

      return {
        operationName: info.operation?.name?.value || 'unnamed_operation',
        fieldName: info.fieldName || 'unknown_field',
        operation: info.operation?.operation || 'unknown',
        variables: context.req?.body?.variables || {},
        headers: this.sanitizeHeaders(context.req?.headers || {}),
      };
    } catch (error) {
      return { error: 'GraphQL 컨텍스트 정보를 추출할 수 없습니다.' };
    }
  }

  /**
   * 요청 헤더에서 민감한 정보 제거
   */
  private sanitizeHeaders(headers: any): any {
    if (!headers) return {};

    const sanitized = { ...headers };

    // 민감한 헤더 마스킹
    const sensitiveHeaders = ['authorization', 'cookie', 'set-cookie'];
    sensitiveHeaders.forEach((header) => {
      if (header in sanitized) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}
