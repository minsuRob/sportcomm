import {
  InputType,
  Field,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import {
  IsString,
  IsOptional,
  MaxLength,
  MinLength,
  IsEnum,
} from 'class-validator';

import { Sport } from '../../../entities/sport.entity';

/**
 * 팀 정보 타입
 */
@ObjectType()
export class TeamInfo {
  @Field(() => String, { description: '팀 ID' })
  id: string;

  @Field(() => String, { description: '팀 이름' })
  name: string;

  @Field(() => String, { description: '팀 색상' })
  color: string;

  @Field(() => String, { description: '팀 아이콘' })
  icon: string;

  @Field(() => Sport, { description: '소속 스포츠' })
  sport: Sport;

  @Field(() => Boolean, { description: '활성화 상태' })
  isActive: boolean;

  @Field(() => Date, { description: '생성일' })
  createdAt: Date;

  @Field(() => Date, { description: '수정일' })
  updatedAt: Date;
}

/**
 * 팀 생성 입력
 */
@InputType()
export class CreateTeamInput {
  @Field(() => String, { description: '팀 이름' })
  @IsString({ message: '팀 이름은 문자열이어야 합니다.' })
  @MinLength(1, { message: '팀 이름은 최소 1자 이상이어야 합니다.' })
  @MaxLength(100, { message: '팀 이름은 최대 100자까지 가능합니다.' })
  name: string;

  @Field(() => String, { description: '팀 색상 (HEX 코드)' })
  @IsString({ message: '팀 색상은 문자열이어야 합니다.' })
  color: string;

  @Field(() => String, { description: '팀 아이콘 (이모지)' })
  @IsString({ message: '팀 아이콘은 문자열이어야 합니다.' })
  icon: string;

  @Field(() => String, { description: '스포츠 ID' })
  @IsString({ message: '스포츠 ID는 문자열이어야 합니다.' })
  sportId: string;
}

/**
 * 팀 수정 입력
 */
@InputType()
export class UpdateTeamInput {
  @Field(() => String, { nullable: true, description: '팀 이름' })
  @IsOptional()
  @IsString({ message: '팀 이름은 문자열이어야 합니다.' })
  @MinLength(1, { message: '팀 이름은 최소 1자 이상이어야 합니다.' })
  @MaxLength(100, { message: '팀 이름은 최대 100자까지 가능합니다.' })
  name?: string;

  @Field(() => String, { nullable: true, description: '팀 색상 (HEX 코드)' })
  @IsOptional()
  @IsString({ message: '팀 색상은 문자열이어야 합니다.' })
  color?: string;

  @Field(() => String, { nullable: true, description: '팀 아이콘 (이모지)' })
  @IsOptional()
  @IsString({ message: '팀 아이콘은 문자열이어야 합니다.' })
  icon?: string;

  @Field(() => String, { nullable: true, description: '팀 로고 URL' })
  @IsOptional()
  @IsString({ message: '팀 로고 URL은 문자열이어야 합니다.' })
  logoUrl?: string;

  @Field(() => String, { nullable: true, description: '스포츠 ID' })
  @IsOptional()
  @IsString({ message: '스포츠 ID는 문자열이어야 합니다.' })
  sportId?: string;

  @Field(() => Boolean, { nullable: true, description: '활성화 상태' })
  @IsOptional()
  isActive?: boolean;
}

/**
 * 스포츠 카테고리 정보
 */
@ObjectType()
export class SportCategoryInfo {
  @Field(() => String, { description: '카테고리 ID' })
  id: string;

  @Field(() => String, { description: '카테고리 이름' })
  name: string;

  @Field(() => String, { description: '카테고리 아이콘' })
  icon: string;

  @Field(() => [TeamInfo], { description: '카테고리에 속한 팀 목록' })
  teams: TeamInfo[];
}

/**
 * 팀 관리 응답
 */
@ObjectType()
export class TeamManagementResponse {
  @Field(() => Boolean, { description: '성공 여부' })
  success: boolean;

  @Field(() => String, { nullable: true, description: '메시지' })
  message?: string;

  @Field(() => TeamInfo, { nullable: true, description: '팀 정보' })
  team?: TeamInfo;
}
