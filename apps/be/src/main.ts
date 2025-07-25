import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { initializeDatabase, printDatabaseInfo } from './database/datasource';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { json } from 'express';
import { ensureDir } from 'fs-extra';

/**
 * 스포츠 커뮤니티 백엔드 애플리케이션 진입점
 *
 * NestJS 애플리케이션을 부트스트랩하고 필요한 설정을 적용합니다.
 * 데이터베이스 연결, 검증 파이프, CORS 설정 등을 포함합니다.
 */
async function bootstrap() {
  try {
    console.log('🚀 애플리케이션 시작 중...');

    // NestJS 애플리케이션 생성
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    // multipart/form-data 요청을 처리하는 미들웨어 설정
    app.use(json({ limit: '10mb' }));

    // 정적 파일 폴더가 존재하는지 확인하고 생성
    try {
      const uploadsDir = join(__dirname, '..', 'uploads', 'images');
      await ensureDir(uploadsDir);
      console.log(`✅ 업로드 디렉터리 확인: ${uploadsDir}`);
    } catch (error) {
      console.error('❌ 업로드 디렉터리 생성 실패:', error);
    }

    // 정적 파일 서빙 설정 (업로드된 이미지)
    app.useStaticAssets(join(__dirname, '..', 'uploads'), {
      prefix: '/uploads/',
    });

    // 설정 서비스 가져오기
    const configService = app.get(ConfigService);

    // 전역 검증 파이프 설정
    app.useGlobalPipes(
      new ValidationPipe({
        // 정의되지 않은 속성 제거
        whitelist: true,
        // 정의되지 않은 속성이 있으면 에러 발생
        forbidNonWhitelisted: true,
        // 타입 자동 변환
        transform: true,
        // 자세한 에러 메시지 제공
        disableErrorMessages: false,
        // 커스텀 데코레이터 검증 비활성화 (CurrentUser 등)
        validateCustomDecorators: false,
        // 에러 메시지 상세 정보 포함
        dismissDefaultMessages: false,
        // 첫 번째 에러에서 중단하지 않고 모든 에러 수집
        stopAtFirstError: false,
      }),
    );

    // 전역 접두사 설정
    app.setGlobalPrefix('api', {
      exclude: ['/graphql', '/health'],
    });

    // CORS 설정
    const isDevelopment = configService.get('NODE_ENV') === 'development';
    app.enableCors({
      origin: isDevelopment
        ? [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:4000',
            'http://localhost:8081',
          ]
        : configService.get<string>('FRONTEND_URL', 'https://sportcomm.com'),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Accept',
        'X-Requested-With',
        'Origin',
      ],
    });

    // 데이터베이스 연결 확인
    try {
      await initializeDatabase();
      printDatabaseInfo();
    } catch (error) {
      console.error('❌ 데이터베이스 연결 실패:', error);
      process.exit(1);
    }

    // 서버 시작
    const port = configService.get<number>('PORT', 3000);
    await app.listen(port);

    // 성공 메시지 출력
    console.log('\n✅ 애플리케이션이 성공적으로 시작되었습니다!');
    console.log(`🌐 서버 주소: http://localhost:${port}`);
    console.log(`📊 GraphQL Playground: http://localhost:${port}/graphql`);
    console.log(`🩺 Health Check: http://localhost:${port}/health`);

    // 개발 환경에서만 추가 정보 출력
    if (isDevelopment) {
      console.log('\n🔧 개발 모드 활성화:');
      console.log('   - 자동 스키마 동기화');
      console.log('   - GraphQL Playground 활성화');
      console.log('   - 상세한 에러 메시지');
      console.log('   - 쿼리 로깅 활성화');
    }

    console.log('\n==========================================');
    console.log('🎯 서버가 요청을 처리할 준비가 되었습니다!');
    console.log('==========================================\n');
  } catch (error) {
    console.error('❌ 애플리케이션 시작 실패:', error);
    process.exit(1);
  }
}

// 프로세스 종료 처리
process.on('SIGINT', async () => {
  console.log('\n🛑 서버 종료 중...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 서버 종료 중...');
  process.exit(0);
});

// 처리되지 않은 예외 처리
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 처리되지 않은 Promise 거부:', reason);
  console.error('Promise:', promise);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ 처리되지 않은 예외:', error);
  process.exit(1);
});

// 애플리케이션 시작
bootstrap();
