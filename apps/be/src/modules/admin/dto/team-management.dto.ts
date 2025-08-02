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

/**
 * 팀 카테고리 열거형
 */
export enum TeamCategory {
  SOCCER = 'SOCCER',
  BASEBALL = 'BASEBALL',
  ESPORTS = 'ESPORTS',
  BASKETBALL = 'BASKETBALL',
  VOLLEYBALL = 'VOLLEYBALL',
}

// GraphQL 스키마에 TeamCategory enum 등록
registerEnumType(TeamCategory, {
  name: 'TeamCategory',
  description: '팀 카테고리',
  valuesMap: {
    SOCCER: { description: '축구' },
    BASEBALL: { description: '야구' },
    ESPORTS: { description: 'e스포츠' },
    BASKETBALL: { description: '농구' },
    VOLLEYBALL: { description: '배구' },
  },
});

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

  @Field(() => TeamCategory, { description: '팀 카테고리' })
  category: TeamCategory;

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
  @Field(() => String, { description: '팀 ID (고유 식별자)' })
  @IsString({ message: '팀 ID는 문자열이어야 합니다.' })
  @MinLength(2, { message: '팀 ID는 최소 2자 이상이어야 합니다.' })
  @MaxLength(50, { message: '팀 ID는 최대 50자까지 가능합니다.' })
  id: string;

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

  @Field(() => TeamCategory, { description: '팀 카테고리' })
  @IsEnum(TeamCategory, { message: '올바른 팀 카테고리를 선택해주세요.' })
  category: TeamCategory;
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

  @Field(() => TeamCategory, { nullable: true, description: '팀 카테고리' })
  @IsOptional()
  @IsEnum(TeamCategory, { message: '올바른 팀 카테고리를 선택해주세요.' })
  category?: TeamCategory;

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
