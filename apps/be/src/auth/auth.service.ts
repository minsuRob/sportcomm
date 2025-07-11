import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';

/**
 * @description 인증 관련 비즈니스 로직(사용자 검증, JWT 생성)을 처리하는 서비스 클래스입니다.
 * @summary LocalStrategy와 AuthResolver에서 사용됩니다.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * @description 이메일과 비밀번호를 사용하여 사용자를 검증합니다.
   * @summary LocalStrategy에 의해 호출됩니다.
   * @param email - 사용자가 입력한 이메일.
   * @param pass - 사용자가 입력한 비밀번호.
   * @returns 사용자가 유효하면 비밀번호 필드를 제외한 사용자 객체를 반환하고, 그렇지 않으면 null을 반환합니다.
   */
  async validateUser(
    email: string,
    pass: string,
  ): Promise<Omit<User, 'passwordHash'> | null> {
    // UsersService에서 passwordHash를 명시적으로 포함하여 사용자 정보를 가져옵니다.
    const user = await this.usersService.findOneByEmail(email);

    // 사용자가 존재하고, 제공된 비밀번호가 DB의 해시된 비밀번호와 일치하는지 확인합니다.
    if (user && (await bcrypt.compare(pass, user.passwordHash))) {
      // 비밀번호는 절대 반환하면 안 되므로, 응답 객체에서 제외합니다.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash, ...result } = user;
      return result;
    }

    // 사용자가 없거나 비밀번호가 틀리면 null을 반환합니다.
    return null;
  }

  /**
   * @description 로그인 성공 후 JWT 액세스 토큰을 생성합니다.
   * @param user - `validateUser`를 통과한, 비밀번호가 제외된 사용자 객체.
   * @returns 서명된 JWT 액세스 토큰을 포함한 객체.
   */
  async login(
    user: Omit<User, 'passwordHash'>,
  ): Promise<{ access_token: string }> {
    // JWT 페이로드에 포함시킬 정보를 정의합니다.
    // 민감한 정보는 페이로드에 포함하지 않도록 주의해야 합니다.
    const payload = { username: user.nickname, sub: user.id, role: user.role };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
