import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../../entities/user.entity';
import { UserInfo } from '../../entities/user-info.entity';
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
 * UserInfo 엔티티를 사용하여 사용자 정보를 관리하고 자동 동기화를 수행합니다.
 */
@Injectable()
export class SupabaseJwtStrategy extends PassportStrategy(
  Strategy,
  'supabase-jwt',
) {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserInfo)
    private readonly userInfoRepository: Repository<UserInfo>,
    private readonly configService: ConfigService,
    private readonly supabaseService: SupabaseService,
    private readonly userSyncService: UserSyncService,
  ) {
    // Supabase JWT 검증을 위한 설정
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Supabase는 자체 JWT 서명을 사용하므로 여기서는 토큰 검증을 Supabase 서비스에 위임
      secretOrKeyProvider: async (
        request: any,
        rawJwtToken: string,
        done: any,
      ) => {
        try {
          // Supabase에서 토큰 검증
          const user = await this.supabaseService.verifyToken(rawJwtToken);
          if (!user) {
            return done(
              new UnauthorizedException('유효하지 않은 토큰입니다.'),
              null,
            );
          }
          // 검증 성공 시 더미 시크릿 반환 (실제로는 Supabase에서 이미 검증됨)
          return done(null, 'dummy-secret');
        } catch (error) {
          return done(new UnauthorizedException('토큰 검증 실패'), null);
        }
      },
      passReqToCallback: true,
    });
  }

  /**
   * JWT 페이로드 검증 및 사용자 정보 로드 (업데이트됨)
   *
   * UserInfo 엔티티를 사용하여 사용자 정보를 관리하고,
   * UserSyncService를 통해 자동 동기화를 수행합니다.
   *
   * @param request Express 요청 객체
   * @param payload JWT 페이로드
   * @returns 인증된 사용자 객체 (레거시 호환성을 위해 User 타입 유지)
   */
  async validate(request: any, payload: SupabaseJwtPayload): Promise<User> {
    try {
      const userId = payload.sub;

      if (!userId) {
        throw new UnauthorizedException('토큰에 사용자 ID가 없습니다.');
      }

      // UserInfo를 통해 사용자 조회
      let userInfo = await this.userInfoRepository.findOne({
        where: { id: userId },
      });

      // 사용자가 로컬 DB에 없으면 자동 동기화
      if (!userInfo) {
        console.log(`새 사용자 자동 동기화 시작: ${userId}`);

        try {
          userInfo = await this.userSyncService.syncUser({
            userId,
            // JWT 페이로드에서 기본 정보 추출
            nickname: payload.user_metadata?.nickname,
            role: payload.user_metadata?.role as UserRole,
          });

          console.log(
            `새 사용자 동기화 완료: ${userInfo.nickname} (ID: ${userId})`,
          );
        } catch (syncError) {
          console.error(`사용자 동기화 실패: ${userId}`, syncError);
          throw new UnauthorizedException('사용자 정보 동기화에 실패했습니다.');
        }
      } else {
        // 기존 사용자의 경우 주기적 동기화 (1시간마다)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        if (userInfo.updatedAt < oneHourAgo) {
          try {
            userInfo = await this.userSyncService.syncUser({
              userId,
              nickname: payload.user_metadata?.nickname,
              role: payload.user_metadata?.role as UserRole,
            });
            console.log(
              `사용자 정보 동기화 완료: ${userInfo.nickname} (ID: ${userId})`,
            );
          } catch (syncError) {
            console.warn(
              `사용자 동기화 실패 (계속 진행): ${userId}`,
              syncError.message,
            );
            // 동기화 실패해도 기존 정보로 계속 진행
          }
        }
      }

      // 계정 활성화 상태 확인
      if (!userInfo.isActive) {
        throw new UnauthorizedException(
          '비활성화된 계정입니다. 관리자에게 문의하세요.',
        );
      }

      // 레거시 호환성을 위해 User 객체로 변환
      // TODO: 향후 모든 코드가 UserInfo를 사용하도록 마이그레이션 후 제거
      const legacyUser = await this.convertToLegacyUser(userInfo, payload);

      return legacyUser;
    } catch (error) {
      console.error('JWT 검증 중 오류:', error);

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('인증에 실패했습니다.');
    }
  }

  /**
   * UserInfo를 레거시 User 객체로 변환
   * 기존 코드와의 호환성을 위한 임시 메서드
   *
   * @param userInfo UserInfo 엔티티
   * @param payload JWT 페이로드 (이메일 정보 등)
   * @returns User 객체
   */
  private async convertToLegacyUser(
    userInfo: UserInfo,
    payload: SupabaseJwtPayload,
  ): Promise<User> {
    // 기존 User 테이블에서 조회 시도
    let legacyUser = await this.userRepository.findOne({
      where: { id: userInfo.id },
    });

    if (!legacyUser) {
      // 레거시 User 객체 생성 (필요한 경우)
      legacyUser = this.userRepository.create({
        id: userInfo.id,
        email: payload.email || '',
        nickname: userInfo.nickname,
        role: userInfo.role,
        profileImageUrl: userInfo.profileImageUrl,
        bio: userInfo.bio,
        isEmailVerified: !!payload.email, // JWT에 이메일이 있으면 인증된 것으로 간주
        isUserActive: userInfo.isActive,
        createdAt: userInfo.createdAt,
        updatedAt: userInfo.updatedAt,
      });

      try {
        legacyUser = await this.userRepository.save(legacyUser);
      } catch (error) {
        // 중복 생성 에러 무시하고 재조회
        if (error.code === '23505') {
          legacyUser = await this.userRepository.findOne({
            where: { id: userInfo.id },
          });
          if (!legacyUser) {
            throw new UnauthorizedException(
              '레거시 사용자 생성에 실패했습니다.',
            );
          }
        } else {
          throw error;
        }
      }
    }

    return legacyUser;
  }
}
