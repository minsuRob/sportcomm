import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { CreateUserInput } from './dto/create-user.input';

/**
 * @description 사용자 데이터와 관련된 비즈니스 로직을 처리하는 서비스 클래스입니다.
 * @summary 데이터베이스와의 상호작용(생성, 조회 등)을 담당하며, UsersResolver에 의해 호출됩니다.
 */
@Injectable()
export class UsersService {
  /**
   * @param userRepository TypeORM의 User 리포지토리. 생성자 주입을 통해 NestJS DI 컨테이너로부터 인스턴스를 받습니다.
   */
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * @description 새로운 사용자를 생성하고 데이터베이스에 저장합니다.
   * @summary 비밀번호를 해싱하고, 이메일 또는 닉네임 중복을 확인합니다.
   * @param createUserInput - 사용자 생성을 위한 데이터 (nickname, email, password).
   * @returns 생성된 사용자 객체 (비밀번호 제외).
   * @throws {ConflictException} - 동일한 이메일 또는 닉네임의 사용자가 이미 존재할 경우 발생합니다.
   */
  async create(
    createUserInput: CreateUserInput,
  ): Promise<Omit<User, 'passwordHash'>> {
    const { email, nickname, password } = createUserInput;

    // 이메일 또는 닉네임 중복 확인
    const existingUser = await this.userRepository.findOne({
      where: [{ email }, { nickname }],
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new ConflictException('이미 사용 중인 이메일입니다.');
      }
      if (existingUser.nickname === nickname) {
        throw new ConflictException('이미 사용 중인 닉네임입니다.');
      }
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10); // salt rounds: 10

    // 새로운 사용자 엔티티 생성
    const newUser = this.userRepository.create({
      nickname,
      email,
      passwordHash: hashedPassword, // 'password' 대신 'passwordHash' 사용
    });

    // 데이터베이스에 저장
    const savedUser = await this.userRepository.save(newUser);

    // 보안을 위해 비밀번호 필드를 제거하고 반환
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...result } = savedUser;
    return result;
  }

  /**
   * @description ID를 기준으로 특정 사용자 한 명을 조회합니다.
   * @param id - 조회할 사용자의 UUID.
   * @returns 조회된 사용자 객체.
   * @throws {NotFoundException} - 해당 ID의 사용자를 찾을 수 없을 경우 발생합니다.
   */
  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`ID가 "${id}"인 사용자를 찾을 수 없습니다.`);
    }
    return user;
  }

  /**
   * @description 이메일을 기준으로 특정 사용자 한 명을 조회합니다. (인증 과정에서 사용)
   * @summary 이 메소드는 AuthService의 `validateUser`에서 호출되며, 비밀번호 필드를 포함하여 사용자 정보를 반환해야 합니다.
   * @param email - 조회할 사용자의 이메일.
   * @returns 조회된 사용자 객체 (비밀번호 포함) 또는 null.
   */
  async findOneByEmail(email: string): Promise<User | null> {
    // `passwordHash` 필드를 명시적으로 선택합니다.
    return this.userRepository
      .createQueryBuilder('user')
      .where('user.email = :email', { email })
      .addSelect('user.passwordHash')
      .getOne();
  }
}
