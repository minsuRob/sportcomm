import { InputType, Field } from '@nestjs/graphql';
import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsNumber,
  IsBoolean,
} from 'class-validator';

/**
 * 스포츠 생성 입력 DTO
 */
@InputType()
export class CreateSportInput {
  /**
   * 스포츠 이름
   */
  @Field(() => String, { description: '스포츠 이름' })
  @IsString({ message: '스포츠 이름은 문자열이어야 합니다.' })
  @MinLength(2, { message: '스포츠 이름은 최소 2자 이상이어야 합니다.' })
  @MaxLength(50, { message: '스포츠 이름은 최대 50자까지 가능합니다.' })
  name: string;

  /**
   * 스포츠 아이콘 (이모지)
   */
  @Field(() => String, { description: '스포츠 아이콘' })
  @IsString({ message: '스포츠 아이콘은 문자열이어야 합니다.' })
  @MaxLength(10, { message: '스포츠 아이콘은 최대 10자까지 가능합니다.' })
  icon: string;

  /**
   * 스포츠 설명 (선택사항)
   */
  @Field(() => String, { nullable: true, description: '스포츠 설명' })
  @IsOptional()
  @IsString({ message: '스포츠 설명은 문자열이어야 합니다.' })
  @MaxLength(500, { message: '스포츠 설명은 최대 500자까지 가능합니다.' })
  description?: string;

  /**
   * 기본 팀 이름 (선택사항)
   * 스포츠 생성 시 함께 생성할 기본 팀의 이름
   */
  @Field(() => String, { nullable: true, description: '기본 팀 이름' })
  @IsOptional()
  @IsString({ message: '기본 팀 이름은 문자열이어야 합니다.' })
  @MinLength(2, { message: '기본 팀 이름은 최소 2자 이상이어야 합니다.' })
  @MaxLength(50, { message: '기본 팀 이름은 최대 50자까지 가능합니다.' })
  defaultTeamName?: string;
}

/**
 * 스포츠 업데이트 입력 DTO
 */
@InputType()
export class UpdateSportInput {
  /**
   * 스포츠 이름 (선택사항)
   */
  @Field(() => String, { nullable: true, description: '스포츠 이름' })
  @IsOptional()
  @IsString({ message: '스포츠 이름은 문자열이어야 합니다.' })
  @MinLength(2, { message: '스포츠 이름은 최소 2자 이상이어야 합니다.' })
  @MaxLength(50, { message: '스포츠 이름은 최대 50자까지 가능합니다.' })
  name?: string;

  /**
   * 스포츠 아이콘 (선택사항)
   */
  @Field(() => String, { nullable: true, description: '스포츠 아이콘' })
  @IsOptional()
  @IsString({ message: '스포츠 아이콘은 문자열이어야 합니다.' })
  @MaxLength(10, { message: '스포츠 아이콘은 최대 10자까지 가능합니다.' })
  icon?: string;

  /**
   * 스포츠 설명 (선택사항)
   */
  @Field(() => String, { nullable: true, description: '스포츠 설명' })
  @IsOptional()
  @IsString({ message: '스포츠 설명은 문자열이어야 합니다.' })
  @MaxLength(500, { message: '스포츠 설명은 최대 500자까지 가능합니다.' })
  description?: string;

  /**
   * 정렬 순서 (선택사항)
   */
  @Field(() => Number, { nullable: true, description: '정렬 순서' })
  @IsOptional()
  @IsNumber({}, { message: '정렬 순서는 숫자여야 합니다.' })
  sortOrder?: number;

  /**
   * 활성화 여부 (선택사항)
   */
  @Field(() => Boolean, { nullable: true, description: '활성화 여부' })
  @IsOptional()
  @IsBoolean({ message: '활성화 여부는 불린값이어야 합니다.' })
  isActive?: boolean;
}
