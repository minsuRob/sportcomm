import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

/**
 * @description JWT(JSON Web Token)를 검증하기 위한 Passport 전략입니다.
 * @summary 이 전략은 클라이언트 요청의 Authorization 헤더에 포함된 Bearer 토큰을 추출하고,
 * `secretOrKey`를 사용해 서명이 유효한지, 토큰이 만료되지 않았는지 확인합니다.
 * 토큰이 성공적으로 검증되면, `validate` 메소드가 호출됩니다.
 *
 * 이 클래스는 `JwtAuthGuard`에 의해 사용됩니다.
 *
 * @see JwtAuthGuard - 이 전략을 사용하는 인증 가드입니다.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  /**
   * @param configService - 환경 변수 접근을 위한 ConfigService
   */
  constructor(private readonly configService: ConfigService) {
    super({
      // 1. 토큰 추출 방법 설정: Authorization 헤더에서 Bearer 토큰을 추출합니다.
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // 2. 만료된 토큰 거부: false로 설정하면 Passport는 만료된 토큰을 자동으로 거부합니다.
      ignoreExpiration: false,
      // 3. JWT 서명에 사용할 비밀 키 설정: 환경 변수에서 가져옵니다.
      //    .env 파일에 JWT_SECRET을 추가해야 합니다.
      //    환경 변수가 없을 경우를 대비하여 기본값을 제공하여 undefined 오류를 방지합니다.
      secretOrKey: configService.get<string>(
        'JWT_SECRET',
        'default-secret-key-for-dev', // 실제 프로덕션에서는 반드시 .env에 설정해야 합니다.
      ),
    });
  }

  /**
   * @description JWT 검증이 성공한 후 호출되는 메소드입니다.
   * @summary Passport는 토큰을 검증한 후, 토큰의 페이로드(payload)를 이 메소드의 인자로 전달합니다.
   * 이 메소드에서 반환된 값은 요청(request) 객체의 `user` 속성에 저장됩니다.
   *
   * @param payload - JWT에 담겨있던 페이로드. `auth.service.ts`의 `login` 메소드에서 생성한 객체입니다.
   * @returns GraphQL 컨텍스트의 `req.user`에 저장될 사용자 정보 객체.
   *
   * @example
   * // payload의 예시: { "username": "testuser", "sub": "some-uuid", "role": "USER", "iat": 1616430939, "exp": 1616434539 }
   * // 반환 값: { "id": "some-uuid", "nickname": "testuser", "role": "USER" }
   */
  async validate(payload: {
    sub: string;
    username: string;
    role: string;
  }): Promise<{ id: string; nickname: string; role: string }> {
    // 여기서는 페이로드에 있는 정보를 그대로 반환합니다.
    // 필요에 따라 이 단계에서 DB를 조회하여 추가적인 사용자 정보를 가져오거나,
    // 사용자가 비활성화되었는지 등을 확인할 수도 있습니다.
    return { id: payload.sub, nickname: payload.username, role: payload.role };
  }
}
