import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Request, Response } from 'express';

/**
 * 전역 예외 필터
 * 애플리케이션 전반에서 발생하는 모든 예외를 처리하는 필터입니다.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    // HTTP 어댑터 가져오기
    const { httpAdapter } = this.httpAdapterHost;

    // 컨텍스트 타입에 따라 처리
    const contextType = host.getType();
    let request: Request | undefined;
    let response: Response | undefined;

    // HTTP 컨텍스트인 경우에만 request, response 객체 추출
    if (contextType === 'http') {
      const ctx = host.switchToHttp();
      request = ctx.getRequest<Request>();
      response = ctx.getResponse<Response>();
    }

    // HTTP 상태 코드 결정
    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // 에러 메시지 결정
    let errorMessage = 'Internal server error';
    let errorDetails: any = null;

    // 예외 타입에 따른 처리
    if (exception instanceof HttpException) {
      // NestJS HTTP 예외 처리
      const nestResponse = exception.getResponse();
      errorMessage =
        typeof nestResponse === 'object' &&
        nestResponse !== null &&
        'message' in nestResponse
          ? Array.isArray(nestResponse['message'])
            ? nestResponse['message'][0]
            : nestResponse['message']
          : exception.message;

      errorDetails = nestResponse;
    } else if (exception instanceof Error) {
      // 일반 JavaScript Error 객체 처리
      errorMessage = exception.message;
      // 개발 환경에서만 스택 트레이스 포함
      if (process.env.NODE_ENV === 'development') {
        errorDetails = {
          stack: exception.stack?.split('\n').map((line) => line.trim()),
        };
      }
    }

    // 요청 정보 - request 객체가 있는 경우에만 수집
    let requestInfo: any = {
      type: contextType,
      message: '요청 정보를 사용할 수 없습니다.'
    };

    if (request) {
      requestInfo = {
        method: request.method,
        url: request.url,
        query: request.query,
        body: this.sanitizeRequestBody(request.body),
        params: request.params,
        headers: this.sanitizeHeaders(request.headers),
      };
    }

    // 오류 로깅
    this.logger.error(`예외 발생: ${errorMessage}`, {
      exception:
        exception instanceof Error ? exception.stack : String(exception),
      request: requestInfo,
      statusCode: httpStatus,
    });

    // Sharp 라이브러리 관련 특정 오류 메시지 사용자 친화적으로 변환
    if (
      errorMessage.includes('unsupported image format') ||
      (exception instanceof Error && exception.stack?.includes('sharp'))
    ) {
      errorMessage =
        '지원되지 않는 이미지 형식입니다. JPG, PNG, GIF, WebP 형식만 지원합니다.';
    }

    // 응답 객체 구성
    const responseBody = {
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path: request?.url || 'unknown',
      method: request?.method || 'unknown',
      message: errorMessage,
      ...(errorDetails && process.env.NODE_ENV === 'development'
        ? { details: errorDetails }
        : {}),
      ...(httpStatus === HttpStatus.INTERNAL_SERVER_ERROR
        ? { code: 'INTERNAL_SERVER_ERROR' }
        : {}),
    };

    // HTTP 컨텍스트인 경우에만 응답 전송
    if (contextType === 'http' && response) {
      try {
        httpAdapter.reply(response, responseBody, httpStatus);
      } catch (error) {
        this.logger.error(`응답 전송 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      // 다른 컨텍스트(GraphQL 등)에서는 로그만 기록하고 계속 진행
      // GraphQL은 자체 에러 처리 메커니즘이 있으므로 별도 처리 필요 없음
      this.logger.error(`컨텍스트 타입 ${contextType}에 대한 응답을 처리할 수 없습니다: ${errorMessage}`);
    }
  }

  /**
   * 요청 본문에서 민감한 정보 제거
   */
  private sanitizeRequestBody(body: any): any {
    if (!body) return {};

    const sanitized = { ...body };

    // 민감한 필드 마스킹
    const sensitiveFields = [
      'password',
      'passwordConfirm',
      'token',
      'secret',
      'authorization',
    ];
    sensitiveFields.forEach((field) => {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
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
