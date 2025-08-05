import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '../../entities/user.entity';
import { UsersService } from '../users/users.service';
import { SupabaseSyncService } from './supabase-sync.service';

/**
 * 회원가입 입력 인터페이스
 */
export interface RegisterInput {
  /** 사용자 이메일 */
  email: string;
  /** 사용자 비밀번호 */
  password: string;
  /** 사용자 닉네임 */
  nickname: string;
  /** 사용자 역할 (선택사항) */
  role?: UserRole;
}

/**
 * 로그인 입력 인터페이스
 */
export interface LoginInput {
  /** 사용자 이메일 */
  email: string;
  /** 사용자 비밀번호 */
  password: string;
}

/**
 * 인증 응답 인터페이스
 */
export interface AuthResponse {
  /** 사용자 정보 */
  user: User;
  /** 액세스 토큰 (NestJS JWT) */
  accessToken: string;
  /** 토큰 만료 시간 */
  expiresIn: string;
  /** Supabase 세션 정보 (채팅용) */
  supabaseSession?: {
    access_token: string;
    refresh_token: string;
    user: {
      id: string;
      email: string;
    };
  };
}

/**
 * 토큰 페이로드 인터페이스
 */
export interface TokenPayload {
  /** 사용자 ID */
  sub: string;
  /** 사용자 이메일 */
  email: string;
  /** 사용자 역할 */
  role: string;
}

/**
 * 인증 서비스
 *
 * 사용자 회원가입, 로그인, 토큰 생성 및 검증 등
 * 인증과 관련된 모든 비즈니스 로직을 처리합니다.
 */
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly supabaseSyncService: SupabaseSyncService,
  ) {}

  /**
   * 사용자 회원가입
   *
   * @param registerInput - 회원가입 정보
   * @returns 생성된 사용자 정보와 토큰
   * @throws ConflictException - 이미 존재하는 이메일 또는 닉네임
   */
  async register(registerInput: RegisterInput): Promise<AuthResponse> {
    const { email, password, nickname, role = UserRole.USER } = registerInput;

    // 이메일 중복 확인
    const existingUserByEmail = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUserByEmail) {
      throw new ConflictException('이미 사용 중인 이메일입니다.');
    }

    // 닉네임 중복 확인
    const existingUserByNickname = await this.userRepository.findOne({
      where: { nickname },
    });

    if (existingUserByNickname) {
      throw new ConflictException('이미 사용 중인 닉네임입니다.');
    }

    // 비밀번호 해시화
    const hashedPassword = await this.hashPassword(password);

    // 사용자 생성
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      nickname,
      role,
      isUserActive: true,
      isEmailVerified: false, // 실제 구현에서는 이메일 인증 로직 추가
    });

    // 데이터베이스에 저장
    const savedUser = await this.userRepository.save(user);

    // 비밀번호 제거
    savedUser.password = undefined;

    // 토큰 생성
    const accessToken = this.generateAccessToken(savedUser);
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '7d');

    // Supabase에 사용자 생성 및 세션 획득
    let supabaseSession = null;
    try {
      const result = await this.supabaseSyncService.createUserInSupabase(
        savedUser,
        password,
      );
      if (result) {
        supabaseSession = result.session;
      }
    } catch (error) {
      console.error('Supabase 사용자 동기화 실패:', error);
      // 실패해도 회원가입은 성공으로 처리 (로컬 DB가 우선)
    }

    return {
      user: savedUser,
      accessToken,
      expiresIn,
      supabaseSession,
    };
  }

  /**
   * 사용자 로그인
   *
   * @param loginInput - 로그인 정보
   * @returns 사용자 정보와 토큰
   * @throws UnauthorizedException - 잘못된 이메일 또는 비밀번호
   */
  async login(loginInput: LoginInput): Promise<AuthResponse> {
    const { email, password } = loginInput;

    // 이메일로 사용자 조회 (비밀번호 포함)
    const user = await this.usersService.findOneByEmail(email);

    if (!user) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 잘못되었습니다.');
    }

    // 비활성화된 계정 확인
    if (!user.isUserActive) {
      throw new UnauthorizedException(
        '비활성화된 계정입니다. 관리자에게 문의하세요.',
      );
    }

    // 비밀번호 확인
    if (!user.password) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 잘못되었습니다.');
    }
    const isPasswordValid = await this.validatePassword(
      password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 잘못되었습니다.');
    }

    // 비밀번호 제거
    user.password = undefined;

    // 토큰 생성
    const accessToken = this.generateAccessToken(user);
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '7d');

    // Supabase 세션 획득 (채팅용)
    let supabaseSession = null;
    try {
      supabaseSession = await this.supabaseSyncService.ensureSupabaseUser(
        user,
        password,
      );
    } catch (error) {
      console.error('Supabase 세션 획득 실패:', error);
      // 실패해도 로그인은 성공으로 처리 (로컬 DB가 우선)
    }

    return {
      user,
      accessToken,
      expiresIn,
      supabaseSession,
    };
  }

  /**
   * 사용자 정보 조회
   *
   * @param userId - 사용자 ID
   * @returns 사용자 정보
   * @throws UnauthorizedException - 사용자를 찾을 수 없음
   */
  async getUserById(userId: string): Promise<User> {
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
        'bio',
        'createdAt',
        'updatedAt',
      ],
    });

    if (!user) {
      throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
    }

    return user;
  }

  /**
   * 사용자 정보 조회 (이메일 기준)
   *
   * @param email - 사용자 이메일
   * @returns 사용자 정보
   */
  async getUserByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { email },
      select: [
        'id',
        'email',
        'nickname',
        'role',
        'isUserActive',
        'isEmailVerified',
        'profileImageUrl',
        'bio',
        'createdAt',
        'updatedAt',
      ],
    });
  }

  /**
   * 토큰 검증
   *
   * @param token - JWT 토큰
   * @returns 토큰 페이로드
   * @throws UnauthorizedException - 유효하지 않은 토큰
   */
  async verifyToken(token: string): Promise<TokenPayload> {
    try {
      const payload = this.jwtService.verify(token);
      return payload;
    } catch (error) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }
  }

  /**
   * 비밀번호 변경
   *
   * @param userId - 사용자 ID
   * @param currentPassword - 현재 비밀번호
   * @param newPassword - 새 비밀번호
   * @returns 성공 여부
   * @throws UnauthorizedException - 현재 비밀번호 불일치
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<boolean> {
    // 사용자 조회 (비밀번호 포함)
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'password'],
    });

    if (!user) {
      throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
    }

    // 현재 비밀번호 확인
    if (!user.password) {
      throw new UnauthorizedException('사용자 정보를 찾을 수 없습니다.');
    }
    const isCurrentPasswordValid = await this.validatePassword(
      currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('현재 비밀번호가 일치하지 않습니다.');
    }

    // 새 비밀번호 해시화
    const hashedNewPassword = await this.hashPassword(newPassword);

    // 비밀번호 업데이트
    await this.userRepository.update(userId, {
      password: hashedNewPassword,
    });

    return true;
  }

  /**
   * 사용자 프로필 업데이트
   *
   * @param userId - 사용자 ID
   * @param updateData - 업데이트할 데이터
   * @returns 업데이트된 사용자 정보
   */
  async updateProfile(
    userId: string,
    updateData: Partial<Pick<User, 'nickname' | 'bio' | 'profileImageUrl'>>,
  ): Promise<User> {
    // 닉네임 변경 시 중복 확인
    if (updateData.nickname) {
      const existingUser = await this.userRepository.findOne({
        where: { nickname: updateData.nickname },
      });

      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException('이미 사용 중인 닉네임입니다.');
      }
    }

    // 프로필 업데이트
    await this.userRepository.update(userId, updateData);

    // 업데이트된 사용자 정보 조회
    const updatedUser = await this.getUserById(userId);

    // Supabase에 변경사항 동기화 (비동기 처리)
    this.supabaseSyncService
      .updateUserInSupabase(updatedUser)
      .catch((error) => {
        console.error('Supabase 프로필 업데이트 실패:', error);
      });

    return updatedUser;
  }

  /**
   * 계정 비활성화
   *
   * @param userId - 사용자 ID
   * @returns 성공 여부
   */
  async deactivateAccount(userId: string): Promise<boolean> {
    // 로컬 DB에서 계정 비활성화
    await this.userRepository.update(userId, {
      isUserActive: false,
    });

    // Supabase에서도 비활성화 처리
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['supabaseUserId'],
    });

    if (user?.supabaseUserId) {
      this.supabaseSyncService
        .deactivateUserInSupabase(user.supabaseUserId)
        .catch((error) => {
          console.error('Supabase 계정 비활성화 실패:', error);
        });
    }

    return true;
  }

  /**
   * 이메일 인증 처리
   *
   * @param userId - 사용자 ID
   * @returns 성공 여부
   */
  async verifyEmail(userId: string): Promise<boolean> {
    await this.userRepository.update(userId, {
      isEmailVerified: true,
    });

    return true;
  }

  /**
   * 비밀번호 해시화
   *
   * @param password - 평문 비밀번호
   * @returns 해시된 비밀번호
   */
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * 비밀번호 검증
   *
   * @param password - 평문 비밀번호
   * @param hashedPassword - 해시된 비밀번호
   * @returns 일치 여부
   */
  private async validatePassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  /**
   * 액세스 토큰 생성
   *
   * @param user - 사용자 정보
   * @returns JWT 토큰
   */
  private generateAccessToken(user: User): string {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '7d'),
    });
  }

  /**
   * 사용자 통계 정보 조회
   *
   * @returns 사용자 통계
   */
  async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    verifiedUsers: number;
    usersByRole: Record<UserRole, number>;
  }> {
    const [totalUsers, activeUsers, verifiedUsers] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: { isUserActive: true } }),
      this.userRepository.count({ where: { isEmailVerified: true } }),
    ]);

    const usersByRole = await this.userRepository
      .createQueryBuilder('user')
      .select('user.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.role')
      .getRawMany();

    const roleStats = usersByRole.reduce(
      (acc, item) => {
        acc[item.role as UserRole] = parseInt(item.count, 10);
        return acc;
      },
      {} as Record<UserRole, number>,
    );

    return {
      totalUsers,
      activeUsers,
      verifiedUsers,
      usersByRole: roleStats,
    };
  }

  /**
   * 기존 사용자를 Supabase와 동기화
   * 마이그레이션 목적으로 사용
   *
   * @param userId - 사용자 ID
   * @returns 성공 여부
   */
  async syncUserWithSupabase(userId: string): Promise<boolean> {
    return await this.supabaseSyncService.syncExistingUser(userId);
  }

  /**
   * Supabase 동기화 통계 조회
   *
   * @returns 동기화 통계 정보
   */
  async getSupabaseSyncStats(): Promise<{
    totalUsers: number;
    syncedUsers: number;
    unsyncedUsers: number;
    supabaseConnected: boolean;
  }> {
    return await this.supabaseSyncService.getSyncStats();
  }

  /**
   * 모든 기존 사용자를 Supabase와 동기화
   * 관리자 전용 기능
   *
   * @returns 동기화 결과
   */
  async syncAllUsersWithSupabase(): Promise<{
    success: number;
    failed: number;
    total: number;
  }> {
    const users = await this.userRepository.find({
      where: { supabaseUserId: null as any },
      select: ['id', 'nickname'],
    });

    let success = 0;
    let failed = 0;

    for (const user of users) {
      try {
        const result = await this.supabaseSyncService.syncExistingUser(user.id);
        if (result) {
          success++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`사용자 ${user.nickname} 동기화 실패:`, error);
        failed++;
      }

      // 과부하 방지를 위한 지연
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return {
      success,
      failed,
      total: users.length,
    };
  }
}
