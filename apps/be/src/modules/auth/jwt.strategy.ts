import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';

export interface JwtPayload {
  sub?: string;
  memberId?: number;
  email?: string;
  role?: string;
  iat: number;
  exp: number;
}

/**
 * JWT 인증 전략 (localhost용 간소화 버전)
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {
    const jwtSecret =
      configService.get<string>('JWT_SECRET') || 'fallback-secret';

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
      algorithms: ['HS256'],
    });
  }

  async validate(payload: any): Promise<User> {
    try {
      // 토큰 만료 확인
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        throw new UnauthorizedException(
          '토큰이 만료되었습니다. 다시 로그인해주세요.',
        );
      }

      // 사용자 ID 추출 (새 형식과 기존 형식 모두 지원)
      let userId: string;
      if (payload.sub) {
        userId = payload.sub;
      } else if (payload.memberId) {
        throw new UnauthorizedException(
          '호환되지 않는 토큰 형식입니다. 다시 로그인해주세요.',
        );
      } else {
        throw new UnauthorizedException('유효하지 않은 토큰 페이로드입니다.');
      }

      // 사용자 조회
      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: [
          'id',
          'email',
          'nickname',
          'role',
          'isUserActive',
          'isEmailVerified',
          'profileImageUrl',
          'createdAt',
          'updatedAt',
        ],
      });

      if (!user) {
        throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
      }

      if (!user.isUserActive) {
        throw new UnauthorizedException(
          '비활성화된 계정입니다. 관리자에게 문의하세요.',
        );
      }

      // 토큰의 이메일과 DB의 이메일 검증 (새 토큰만)
      if (payload.email && payload.email !== user.email) {
        throw new UnauthorizedException('토큰 정보가 일치하지 않습니다.');
      }

      return user;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('토큰 검증에 실패했습니다.');
    }
  }
}
