import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthResolver } from './auth.resolver';
import { AuthController } from './auth.controller';
import { AuthAdminResolver } from './auth-admin.resolver';
import { JwtStrategy } from './jwt.strategy';
import { SupabaseSyncService } from './supabase-sync.service';
import { User } from '../../entities/user.entity';
import { MediaModule } from '../media/media.module';
import { UsersModule } from '../users/users.module';

/**
 * 인증 모듈
 *
 * 사용자 인증과 관련된 모든 기능을 제공합니다.
 * JWT 기반 인증, 회원가입, 로그인, 토큰 검증 등의 기능을 포함합니다.
 *
 * 구성 요소:
 * - AuthService: 인증 비즈니스 로직
 * - AuthResolver: GraphQL 리졸버
 * - JwtStrategy: JWT 토큰 검증 전략
 * - User Entity: 사용자 엔티티
 */
@Module({
  imports: [
    // User 엔티티를 위한 TypeORM 모듈
    TypeOrmModule.forFeature([User]),
    UsersModule,

    // Passport 모듈 설정
    PassportModule.register({
      defaultStrategy: 'jwt',
      property: 'user',
      session: false,
    }),

    // JWT 모듈 설정
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        const expiresIn = configService.get<string>('JWT_EXPIRES_IN', '7d');

        // JWT 시크릿 키 검증
        if (!secret) {
          throw new Error('JWT_SECRET이 환경 변수에 설정되지 않았습니다.');
        }

        // 개발 환경에서 약한 시크릿 키 경고
        if (process.env.NODE_ENV === 'development' && secret.length < 32) {
          console.warn(
            '⚠️  JWT_SECRET이 너무 짧습니다. 운영 환경에서는 최소 32자 이상의 강력한 시크릿 키를 사용하세요.',
          );
        }

        return {
          secret,
          signOptions: {
            expiresIn,
            algorithm: 'HS256',
            issuer: 'sportcomm',
            audience: 'sportcomm-users',
          },
          verifyOptions: {
            algorithms: ['HS256'],
            issuer: 'sportcomm',
            audience: 'sportcomm-users',
          },
        };
      },
    }),

    // 환경 변수 설정 모듈
    ConfigModule,

    // 미디어 모듈 (프로필 이미지 업로드용)
    MediaModule,
  ],

  // 컨트롤러 추가
  controllers: [AuthController],

  // 서비스 및 전략 제공
  providers: [
    AuthService,
    AuthResolver,
    AuthAdminResolver,
    JwtStrategy,
    SupabaseSyncService,
  ],

  // 다른 모듈에서 사용할 수 있도록 내보내기
  exports: [
    AuthService,
    JwtStrategy,
    PassportModule,
    JwtModule,
    SupabaseSyncService,
  ],
})
export class AuthModule {
  constructor(private readonly configService: ConfigService) {
    // 모듈 초기화 시 환경 변수 검증
    this.validateEnvironmentVariables();
  }

  /**
   * 인증 모듈에 필요한 환경 변수들을 검증합니다.
   */
  private validateEnvironmentVariables(): void {
    const requiredEnvVars = ['JWT_SECRET', 'JWT_EXPIRES_IN'];

    const missingEnvVars = requiredEnvVars.filter(
      (envVar) => !this.configService.get<string>(envVar),
    );

    if (missingEnvVars.length > 0) {
      throw new Error(
        `다음 환경 변수들이 설정되지 않았습니다: ${missingEnvVars.join(', ')}`,
      );
    }

    // JWT 설정 정보 출력 (개발 환경에서만)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔐 JWT 인증 모듈이 성공적으로 초기화되었습니다.');
      console.log(
        `   - 토큰 만료 시간: ${this.configService.get<string>('JWT_EXPIRES_IN')}`,
      );
      console.log(`   - 알고리즘: HS256`);
      console.log(`   - 발급자: sportcomm`);
      console.log(`   - 대상: sportcomm-users`);
    }
  }
}
