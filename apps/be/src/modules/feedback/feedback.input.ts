import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsEnum, MaxLength, IsOptional } from 'class-validator';
import { FeedbackType } from '../../entities/feedback.entity';

/**
 * 피드백 생성 입력 타입
 */
@InputType()
export class CreateFeedbackInput {
  /**
   * 피드백 제목
   */
  @Field(() => String, { description: '피드백 제목' })
  @IsString({ message: '피드백 제목은 문자열이어야 합니다.' })
  @MaxLength(200, { message: '피드백 제목은 최대 200자까지 가능합니다.' })
  title: string;

  /**
   * 피드백 내용
   */
  @Field(() => String, { description: '피드백 내용' })
  @IsString({ message: '피드백 내용은 문자열이어야 합니다.' })
  @MaxLength(5000, { message: '피드백 내용은 최대 5,000자까지 가능합니다.' })
  content: string;

  /**
   * 피드백 유형
   */
  @Field(() => FeedbackType, { description: '피드백 유형' })
  @IsEnum(FeedbackType, { message: '올바른 피드백 유형을 선택해주세요.' })
  type: FeedbackType;

  /**
   * 첨부 파일 URL (선택사항)
   */
  @Field(() => String, { nullable: true, description: '첨부 파일 URL' })
  @IsOptional()
  @IsString({ message: '첨부 파일 URL은 문자열이어야 합니다.' })
  @MaxLength(1000, { message: '첨부 파일 URL은 최대 1000자까지 가능합니다.' })
  attachmentUrl?: string;

  /**
   * 사용자 연락처 (선택사항)
   */
  @Field(() => String, { nullable: true, description: '사용자 연락처' })
  @IsOptional()
  @IsString({ message: '연락처는 문자열이어야 합니다.' })
  @MaxLength(100, { message: '연락처는 최대 100자까지 가능합니다.' })
  contactInfo?: string;
}
