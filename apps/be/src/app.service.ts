import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './entities/user.entity';
import { Post, PostType } from './entities/post.entity';
import { checkDatabaseHealth } from './database/datasource';

/**
 * 애플리케이션 기본 서비스
 *
 * 서버 상태 확인, 헬스체크, 기본 정보 제공 등
 * 애플리케이션 레벨의 기본 서비스를 처리합니다.
 */
@Injectable()
export class AppService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
  ) {}

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

  /**
   * 개발용 데이터베이스 시딩
   * 테스트 사용자 2명과 게시물 3개를 생성합니다.
   *
   * @returns 성공 메시지
   */
  async seedDatabase(): Promise<string> {
    try {
      // 1. 테스트 사용자 생성
      const usersData = [
        {
          email: 'user1@test.com',
          nickname: '스포츠팬1',
          password: 'password123',
        },
        {
          email: 'user2@test.com',
          nickname: '해설가2',
          password: 'password123',
        },
      ];

      const createdUsers: User[] = [];
      for (const userData of usersData) {
        let user = await this.userRepository.findOne({
          where: { email: userData.email },
        });
        if (!user) {
          const hashedPassword = await bcrypt.hash(userData.password, 12);
          user = this.userRepository.create({
            ...userData,
            password: hashedPassword,
            isEmailVerified: true,
          });
          await this.userRepository.save(user);
        }
        createdUsers.push(user);
      }

      // 2. 테스트 게시물 생성
      const postsData = [
        {
          title: '오늘 경기 정말 대박이었네요!',
          content:
            '마지막 10초를 남기고 역전 골이라니... 믿을 수가 없습니다. 손에 땀을 쥐게 하는 경기였습니다.',
          type: PostType.CHEERING,
          author: createdUsers[0],
          likeCount: 25,
          commentCount: 3,
        },
        {
          title: '이번 시즌 우승팀 예측',
          content:
            '데이터를 기반으로 분석해 본 결과, A팀의 우승 확률이 가장 높습니다. 자세한 내용은 본문을 참고하세요.',
          type: PostType.ANALYSIS,
          author: createdUsers[1],
          likeCount: 150,
          commentCount: 42,
        },
        {
          title: '역대급 명장면 하이라이트',
          content:
            '이 선수의 슈퍼 세이브는 정말 길이 남을 명장면입니다. 다들 어떻게 보셨나요? 다시 봐도 감동적이네요.',
          type: PostType.HIGHLIGHT,
          author: createdUsers[0],
          likeCount: 37,
          commentCount: 12,
        },
      ];

      for (const postData of postsData) {
        const postExists = await this.postRepository.findOne({
          where: { title: postData.title },
        });
        if (!postExists) {
          const post = this.postRepository.create({
            ...postData,
            authorId: postData.author.id,
          });
          await this.postRepository.save(post);
        }
      }

      return '✅ 데이터베이스 시딩이 성공적으로 완료되었습니다: 사용자 2명, 게시물 3개 생성';
    } catch (error) {
      console.error('❌ 데이터베이스 시딩 중 오류 발생:', error);
      throw new Error('데이터베이스 시딩에 실패했습니다.');
    }
  }
}
