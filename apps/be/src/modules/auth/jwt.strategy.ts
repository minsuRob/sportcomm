import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';

/**
 * JWT 페이로드 인터페이스
 * 토큰에 포함되는 사용자 정보를 정의합니다.
 */
export interface JwtPayload {
  /** 사용자 ID */
  sub: string;
  /** 사용자 이메일 */
  email: string;
  /** 사용자 역할 */
  role: string;
  /** 토큰 발급 시간 */
  iat: number;
  /** 토큰 만료 시간 */
  exp: number;
}

/**
 * JWT 인증 전략
 *
 * Passport JWT 전략을 구현하여 JWT 토큰을 검증하고
 * 토큰에서 사용자 정보를 추출합니다.
 *
 * 토큰 검증 과정:
 * 1. Authorization 헤더에서 Bearer 토큰 추출
 * 2. JWT 서명 검증
 * 3. 페이로드에서 사용자 ID 추출
 * 4. 데이터베이스에서 사용자 정보 조회
 * 5. 사용자 정보를 요청 컨텍스트에 주입
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {
    super({
      // JWT 토큰 추출 방식 설정
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      // 만료된 토큰 거부
      ignoreExpiration: false,

      // JWT 서명 검증을 위한 시크릿 키
      secretOrKey: configService.get<string>('JWT_SECRET') || 'fallback-secret',

      // 알고리즘 설정 (보안 강화)
      algorithms: ['HS256'],
    });
  }

  /**
   * JWT 토큰 검증 및 사용자 정보 추출
   *
   * @param payload - JWT 페이로드
   * @returns 사용자 정보 또는 null
   * @throws UnauthorizedException - 사용자를 찾을 수 없거나 비활성화된 경우
   */
  async validate(payload: JwtPayload): Promise<User> {
    try {
      // 페이로드 유효성 검사
      if (!payload || !payload.sub) {
        throw new UnauthorizedException('유효하지 않은 토큰 페이로드입니다.');
      }

      // 사용자 ID로 사용자 조회
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
        select: [
          'id',
          'email',
          'nickname',
          'role',
          'isActive',
          'isEmailVerified',
          'profileImageUrl',
          'createdAt',
          'updatedAt',
        ],
      });

      // 사용자가 존재하지 않는 경우
      if (!user) {
        throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
      }

      // 비활성화된 계정인 경우
      if (!user.isUserActive) {
        throw new UnauthorizedException(
          '비활성화된 계정입니다. 관리자에게 문의하세요.',
        );
      }

      // 이메일 인증이 필요한 경우 (필요시 활성화)
      // if (!user.isEmailVerified) {
      //   throw new UnauthorizedException('이메일 인증이 필요합니다.');
      // }

      // 토큰의 이메일과 DB의 이메일이 다른 경우 (보안 검증)
      if (payload.email !== user.email) {
        throw new UnauthorizedException('토큰 정보가 일치하지 않습니다.');
      }

      // 사용자 정보 반환 (패스워드 제외)
      return user;
    } catch (error) {
      // 로그 기록
      console.error('JWT 토큰 검증 실패:', {
        error: error.message,
        payload: payload ? { sub: payload.sub, email: payload.email } : null,
      });

      // 인증 실패 예외 발생
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('토큰 검증에 실패했습니다.');
    }
  }

  /**
   * 사용자 권한 검증
   *
   * @param user - 사용자 정보
   * @param requiredRole - 필요한 역할
   * @returns 권한 여부
   */
  static hasRole(user: User, requiredRole: string): boolean {
    return user.role === requiredRole;
  }

  /**
   * 사용자가 관리자인지 확인
   *
   * @param user - 사용자 정보
   * @returns 관리자 여부
   */
  static isAdmin(user: User): boolean {
    return user.isAdmin();
  }

  /**
   * 사용자가 인플루언서인지 확인
   *
   * @param user - 사용자 정보
   * @returns 인플루언서 여부
   */
  static isInfluencer(user: User): boolean {
    return user.isInfluencer();
  }

  /**
   * 토큰 만료 시간 확인
   *
   * @param payload - JWT 페이로드
   * @returns 만료 여부
   */
  static isTokenExpired(payload: JwtPayload): boolean {
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  }

  /**
   * 토큰 발급 시간 확인
   *
   * @param payload - JWT 페이로드
   * @returns 발급 시간 (Date 객체)
   */
  static getTokenIssuedAt(payload: JwtPayload): Date {
    return new Date(payload.iat * 1000);
  }

  /**
   * 토큰 만료 시간 확인
   *
   * @param payload - JWT 페이로드
   * @returns 만료 시간 (Date 객체)
   */
  static getTokenExpiresAt(payload: JwtPayload): Date {
    return new Date(payload.exp * 1000);
  }
}
