import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { checkDatabaseHealth } from './database/datasource';

/**
 * 애플리케이션 기본 서비스
 *
 * 서버 상태 확인, 헬스체크, 기본 정보 제공 등
 * 애플리케이션 레벨의 기본 서비스를 처리합니다.
 */
@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * 기본 응답 메시지
   *
   * @returns 환영 메시지
   */
  getHello(): string {
    const appName = '스포츠 커뮤니티 백엔드';
    const version = '1.0.0';
    const environment = this.configService.get<string>(
      'NODE_ENV',
      'development',
    );

    return `🚀 ${appName} v${version} (${environment}) 서버가 정상적으로 실행 중입니다!`;
  }

  /**
   * 헬스체크 수행
   * 서버와 데이터베이스 연결 상태를 확인합니다.
   *
   * @returns 헬스체크 결과
   */
  async getHealthCheck(): Promise<{
    status: string;
    timestamp: string;
    environment: string;
    database: string;
    server: string;
  }> {
    const timestamp = new Date().toISOString();
    const environment = this.configService.get<string>(
      'NODE_ENV',
      'development',
    );

    // 데이터베이스 상태 확인
    let databaseStatus = '연결됨';
    try {
      const isHealthy = await checkDatabaseHealth();
      databaseStatus = isHealthy ? '연결됨' : '연결 실패';
    } catch (error) {
      databaseStatus = '연결 실패';
    }

    // 서버 상태 확인
    const serverStatus = '정상';

    // 전체 상태 결정
    const overallStatus = databaseStatus === '연결됨' ? 'OK' : 'ERROR';

    return {
      status: overallStatus,
      timestamp,
      environment,
      database: databaseStatus,
      server: serverStatus,
    };
  }

  /**
   * 서버 정보 조회
   *
   * @returns 서버 정보
   */
  getServerInfo(): {
    name: string;
    version: string;
    environment: string;
    node: string;
    uptime: number;
  } {
    return {
      name: '스포츠 커뮤니티 백엔드',
      version: '1.0.0',
      environment: this.configService.get<string>('NODE_ENV', 'development'),
      node: process.version,
      uptime: Math.floor(process.uptime()),
    };
  }

  /**
   * API 문서 정보 조회
   *
   * @returns API 문서 정보
   */
  getApiDocs(): {
    graphql: string;
    rest: string;
    description: string;
  } {
    const port = this.configService.get<number>('PORT', 3000);
    const baseUrl = `http://localhost:${port}`;

    return {
      graphql: `${baseUrl}/graphql`,
      rest: `${baseUrl}/api`,
      description:
        '스포츠 커뮤니티 백엔드 API 문서입니다. GraphQL Playground에서 스키마와 쿼리를 확인할 수 있습니다.',
    };
  }

  /**
   * 애플리케이션 통계 정보 조회
   *
   * @returns 애플리케이션 통계
   */
  getAppStats(): {
    memory: NodeJS.MemoryUsage;
    uptime: number;
    pid: number;
    platform: string;
    version: string;
  } {
    return {
      memory: process.memoryUsage(),
      uptime: Math.floor(process.uptime()),
      pid: process.pid,
      platform: process.platform,
      version: process.version,
    };
  }

  /**
   * 환경 변수 검증 상태 확인
   *
   * @returns 환경 변수 검증 결과
   */
  validateEnvironment(): {
    isValid: boolean;
    missingVars: string[];
  } {
    const requiredEnvVars = [
      'DB_HOST',
      'DB_PORT',
      'DB_USERNAME',
      'DB_PASSWORD',
      'DB_DATABASE',
      'JWT_SECRET',
      'JWT_EXPIRES_IN',
    ];

    const missingVars = requiredEnvVars.filter(
      (envVar) => !this.configService.get<string>(envVar),
    );

    return {
      isValid: missingVars.length === 0,
      missingVars,
    };
  }

  /**
   * 데이터베이스 연결 정보 조회
   *
   * @returns 데이터베이스 연결 정보 (민감한 정보 제외)
   */
  getDatabaseInfo(): {
    host: string;
    port: number;
    database: string;
    type: string;
  } {
    return {
      host: this.configService.get<string>('DB_HOST', 'localhost'),
      port: this.configService.get<number>('DB_PORT', 5432),
      database: this.configService.get<string>('DB_DATABASE', 'sportcomm'),
      type: 'PostgreSQL',
    };
  }

  /**
   * 서버 시작 시간 조회
   *
   * @returns 서버 시작 시간
   */
  getStartupTime(): {
    startTime: Date;
    uptime: number;
    uptimeFormatted: string;
  } {
    const uptimeSeconds = Math.floor(process.uptime());
    const startTime = new Date(Date.now() - uptimeSeconds * 1000);

    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;

    const uptimeFormatted = `${hours}시간 ${minutes}분 ${seconds}초`;

    return {
      startTime,
      uptime: uptimeSeconds,
      uptimeFormatted,
    };
  }
}
