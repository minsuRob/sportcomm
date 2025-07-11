import { Resolver, Mutation, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ObjectType, Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsEnum } from 'class-validator';
import { AuthService, AuthResponse } from './auth.service';
import { User, UserRole } from '../../entities/user.entity';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/**
 * 회원가입 입력 타입
 */
@InputType()
export class RegisterInput {
  @Field(() => String, { description: '이메일 주소' })
  @IsEmail({}, { message: '올바른 이메일 형식을 입력해주세요.' })
  email: string;

  @Field(() => String, { description: '비밀번호 (최소 8자)' })
  @IsString({ message: '비밀번호는 문자열이어야 합니다.' })
  @MinLength(8, { message: '비밀번호는 최소 8자 이상이어야 합니다.' })
  @MaxLength(100, { message: '비밀번호는 최대 100자까지 가능합니다.' })
  password: string;

  @Field(() => String, { description: '닉네임 (2-30자)' })
  @IsString({ message: '닉네임은 문자열이어야 합니다.' })
  @MinLength(2, { message: '닉네임은 최소 2자 이상이어야 합니다.' })
  @MaxLength(30, { message: '닉네임은 최대 30자까지 가능합니다.' })
  nickname: string;

  @Field(() => UserRole, {
    nullable: true,
    description: '사용자 역할 (기본값: USER)',
    defaultValue: UserRole.USER
  })
  @IsOptional()
  @IsEnum(UserRole, { message: '올바른 사용자 역할을 선택해주세요.' })
  role?: UserRole;
}

/**
 * 로그인 입력 타입
 */
@InputType()
export class LoginInput {
  @Field(() => String, { description: '이메일 주소' })
  @IsEmail({}, { message: '올바른 이메일 형식을 입력해주세요.' })
  email: string;

  @Field(() => String, { description: '비밀번호' })
  @IsString({ message: '비밀번호는 문자열이어야 합니다.' })
  @MinLength(1, { message: '비밀번호를 입력해주세요.' })
  password: string;
}

/**
 * 비밀번호 변경 입력 타입
 */
@InputType()
export class ChangePasswordInput {
  @Field(() => String, { description: '현재 비밀번호' })
  @IsString({ message: '현재 비밀번호는 문자열이어야 합니다.' })
  @MinLength(1, { message: '현재 비밀번호를 입력해주세요.' })
  currentPassword: string;

  @Field(() => String, { description: '새 비밀번호 (최소 8자)' })
  @IsString({ message: '새 비밀번호는 문자열이어야 합니다.' })
  @MinLength(8, { message: '새 비밀번호는 최소 8자 이상이어야 합니다.' })
  @MaxLength(100, { message: '새 비밀번호는 최대 100자까지 가능합니다.' })
  newPassword: string;
}

/**
 * 프로필 업데이트 입력 타입
 */
@InputType()
export class UpdateProfileInput {
  @Field(() => String, { nullable: true, description: '닉네임 (2-30자)' })
  @IsOptional()
  @IsString({ message: '닉네임은 문자열이어야 합니다.' })
  @MinLength(2, { message: '닉네임은 최소 2자 이상이어야 합니다.' })
  @MaxLength(30, { message: '닉네임은 최대 30자까지 가능합니다.' })
  nickname?: string;

  @Field(() => String, { nullable: true, description: '자기소개 (최대 500자)' })
  @IsOptional()
  @IsString({ message: '자기소개는 문자열이어야 합니다.' })
  @MaxLength(500, { message: '자기소개는 최대 500자까지 가능합니다.' })
  bio?: string;

  @Field(() => String, { nullable: true, description: '프로필 이미지 URL' })
  @IsOptional()
  @IsString({ message: '프로필 이미지 URL은 문자열이어야 합니다.' })
  @MaxLength(500, { message: '프로필 이미지 URL은 최대 500자까지 가능합니다.' })
  profileImageUrl?: string;
}

/**
 * 인증 응답 타입
 */
@ObjectType()
export class AuthResponseType {
  @Field(() => User, { description: '사용자 정보' })
  user: User;

  @Field(() => String, { description: '액세스 토큰' })
  accessToken: string;

  @Field(() => String, { description: '토큰 만료 시간' })
  expiresIn: string;
}

/**
 * 사용자 통계 타입
 */
@ObjectType()
export class UserStatsType {
  @Field(() => Number, { description: '전체 사용자 수' })
  totalUsers: number;

  @Field(() => Number, { description: '활성 사용자 수' })
  activeUsers: number;

  @Field(() => Number, { description: '이메일 인증 완료 사용자 수' })
  verifiedUsers: number;

  @Field(() => Number, { description: '일반 사용자 수' })
  userCount: number;

  @Field(() => Number, { description: '인플루언서 수' })
  influencerCount: number;

  @Field(() => Number, { description: '관리자 수' })
  adminCount: number;
}

/**
 * 인증 리졸버
 *
 * 사용자 인증과 관련된 모든 GraphQL 뮤테이션과 쿼리를 처리합니다.
 * 회원가입, 로그인, 프로필 관리, 비밀번호 변경 등의 기능을 제공합니다.
 */
@Resolver(() => User)
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  /**
   * 회원가입
   *
   * @param registerInput - 회원가입 정보
   * @returns 생성된 사용자 정보와 토큰
   */
  @Mutation(() => AuthResponseType, { description: '회원가입' })
  async register(
    @Args('input') registerInput: RegisterInput,
  ): Promise<AuthResponseType> {
    const result = await this.authService.register(registerInput);
    return {
      user: result.user,
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
    };
  }

  /**
   * 로그인
   *
   * @param loginInput - 로그인 정보
   * @returns 사용자 정보와 토큰
   */
  @Mutation(() => AuthResponseType, { description: '로그인' })
  async login(
    @Args('input') loginInput: LoginInput,
  ): Promise<AuthResponseType> {
    const result = await this.authService.login(loginInput);
    return {
      user: result.user,
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
    };
  }

  /**
   * 현재 사용자 정보 조회
   *
   * @param user - 현재 인증된 사용자
   * @returns 사용자 정보
   */
  @UseGuards(GqlAuthGuard)
  @Query(() => User, { description: '현재 사용자 정보 조회' })
  async me(@CurrentUser() user: User): Promise<User> {
    return await this.authService.getUserById(user.id);
  }

  /**
   * 비밀번호 변경
   *
   * @param user - 현재 인증된 사용자
   * @param changePasswordInput - 비밀번호 변경 정보
   * @returns 성공 여부
   */
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean, { description: '비밀번호 변경' })
  async changePassword(
    @CurrentUser() user: User,
    @Args('input') changePasswordInput: ChangePasswordInput,
  ): Promise<boolean> {
    return await this.authService.changePassword(
      user.id,
      changePasswordInput.currentPassword,
      changePasswordInput.newPassword,
    );
  }

  /**
   * 프로필 업데이트
   *
   * @param user - 현재 인증된 사용자
   * @param updateProfileInput - 프로필 업데이트 정보
   * @returns 업데이트된 사용자 정보
   */
  @UseGuards(GqlAuthGuard)
  @Mutation(() => User, { description: '프로필 업데이트' })
  async updateProfile(
    @CurrentUser() user: User,
    @Args('input') updateProfileInput: UpdateProfileInput,
  ): Promise<User> {
    return await this.authService.updateProfile(user.id, updateProfileInput);
  }

  /**
   * 계정 비활성화
   *
   * @param user - 현재 인증된 사용자
   * @returns 성공 여부
   */
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean, { description: '계정 비활성화' })
  async deactivateAccount(@CurrentUser() user: User): Promise<boolean> {
    return await this.authService.deactivateAccount(user.id);
  }

  /**
   * 이메일 인증 처리
   *
   * @param user - 현재 인증된 사용자
   * @returns 성공 여부
   */
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean, { description: '이메일 인증 처리' })
  async verifyEmail(@CurrentUser() user: User): Promise<boolean> {
    return await this.authService.verifyEmail(user.id);
  }

  /**
   * 사용자 통계 조회 (관리자 전용)
   *
   * @param user - 현재 인증된 사용자
   * @returns 사용자 통계 정보
   */
  @UseGuards(GqlAuthGuard)
  @Query(() => UserStatsType, { description: '사용자 통계 조회 (관리자 전용)' })
  async getUserStats(@CurrentUser() user: User): Promise<UserStatsType> {
    // 관리자 권한 확인
    if (!user.isAdmin()) {
      throw new Error('관리자만 접근할 수 있습니다.');
    }

    const stats = await this.authService.getUserStats();
    return {
      totalUsers: stats.totalUsers,
      activeUsers: stats.activeUsers,
      verifiedUsers: stats.verifiedUsers,
      userCount: stats.usersByRole[UserRole.USER] || 0,
      influencerCount: stats.usersByRole[UserRole.INFLUENCER] || 0,
      adminCount: stats.usersByRole[UserRole.ADMIN] || 0,
    };
  }

  /**
   * 토큰 검증
   *
   * @param token - JWT 토큰
   * @returns 토큰이 유효한지 여부
   */
  @Query(() => Boolean, { description: '토큰 검증' })
  async verifyToken(@Args('token') token: string): Promise<boolean> {
    try {
      await this.authService.verifyToken(token);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 사용자 검색 (닉네임 기준)
   *
   * @param nickname - 검색할 닉네임
   * @returns 사용자 목록
   */
  @Query(() => [User], { description: '사용자 검색 (닉네임 기준)' })
  async searchUsers(
    @Args('nickname') nickname: string,
  ): Promise<User[]> {
    // 실제 구현에서는 AuthService에 검색 메서드를 추가해야 합니다.
    // 현재는 빈 배열을 반환합니다.
    return [];
  }

  /**
   * 사용자 상세 정보 조회
   *
   * @param userId - 사용자 ID
   * @returns 사용자 정보
   */
  @Query(() => User, { description: '사용자 상세 정보 조회' })
  async getUserById(@Args('userId') userId: string): Promise<User> {
    return await this.authService.getUserById(userId);
  }

  /**
   * 로그아웃
   *
   * 클라이언트 측에서 토큰을 제거하면 되므로
   * 서버에서는 단순히 성공 응답만 반환합니다.
   *
   * @returns 성공 여부
   */
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean, { description: '로그아웃' })
  async logout(): Promise<boolean> {
    // 실제 구현에서는 토큰 블랙리스트 등을 구현할 수 있습니다.
    // 현재는 단순히 true를 반환합니다.
    return true;
  }
}
