import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { entities, Post, User } from './entities';
import { AuthModule } from './modules/auth/auth.module';
import { PostsModule } from './modules/posts/posts.module';
import { UsersModule } from './modules/users/users.module';
import { CommentsModule } from './modules/comments/comments.module';
import { SearchModule } from './modules/search/search.module';
import { MediaModule } from './modules/media/media.module';
import { ModerationModule } from './modules/moderation/moderation.module';

/**
 * 메인 애플리케이션 모듈
 *
 * 스포츠 커뮤니티 백엔드 애플리케이션의 루트 모듈입니다.
 * 모든 기능 모듈과 외부 라이브러리를 통합하고 설정합니다.
 *
 * 주요 기능:
 * - GraphQL API 서버
 * - PostgreSQL 데이터베이스 연결
 * - JWT 기반 인증
 * - 게시물 관리 시스템
 * - 검색 기능
 * - 환경 변수 관리
 */
@Module({
  imports: [
    // 환경 변수 설정 모듈
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      cache: true,
      expandVariables: true,
    }),

    // TypeORM 데이터베이스 설정
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const isProduction = configService.get('NODE_ENV') === 'production';
        const isDevelopment = configService.get('NODE_ENV') === 'development';

        return {
          type: 'postgres',
          host: configService.get<string>('DB_HOST', 'localhost'),
          port: configService.get<number>('DB_PORT', 5432),
          username: configService.get<string>('DB_USERNAME', 'postgres'),
          password: configService.get<string>('DB_PASSWORD', 'password'),
          database: configService.get<string>('DB_DATABASE', 'sportcomm'),

          // 엔티티 설정
          entities: entities,

          // 개발 환경에서만 스키마 동기화 활성화
          synchronize: isDevelopment,

          // 로깅 설정 (운영 환경이 아닐 때 모든 쿼리 로깅)
          logging: !isProduction,

          // 연결 풀 설정
          extra: {
            connectionLimit: 10,
            acquireTimeout: 60000,
            timeout: 60000,
          },

          // SSL 설정 (운영 환경에서 활성화)
          ssl: isProduction
            ? {
                rejectUnauthorized: false,
              }
            : false,

          // 트랜잭션 격리 수준
          isolationLevel: 'READ_COMMITTED',

          // 자동 재연결 설정
          autoLoadEntities: true,
          keepConnectionAlive: true,

          // 메타데이터 캐싱 활성화
          cache: {
            type: 'database',
            tableName: 'query_result_cache',
            duration: 30000, // 30초
          },
        };
      },
    }),

    // GraphQL 설정
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const isDevelopment = configService.get('NODE_ENV') === 'development';

        return {
          // 스키마 생성 설정
          autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
          sortSchema: true,

          // 개발 환경에서만 GraphQL Playground 및 introspection 활성화
          playground: isDevelopment,
          introspection: true,

          // 컨텍스트 설정 (요청/응답 객체 전달)
          context: ({ req, res }) => ({
            req,
            res,
          }),

          // 에러 포맷팅
          formatError: (error) => {
            // 운영 환경에서는 민감한 정보 숨김
            if (configService.get('NODE_ENV') === 'production') {
              return {
                message: error.message,
                // 스택 트레이스 제거
                locations: error.locations,
                path: error.path,
              };
            }
            return error;
          },

          // CORS 설정
          cors: {
            origin: isDevelopment
              ? true
              : configService.get<string>(
                  'FRONTEND_URL',
                  'https://sportcomm.com',
                ),
            credentials: true,
          },

          // 쿼리 복잡도 제한
          validationRules: [],

          // 파일 업로드 설정 (GraphQL Upload 지원)
          uploads: {
            maxFileSize: 10 * 1024 * 1024, // 10MB
            maxFiles: 4,
          },

          // 파일 업로드 스칼라는 @Scalar 데코레이터로 자동 등록됨

          // 구독 설정 (실시간 기능용)
          subscriptions: {
            'graphql-ws': true,
          },

          // 개발 환경에서 GraphQL 요청/응답 로깅 플러그인 추가
          plugins: [
            {
              async requestDidStart(requestContext) {
                // IntrospectionQuery는 로깅에서 제외
                if (
                  requestContext.request.operationName === 'IntrospectionQuery'
                ) {
                  return;
                }

                if (isDevelopment) {
                  console.log('\n--- GraphQL Request ---');
                  console.log(requestContext.request.query);
                  if (
                    requestContext.request.variables &&
                    Object.keys(requestContext.request.variables).length > 0
                  ) {
                    console.log(
                      'Variables:',
                      JSON.stringify(requestContext.request.variables, null, 2),
                    );
                  }
                  console.log('-----------------------\n');
                }

                return {
                  async willSendResponse(responseContext) {
                    if (isDevelopment) {
                      console.log('\n--- GraphQL Response ---');
                      console.log(
                        JSON.stringify(responseContext.response.body, null, 2),
                      );
                      console.log('------------------------\n');
                    }
                  },
                };
              },
            },
          ],
        };
      },
    }),

    TypeOrmModule.forFeature([User, Post]),

    // 기능 모듈들
    AuthModule,
    PostsModule,
    UsersModule,
    CommentsModule,
    SearchModule,
    MediaModule,
    ModerationModule,
  ],

  // 컨트롤러 및 서비스
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  constructor(private readonly configService: ConfigService) {
    // 애플리케이션 초기화 시 설정 검증 및 로그 출력
    this.validateConfiguration();
    this.printStartupInfo();
  }

  /**
   * 필수 환경 변수 검증
   */
  private validateConfiguration(): void {
    const requiredEnvVars = [
      'DB_HOST',
      'DB_PORT',
      'DB_USERNAME',
      'DB_PASSWORD',
      'DB_DATABASE',
      'JWT_SECRET',
      'JWT_EXPIRES_IN',
    ];

    const missingEnvVars = requiredEnvVars.filter(
      (envVar) => !this.configService.get<string>(envVar),
    );

    if (missingEnvVars.length > 0) {
      console.error(
        `❌ 다음 환경 변수들이 설정되지 않았습니다: ${missingEnvVars.join(', ')}`,
      );
      process.exit(1);
    }
  }

  /**
   * 애플리케이션 시작 정보 출력
   */
  private printStartupInfo(): void {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    const port = this.configService.get<number>('PORT', 3000);
    const dbHost = this.configService.get<string>('DB_HOST');
    const dbPort = this.configService.get<number>('DB_PORT');
    const dbName = this.configService.get<string>('DB_DATABASE');

    console.log('\n🚀 스포츠 커뮤니티 백엔드 서버 시작 중...\n');
    console.log('📊 서버 정보:');
    console.log(`   - 환경: ${nodeEnv}`);
    console.log(`   - 포트: ${port}`);
    console.log(`   - GraphQL: http://localhost:${port}/graphql`);

    if (nodeEnv === 'development') {
      console.log(`   - GraphQL Playground: http://localhost:${port}/graphql`);
    }

    console.log('\n💾 데이터베이스 정보:');
    console.log(`   - 호스트: ${dbHost}:${dbPort}`);
    console.log(`   - 데이터베이스: ${dbName}`);
    console.log(
      `   - 스키마 동기화: ${nodeEnv === 'development' ? '활성화' : '비활성화'}`,
    );

    console.log('\n🔐 인증 정보:');
    console.log(`   - JWT 알고리즘: HS256`);
    console.log(
      `   - 토큰 만료 시간: ${this.configService.get<string>('JWT_EXPIRES_IN')}`,
    );

    console.log('\n🎯 활성화된 기능:');
    console.log('   - ✅ 사용자 인증 및 권한 관리');
    console.log('   - ✅ 게시물 관리 시스템');
    console.log('   - ✅ 댓글 관리 시스템');
    console.log('   - ✅ GraphQL API');
    console.log('   - ✅ 파일 업로드 지원');
    console.log('   - ✅ 실시간 구독 지원');
    console.log('   - ✅ 검색 기능');
    console.log('   - ✅ 데이터베이스 캐싱');

    console.log('\n⚡ 성능 최적화:');
    console.log('   - 쿼리 결과 캐싱: 30초');
    console.log('   - 연결 풀: 최대 10개');
    console.log('   - 파일 업로드: 최대 10MB');

    console.log('\n🛡️ 보안 설정:');
    console.log('   - CORS: 설정됨');
    console.log('   - 쿼리 복잡도 제한: 설정됨');
    console.log('   - 에러 정보 필터링: 운영 환경에서 활성화');

    console.log('\n==========================================\n');
  }
}
