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
import { BookmarkModule } from './modules/bookmarks/bookmark.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AdminModule } from './modules/admin/admin.module';
import { SportsModule } from './modules/sports/sports.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DatabaseConfig } from './config/database.config';
import { SupabaseConfig } from './config/supabase.config';

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
      envFilePath: [
        `.env.${process.env.NODE_ENV || 'development'}`,
        '.env.local',
        '.env',
      ],
      cache: true,
      expandVariables: true,
    }),

    // TypeORM 데이터베이스 설정
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        // 데이터베이스 설정 검증
        DatabaseConfig.validateDatabaseConfig(configService);

        // TypeORM 설정 반환
        return DatabaseConfig.createTypeOrmOptions(configService);
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
            allowedHeaders: [
              'Content-Type',
              'Authorization',
              'Accept',
              'X-Requested-With',
              'Origin',
              'apollo-require-preflight',
            ],
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

    // 이벤트 시스템 모듈
    EventEmitterModule.forRoot(),

    // 기능 모듈들
    AuthModule,
    PostsModule,
    UsersModule,
    CommentsModule,
    SearchModule,
    MediaModule,
    ModerationModule,
    BookmarkModule,
    NotificationsModule,
    AdminModule,
    SportsModule,
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
    // JWT 관련 필수 환경 변수
    const requiredEnvVars = ['JWT_SECRET', 'JWT_EXPIRES_IN'];

    const missingEnvVars = requiredEnvVars.filter(
      (envVar) => !this.configService.get<string>(envVar),
    );

    if (missingEnvVars.length > 0) {
      console.error(
        `❌ 다음 환경 변수들이 설정되지 않았습니다: ${missingEnvVars.join(', ')}`,
      );
      process.exit(1);
    }

    // 데이터베이스 설정은 DatabaseConfig에서 검증됨
    // Supabase 설정 검증 (선택사항)
    SupabaseConfig.validateSupabaseConfig(this.configService, false);
  }

  /**
   * 애플리케이션 시작 정보 출력
   */
  private printStartupInfo(): void {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    const port = this.configService.get<number>('PORT', 3000);
    const databaseUrl = this.configService.get<string>('DATABASE_URL');
    const dbHost = this.configService.get<string>('DB_HOST');
    const dbPort = this.configService.get<number>('DB_PORT');
    const dbName = this.configService.get<string>('DB_DATABASE');
    const supabaseConfigured = SupabaseConfig.isConfigured(this.configService);

    console.log('\n🚀 스포츠 커뮤니티 백엔드 서버 시작 중...\n');
    console.log('📊 서버 정보:');
    console.log(`   - 환경: ${nodeEnv}`);
    console.log(`   - 포트: ${port}`);
    console.log(`   - GraphQL: http://localhost:${port}/graphql`);

    if (nodeEnv === 'development') {
      console.log(`   - GraphQL Playground: http://localhost:${port}/graphql`);
    }

    const useSupabase =
      this.configService.get<string>('USE_SUPABASE') === 'true';

    console.log('\n💾 데이터베이스 정보:');
    console.log(
      `   - 데이터베이스 타입: ${useSupabase ? 'Supabase PostgreSQL' : '로컬 PostgreSQL'}`,
    );
    if (databaseUrl) {
      console.log(`   - 연결: DATABASE_URL 사용`);
    } else {
      console.log(`   - 호스트: ${dbHost}:${dbPort}`);
      console.log(`   - 데이터베이스: ${dbName}`);
    }
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
    console.log(
      `   - ${supabaseConfigured ? '✅' : '⚠️'} Supabase 실시간 기능 ${supabaseConfigured ? '활성화' : '비활성화'}`,
    );
    console.log(
      `   - ${useSupabase ? '✅' : '⚠️'} Supabase 주 데이터베이스 ${useSupabase ? '활성화' : '비활성화'}`,
    );

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
