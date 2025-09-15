import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

/**
 * 애플리케이션 기본 컨트롤러
 *
 * 서버 상태 확인, 헬스체크, 기본 정보 제공 등
 * 애플리케이션 레벨의 기본 엔드포인트를 처리합니다.
 */
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * 기본 엔드포인트
   * 서버가 정상적으로 실행되고 있는지 확인합니다.
   *
   * @returns 기본 응답 메시지
   */
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * 간단한 헬스체크 엔드포인트
   * Render.com 유휴 상태 방지를 위한 간단한 헬스체크
   *
   * @returns 간단한 상태 응답
   */
  @Get('health')
  healthCheck() {
    return { status: 'ok' };
  }

  /**
   * 헬스체크 엔드포인트
   * 서버와 데이터베이스 연결 상태를 확인합니다.
   *
   * @returns 헬스체크 결과
   */
  @Get('health')
  async getHealth(): Promise<{
    status: string;
    timestamp: string;
    environment: string;
    database: string;
    server: string;
  }> {
    return await this.appService.getHealthCheck();
  }

  /**
   * 서버 정보 엔드포인트
   * 서버 버전, 환경 정보 등을 제공합니다.
   *
   * @returns 서버 정보
   */
  @Get('info')
  getServerInfo(): {
    name: string;
    version: string;
    environment: string;
    node: string;
    uptime: number;
  } {
    return this.appService.getServerInfo();
  }

  /**
   * API 문서 정보 엔드포인트
   * GraphQL 스키마 및 REST API 정보를 제공합니다.
   *
   * @returns API 문서 정보
   */
  @Get('docs')
  getApiDocs(): {
    graphql: string;
    rest: string;
    description: string;
  } {
    return this.appService.getApiDocs();
  }

  /**
   * 데이터베이스 시딩 엔드포인트 (개발 환경 전용)
   *
   * @returns 시딩 결과 메시지
   */
  @Get('seed')
  async seedDatabase(): Promise<string> {
    return await this.appService.seedDatabase();
  }
}
