import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { Logger, ValidationPipe } from '@nestjs/common';

/**
 * @description 애플리케이션의 진입점(Entry Point)입니다.
 * @summary NestJS 애플리케이션 인스턴스를 생성하고, 서버를 시작하기 전에
 * 필요한 초기화 작업을 수행합니다.
 */
async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule);

    // class-validator와 class-transformer를 전역으로 적용하기 위한 Global Pipe 설정
    app.useGlobalPipes(
      new ValidationPipe({
        // whitelist: true - DTO에 정의되지 않은 속성은 자동으로 제거
        whitelist: true,
        // forbidNonWhitelisted: true - DTO에 정의되지 않은 속성이 있으면 예외 발생
        forbidNonWhitelisted: true,
        // transform: true - DTO 클래스로 타입 변환 활성화
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    // TypeORM DataSource 인스턴스를 애플리케이션 컨텍스트에서 가져옵니다.
    const dataSource = app.get(DataSource);

    // 애플리케이션 시작 시 보류 중인 모든 마이그레이션을 실행합니다.
    // 이는 CLI 도구의 문제를 우회하고, 개발 환경에서 DB 스키마를 최신 상태로 유지하는 데 도움이 됩니다.
    logger.log('Running database migrations...');
    await dataSource.runMigrations();
    logger.log('Database migrations completed successfully.');

    // .env 파일의 PORT 환경 변수를 사용하고, 없으면 3000번 포트를 기본값으로 사용합니다.
    const port = process.env.PORT || 3000;
    await app.listen(port);

    logger.log(`Application is running on: ${await app.getUrl()}`);
  } catch (error) {
    logger.error('Failed to bootstrap the application.', error);
    // 부트스트랩 과정에서 에러가 발생하면 프로세스를 종료합니다.
    process.exit(1);
  }
}

// 애플리케이션 부트스트랩 함수를 호출합니다.
bootstrap();
