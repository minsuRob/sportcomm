import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../../entities/user.entity';
import { SupabaseService } from '../../common/services/supabase.service';
import { UserSyncService } from './user-sync.service';

export interface SupabaseJwtPayload {
  sub: string; // user ID
  email?: string;
  phone?: string;
  app_metadata?: {
    provider?: string;
    providers?: string[];
  };
  user_metadata?: {
    role?: string;
    nickname?: string;
    [key: string]: any;
  };
  role?: string;
  aal?: string;
  amr?: Array<{ method: string; timestamp: number }>;
  session_id?: string;
  iat: number;
  exp: number;
  iss?: string;
  aud?: string;
}

/**
 * Supabase JWT 인증 전략 (업데이트됨)
 *
 * Supabase에서 발급한 JWT 토큰을 검증하고 사용자 정보를 로드합니다.
 * User 엔티티를 사용하여 사용자 정보를 관리하고 자동 동기화를 수행합니다.
 */
@Injectable()
export class SupabaseJwtStrategy extends PassportStrategy(
  Strategy,
  'supabase-jwt',
) {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly supabaseService: SupabaseService,
    private readonly userSyncService: UserSyncService,
  ) {
    // Supabase JWT 검증을 위한 설정
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, // 토큰 만료 검증 활성화
      // Supabase JWT 시크릿 키 사용 (올바른 프로젝트의 JWT Secret)
      secretOrKey:
        configService.get<string>('SUPABASE_JWT_SECRET') ||
        'IA2HIh02zsvxCW0UEjgwxQSML3CDNAcCnvd534czOUk1re65ooCWxH3pWT8oDCIyNrKgEjIdEcsnxcWHBZ3TYw',
      algorithms: ['HS256'],
    });
  }

  /**
   * JWT 페이로드 검증 및 사용자 정보 로드 (업데이트됨)
   *
   * User 엔티티를 사용하여 사용자 정보를 관리하고,
   * UserSyncService를 통해 자동 동기화를 수행합니다.
   *
   * @param payload JWT 페이로드
   * @returns 인증된 사용자 객체
   */
  async validate(payload: any): Promise<User> {
    try {
      console.log('🔍 JWT 페이로드 전체:', JSON.stringify(payload, null, 2));
      console.log('🔍 JWT 토큰 발급자(iss):', payload.iss);
      console.log('🔍 JWT 토큰 대상(aud):', payload.aud);
      console.log(
        '🔍 JWT 토큰 만료시간(exp):',
        payload.exp,
        '현재시간:',
        Math.floor(Date.now() / 1000),
      );

      // Supabase JWT 페이로드 구조 확인
      const userId = payload.sub || payload.user_id || payload.id;

      if (!userId) {
        console.error('❌ 사용자 ID를 찾을 수 없음:', payload);
        throw new UnauthorizedException('토큰에 사용자 ID가 없습니다.');
      }

      console.log('👤 추출된 사용자 ID:', userId);

      // 토큰 발급자 검증 (올바른 Supabase 프로젝트인지 확인)
      const expectedIssuer = 'https://hgekmqvscnjcuzyduchy.supabase.co/auth/v1';
      if (payload.iss && payload.iss !== expectedIssuer) {
        console.error('❌ 잘못된 토큰 발급자:', {
          received: payload.iss,
          expected: expectedIssuer,
        });
        throw new UnauthorizedException('잘못된 토큰 발급자입니다.');
      }

      // 토큰 만료 확인 (passport-jwt가 자동으로 처리하므로 제거)
      // ignoreExpiration: false로 설정했으므로 만료된 토큰은 여기까지 오지 않음

      // User를 통해 사용자 조회
      let user = await this.userRepository.findOne({
        where: { id: userId },
      });

      console.log(
        '👤 DB에서 사용자 조회 결과:',
        user ? `찾음 (${user.nickname})` : '없음',
      );

      // 사용자가 로컬 DB에 없으면 자동 동기화
      if (!user) {
        console.log(`🔄 새 사용자 자동 동기화 시작: ${userId}`);

        try {
          user = await this.userSyncService.syncUser({
            userId,
            // JWT 페이로드에서 기본 정보 추출
            nickname:
              payload.user_metadata?.nickname ||
              payload.email?.split('@')[0] ||
              `user_${userId.slice(0, 8)}`,
            role: payload.user_metadata?.role as UserRole,
          });

          console.log(
            `✅ 새 사용자 동기화 완료: ${user.nickname} (ID: ${userId})`,
          );
        } catch (syncError) {
          console.error(`❌ 사용자 동기화 실패: ${userId}`, syncError);
          throw new UnauthorizedException('사용자 정보 동기화에 실패했습니다.');
        }
      } else {
        // 기존 사용자의 경우 주기적 동기화 (1시간마다)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        if (user.updatedAt < oneHourAgo) {
          try {
            user = await this.userSyncService.syncUser({
              userId,
              nickname:
                payload.user_metadata?.nickname ||
                payload.email?.split('@')[0] ||
                `user_${userId.slice(0, 8)}`,
              role: payload.user_metadata?.role as UserRole,
            });
            console.log(
              `🔄 사용자 정보 동기화 완료: ${user.nickname} (ID: ${userId})`,
            );
          } catch (syncError) {
            console.warn(
              `⚠️ 사용자 동기화 실패 (계속 진행): ${userId}`,
              syncError.message,
            );
            // 동기화 실패해도 기존 정보로 계속 진행
          }
        }
      }

      // 계정 활성화 상태 확인
      if (!user.isActive) {
        throw new UnauthorizedException(
          '비활성화된 계정입니다. 관리자에게 문의하세요.',
        );
      }

      console.log('✅ 인증 성공:', {
        userId: user.id,
        nickname: user.nickname,
      });
      return user;
    } catch (error) {
      console.error('❌ JWT 검증 중 오류:', error);

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('인증에 실패했습니다.');
    }
  }
}
