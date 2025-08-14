import { InputType, Field } from '@nestjs/graphql';
import {
  IsString,
  IsOptional,
  IsEnum,
  MinLength,
  MaxLength,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { UserRole } from '../../../entities/user.entity';

/**
 * 사용자 동기화 입력 DTO
 *
 * Supabase Auth 회원가입 후 NestJS에 사용자 정보를 동기화할 때 사용합니다.
 */
@InputType()
export class SyncUserInput {
  /**
   * 사용자 닉네임
   * 고유값이며 다른 사용자와 중복될 수 없습니다.
   */
  @Field(() => String, { description: '사용자 닉네임' })
  @IsString({ message: '닉네임은 문자열이어야 합니다.' })
  @MinLength(2, { message: '닉네임은 최소 2자 이상이어야 합니다.' })
  @MaxLength(30, { message: '닉네임은 최대 30자까지 가능합니다.' })
  nickname: string;

  /**
   * 사용자 역할 (선택사항)
   * 기본값은 USER입니다.
   */
  @Field(() => UserRole, {
    nullable: true,
    description: '사용자 역할 (기본값: USER)',
    defaultValue: UserRole.USER,
  })
  @IsOptional()
  @IsEnum(UserRole, { message: '올바른 사용자 역할을 선택해주세요.' })
  role?: UserRole;

  /**
   * 프로필 이미지 URL (선택사항)
   */
  @Field(() => String, {
    nullable: true,
    description: '프로필 이미지 URL',
  })
  @IsOptional()
  @IsString({ message: '프로필 이미지 URL은 문자열이어야 합니다.' })
  @MaxLength(500, { message: '프로필 이미지 URL은 최대 500자까지 가능합니다.' })
  profileImageUrl?: string;

  /**
   * 자기소개 (선택사항)
   */
  @Field(() => String, {
    nullable: true,
    description: '자기소개',
  })
  @IsOptional()
  @IsString({ message: '자기소개는 문자열이어야 합니다.' })
  @MaxLength(500, { message: '자기소개는 최대 500자까지 가능합니다.' })
  bio?: string;

  /**
   * 사용자 나이 (선택사항)
   */
  @Field(() => Number, {
    nullable: true,
    description: '사용자 나이',
  })
  @IsOptional()
  @IsNumber({}, { message: '나이는 숫자여야 합니다.' })
  @Min(1, { message: '나이는 1세 이상이어야 합니다.' })
  @Max(120, { message: '나이는 120세 이하여야 합니다.' })
  age?: number;
}

/**
 * 사용자 프로필 업데이트 입력 DTO
 */
@InputType()
export class UpdateUserProfileInput {
  /**
   * 사용자 닉네임 (선택사항)
   */
  @Field(() => String, {
    nullable: true,
    description: '사용자 닉네임',
  })
  @IsOptional()
  @IsString({ message: '닉네임은 문자열이어야 합니다.' })
  @MinLength(2, { message: '닉네임은 최소 2자 이상이어야 합니다.' })
  @MaxLength(30, { message: '닉네임은 최대 30자까지 가능합니다.' })
  nickname?: string;

  /**
   * 프로필 이미지 URL (선택사항)
   */
  @Field(() => String, {
    nullable: true,
    description: '프로필 이미지 URL',
  })
  @IsOptional()
  @IsString({ message: '프로필 이미지 URL은 문자열이어야 합니다.' })
  @MaxLength(500, { message: '프로필 이미지 URL은 최대 500자까지 가능합니다.' })
  profileImageUrl?: string;

  /**
   * 자기소개 (선택사항)
   */
  @Field(() => String, {
    nullable: true,
    description: '자기소개',
  })
  @IsOptional()
  @IsString({ message: '자기소개는 문자열이어야 합니다.' })
  @MaxLength(500, { message: '자기소개는 최대 500자까지 가능합니다.' })
  bio?: string;

  /**
   * 사용자 나이 (선택사항)
   */
  @Field(() => Number, {
    nullable: true,
    description: '사용자 나이',
  })
  @IsOptional()
  @IsNumber({}, { message: '나이는 숫자여야 합니다.' })
  @Min(1, { message: '나이는 1세 이상이어야 합니다.' })
  @Max(120, { message: '나이는 120세 이하여야 합니다.' })
  age?: number;
}
