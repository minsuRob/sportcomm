import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { User } from '../../users/user.entity';

/**
 * @description 이메일과 비밀번호를 사용한 로컬 인증을 위한 Passport 전략입니다.
 * @summary 이 전략은 클라이언트가 제공한 이메일과 비밀번호를 사용하여 사용자를 인증합니다.
 * `GqlAuthGuard`에 의해 트리거되며, 주로 로그인(login) 뮤테이션에서 사용됩니다.
 *
 * `usernameField` 옵션을 'email'로 설정하여, Passport가 기본 'username' 필드 대신
 * 'email' 필드를 사용하여 자격 증명을 찾도록 구성합니다.
 *
 * @see GqlAuthGuard - 이 전략을 사용하는 인증 가드입니다.
 * @see AuthService.validateUser - 실제 사용자 검증 로직을 담당하는 서비스 메소드입니다.
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  /**
   * @param authService - 사용자 검증 로직을 담고 있는 AuthService
   */
  constructor(private readonly authService: AuthService) {
    super({
      // 클라이언트에서 'username' 대신 'email' 필드로 사용자 ID를 보낼 것이므로,
      // 해당 필드명을 명시적으로 설정해줍니다.
      usernameField: 'email',
    });
  }

  /**
   * @description 사용자의 이메일과 비밀번호를 검증합니다.
   * @summary Passport는 `GqlAuthGuard`로부터 전달받은 요청 본문에서
   * `usernameField`('email')와 'password' 필드를 자동으로 추출하여 이 메소드에 전달합니다.
   *
   * @param email - 사용자가 입력한 이메일
   * @param password - 사용자가 입력한 비밀번호
   * @returns 검증에 성공하면 비밀번호 해시가 제외된 사용자 객체를 반환합니다. 이 객체는 요청(request) 객체의 `user` 속성에 저장됩니다.
   * @throws {UnauthorizedException} - 검증에 실패하면 인증되지 않았음을 알리는 예외를 발생시킵니다.
   */
  async validate(
    email: string,
    password: string,
  ): Promise<Omit<User, 'passwordHash'>> {
    // AuthService를 통해 사용자가 유효한지 확인합니다.
    const user = await this.authService.validateUser(email, password);

    // 사용자가 없거나 비밀번호가 일치하지 않으면 예외를 던집니다.
    // authService.validateUser가 null을 반환하면 이 조건이 참이 됩니다.
    if (!user) {
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      );
    }

    // 인증에 성공하면 passwordHash가 제외된 사용자 정보를 반환합니다.
    // 이 반환값은 NestJS의 Passport 모듈에 의해 `request.user`에 자동으로 첨부됩니다.
    return user;
  }
}
