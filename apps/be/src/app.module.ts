import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CommentsModule } from './comments/comments.module';
import { FollowsModule } from './follows/follows.module';
import { MediaModule } from './media/media.module';
import { PostsModule } from './posts/posts.module';
import { UsersModule } from './users/users.module';

/**
 * @description 애플리케이션의 루트 모듈입니다.
 * @summary 모든 하위 모듈과 전역 설정을 통합 관리합니다.
 * ConfigModule, GraphQLModule, TypeOrmModule과 같은 핵심 모듈을 설정하고,
 * 각 기능별(도메인별) 모듈을 imports 배열에 추가합니다.
 */
@Module({
  imports: [
    // 1. 환경 변수 관리 모듈 (dotenv 통합)
    // isGlobal: true 옵션을 통해 다른 모듈에서 ConfigModule을 가져오지 않아도 ConfigService를 주입할 수 있습니다.
    ConfigModule.forRoot({
      isGlobal: true,
      // .env 파일의 경로를 명시적으로 지정할 수 있습니다. 기본값은 프로젝트 루트입니다.
      // envFilePath: '.env',
    }),

    // 2. GraphQL 설정
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        // Code-First 접근 방식: 스키마 파일 자동 생성 경로
        autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
        // 스키마 자동 정렬
        sortSchema: true,
        // 프로덕션 환경에서는 비활성화할 수 있는 GraphQL Playground 활성화
        playground: configService.get<string>('NODE_ENV') !== 'production',
        // GqlAuthGuard나 JwtAuthGuard가 HTTP 요청(req)에 접근할 수 있도록 컨텍스트를 설정합니다.
        // Passport Strategy는 HTTP 요청 헤더에서 JWT를 추출해야 하기 때문에 이 설정이 필수적입니다.
        context: ({ req, res }) => ({ req, res }),
      }),
    }),

    // 3. 데이터베이스(TypeORM) 설정
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        // __dirname은 현재 파일이 있는 디렉토리를 가리킵니다.
        // 모든 .entity.ts 또는 .entity.js 파일을 엔티티로 자동 로드합니다.
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        // synchronize: false가 프로덕션 환경에 권장됩니다.
        // true로 설정하면 앱이 실행될 때마다 엔티티 정의에 맞춰 DB 스키마가 자동으로 변경되므로,
        // 데이터 손실의 위험이 있습니다. 대신 마이그레이션을 사용해야 합니다.
        synchronize: false,
        // 개발 환경에서 실행되는 SQL 쿼리를 로깅합니다.
        logging: configService.get<string>('NODE_ENV') !== 'production',
      }),
    }),

    // 4. 기능별(도메인) 모듈 등록 (의존성 순서에 따라 재정렬)
    UsersModule, // 다른 모듈에 의해 의존되므로 먼저 로드
    AuthModule, // UsersModule에 의존
    FollowsModule, // UsersModule에 의존
    PostsModule, // 다른 모듈에 의해 의존되므로 먼저 로드
    CommentsModule, // PostsModule에 의존
    MediaModule, // PostsModule에 의존
  ],
  // AppController와 AppService는 기본적으로 생성되는 파일이며,
  // 특정 도메인에 속하지 않는 간단한 상태 확인(health check) 등의 용도로 사용할 수 있습니다.
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
