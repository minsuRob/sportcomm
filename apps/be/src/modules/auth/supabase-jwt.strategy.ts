import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../../entities/user.entity';
import { SupabaseService } from '../../common/services/supabase.service';

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
 * Supabase JWT 인증 전략
 * 
 * Supabase에서 발급한 JWT 토큰을 검증하고 사용자 정보를 로드합니다.
 * 클라이언트가 Supabase Auth로 로그인 후 받은 JWT를 사용해 API에 접근할 때 사용됩니다.
 */
@Injectable()
export class SupabaseJwtStrategy extends PassportStrategy(Strategy, 'supabase-jwt') {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly supabaseService: SupabaseService,
  ) {
    // Supabase JWT 검증을 위한 설정
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Supabase는 자체 JWT 서명을 사용하므로 여기서는 토큰 검증을 Supabase 서비스에 위임
      secretOrKeyProvider: async (request: any, rawJwtToken: string, done: any) => {
        try {
          // Supabase에서 토큰 검증
          const user = await this.supabaseService.verifyToken(rawJwtToken);
          if (!user) {
            return done(new UnauthorizedException('유효하지 않은 토큰입니다.'), null);
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
   * JWT 페이로드 검증 및 사용자 정보 로드
   * 
   * @param request Express 요청 객체
   * @param payload JWT 페이로드
   * @returns 인증된 사용자 객체
   */
  async validate(request: any, payload: SupabaseJwtPayload): Promise<User> {
    try {
      const userId = payload.sub;
      
      if (!userId) {
        throw new UnauthorizedException('토큰에 사용자 ID가 없습니다.');
      }

      // TypeORM을 통해 사용자 조회 (캐싱 및 추가 정보 포함)
      let user = await this.userRepository.findOne({
        where: { id: userId },
      });

      // 사용자가 로컬 DB에 없으면 Supabase에서 가져와서 생성
      if (!user) {
        const supabaseUser = await this.supabaseService.getUserMetadata(userId);
        
        if (!supabaseUser) {
          throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
        }

        // 새 사용자 생성
        user = this.userRepository.create({
          id: userId,
          email: supabaseUser.email || '',
          nickname: supabaseUser.user_metadata?.nickname || 
                    supabaseUser.user_metadata?.full_name || 
                    supabaseUser.email?.split('@')[0] || 
                    '익명',
          profileImageUrl: supabaseUser.user_metadata?.avatar_url,
          role: supabaseUser.user_metadata?.role || UserRole.USER,
          bio: supabaseUser.user_metadata?.bio,
          isEmailVerified: supabaseUser.email_confirmed_at ? true : false,
          isUserActive: true,
        });

        try {
          user = await this.userRepository.save(user);
          console.log(`새 사용자 생성: ${user.email} (ID: ${userId})`);
        } catch (error) {
          // 동시 요청으로 인한 중복 생성 에러 무시하고 재조회
          if (error.code === '23505') { // unique constraint violation
            user = await this.userRepository.findOne({
              where: { id: userId },
            });
            if (!user) {
              throw new UnauthorizedException('사용자 생성에 실패했습니다.');
            }
          } else {
            throw error;
          }
        }
      }

      // 사용자 메타데이터가 변경되었을 수 있으므로 주기적으로 동기화
      // (성능을 위해 마지막 업데이트로부터 1시간 이상 경과한 경우만)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (user.updatedAt < oneHourAgo) {
        const supabaseUser = await this.supabaseService.getUserMetadata(userId);
        if (supabaseUser) {
          // 필요한 경우 사용자 정보 업데이트
          const needsUpdate = 
            user.email !== supabaseUser.email ||
            user.role !== (supabaseUser.user_metadata?.role || UserRole.USER);

          if (needsUpdate) {
            user.email = supabaseUser.email || user.email;
            user.role = supabaseUser.user_metadata?.role || UserRole.USER;
            user.updatedAt = new Date();
            await this.userRepository.save(user);
            console.log(`사용자 정보 동기화: ${user.email} (ID: ${userId})`);
          }
        }
      }

      return user;
    } catch (error) {
      console.error('JWT 검증 중 오류:', error);
      
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      throw new UnauthorizedException('인증에 실패했습니다.');
    }
  }
}
