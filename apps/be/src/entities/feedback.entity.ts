import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ObjectType, Field, registerEnumType } from '@nestjs/graphql';
import { IsString, IsEnum, MaxLength, IsOptional } from 'class-validator';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

/**
 * 피드백 유형 열거형
 */
export enum FeedbackType {
  /** 버그 신고 */
  BUG_REPORT = 'BUG_REPORT',
  /** 기능 요청 */
  FEATURE_REQUEST = 'FEATURE_REQUEST',
  /** 개선 제안 */
  IMPROVEMENT = 'IMPROVEMENT',
  /** 일반 의견 */
  GENERAL = 'GENERAL',
  /** 칭찬 */
  COMPLIMENT = 'COMPLIMENT',
  /** 불만 */
  COMPLAINT = 'COMPLAINT',
}

/**
 * 피드백 상태 열거형
 */
export enum FeedbackStatus {
  /** 새로운 피드백 */
  NEW = 'NEW',
  /** 검토 중 */
  REVIEWING = 'REVIEWING',
  /** 진행 중 */
  IN_PROGRESS = 'IN_PROGRESS',
  /** 완료됨 */
  COMPLETED = 'COMPLETED',
  /** 거부됨 */
  REJECTED = 'REJECTED',
}

/**
 * 피드백 우선순위 열거형
 */
export enum FeedbackPriority {
  /** 낮음 */
  LOW = 'LOW',
  /** 보통 */
  MEDIUM = 'MEDIUM',
  /** 높음 */
  HIGH = 'HIGH',
  /** 긴급 */
  URGENT = 'URGENT',
}

// GraphQL 스키마에 enum 등록
registerEnumType(FeedbackType, {
  name: 'FeedbackType',
  description: '피드백 유형',
  valuesMap: {
    BUG_REPORT: { description: '버그 신고' },
    FEATURE_REQUEST: { description: '기능 요청' },
    IMPROVEMENT: { description: '개선 제안' },
    GENERAL: { description: '일반 의견' },
    COMPLIMENT: { description: '칭찬' },
    COMPLAINT: { description: '불만' },
  },
});

registerEnumType(FeedbackStatus, {
  name: 'FeedbackStatus',
  description: '피드백 처리 상태',
  valuesMap: {
    NEW: { description: '새로운 피드백' },
    REVIEWING: { description: '검토 중' },
    IN_PROGRESS: { description: '진행 중' },
    COMPLETED: { description: '완료됨' },
    REJECTED: { description: '거부됨' },
  },
});

registerEnumType(FeedbackPriority, {
  name: 'FeedbackPriority',
  description: '피드백 우선순위',
  valuesMap: {
    LOW: { description: '낮음' },
    MEDIUM: { description: '보통' },
    HIGH: { description: '높음' },
    URGENT: { description: '긴급' },
  },
});

/**
 * 피드백 엔티티
 *
 * 사용자들이 제출한 피드백을 관리합니다.
 * 버그 신고, 기능 요청, 개선 제안 등 다양한 형태의 피드백을 지원합니다.
 */
@ObjectType()
@Entity('feedbacks')
@Index(['type'])
@Index(['status'])
@Index(['priority'])
@Index(['createdAt'])
@Index(['submitterId'])
export class Feedback extends BaseEntity {
  /**
   * 피드백 제목
   */
  @Field(() => String, { description: '피드백 제목' })
  @Column({
    type: 'varchar',
    length: 200,
    comment: '피드백 제목',
  })
  @IsString({ message: '피드백 제목은 문자열이어야 합니다.' })
  @MaxLength(200, { message: '피드백 제목은 최대 200자까지 가능합니다.' })
  title: string;

  /**
   * 피드백 내용
   */
  @Field(() => String, { description: '피드백 내용' })
  @Column({
    type: 'text',
    comment: '피드백 내용',
  })
  @IsString({ message: '피드백 내용은 문자열이어야 합니다.' })
  @MaxLength(5000, { message: '피드백 내용은 최대 5,000자까지 가능합니다.' })
  content: string;

  /**
   * 피드백 유형
   */
  @Field(() => FeedbackType, { description: '피드백 유형' })
  @Column({
    type: 'enum',
    enum: FeedbackType,
    default: FeedbackType.GENERAL,
    comment: '피드백 유형',
  })
  @IsEnum(FeedbackType, { message: '올바른 피드백 유형을 선택해주세요.' })
  type: FeedbackType;

  /**
   * 피드백 상태
   */
  @Field(() => FeedbackStatus, { description: '피드백 처리 상태' })
  @Column({
    type: 'enum',
    enum: FeedbackStatus,
    default: FeedbackStatus.NEW,
    comment: '피드백 처리 상태',
  })
  @IsEnum(FeedbackStatus, { message: '올바른 피드백 상태를 선택해주세요.' })
  status: FeedbackStatus;

  /**
   * 피드백 우선순위
   */
  @Field(() => FeedbackPriority, { description: '피드백 우선순위' })
  @Column({
    type: 'enum',
    enum: FeedbackPriority,
    default: FeedbackPriority.MEDIUM,
    comment: '피드백 우선순위',
  })
  @IsEnum(FeedbackPriority, { message: '올바른 우선순위를 선택해주세요.' })
  priority: FeedbackPriority;

  /**
   * 관리자 응답
   */
  @Field(() => String, { nullable: true, description: '관리자 응답' })
  @Column({
    type: 'text',
    nullable: true,
    comment: '관리자 응답',
  })
  @IsOptional()
  @IsString({ message: '관리자 응답은 문자열이어야 합니다.' })
  @MaxLength(2000, { message: '관리자 응답은 최대 2,000자까지 가능합니다.' })
  adminResponse?: string;

  /**
   * 응답 일시
   */
  @Field(() => Date, { nullable: true, description: '응답 일시' })
  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '응답 일시',
  })
  respondedAt?: Date;

  /**
   * 첨부 파일 URL
   */
  @Field(() => String, { nullable: true, description: '첨부 파일 URL' })
  @Column({
    type: 'varchar',
    length: 1000,
    nullable: true,
    comment: '첨부 파일 URL',
  })
  @IsOptional()
  @IsString({ message: '첨부 파일 URL은 문자열이어야 합니다.' })
  @MaxLength(1000, { message: '첨부 파일 URL은 최대 1000자까지 가능합니다.' })
  attachmentUrl?: string;

  /**
   * 사용자 연락처 (선택사항)
   */
  @Field(() => String, { nullable: true, description: '사용자 연락처' })
  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '사용자 연락처',
  })
  @IsOptional()
  @IsString({ message: '연락처는 문자열이어야 합니다.' })
  @MaxLength(100, { message: '연락처는 최대 100자까지 가능합니다.' })
  contactInfo?: string;

  /**
   * 피드백 제출자 ID
   */
  @Column({
    type: 'uuid',
    comment: '피드백 제출자 ID',
  })
  submitterId: string;

  /**
   * 응답한 관리자 ID
   */
  @Column({
    type: 'uuid',
    nullable: true,
    comment: '응답한 관리자 ID',
  })
  responderId?: string;

  // === 관계 설정 ===

  /**
   * 피드백 제출자
   */
  @Field(() => User, { description: '피드백 제출자' })
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'submitterId' })
  submitter: User;

  /**
   * 응답한 관리자
   */
  @Field(() => User, { nullable: true, description: '응답한 관리자' })
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'responderId' })
  responder?: User;

  // === 헬퍼 메서드 ===

  /**
   * 새로운 피드백인지 확인
   */
  isNew(): boolean {
    return this.status === FeedbackStatus.NEW;
  }

  /**
   * 완료된 피드백인지 확인
   */
  isCompleted(): boolean {
    return this.status === FeedbackStatus.COMPLETED;
  }

  /**
   * 긴급 피드백인지 확인
   */
  isUrgent(): boolean {
    return this.priority === FeedbackPriority.URGENT;
  }

  /**
   * 응답이 있는지 확인
   */
  hasResponse(): boolean {
    return !!this.adminResponse;
  }

  /**
   * 피드백 상태 업데이트
   */
  updateStatus(status: FeedbackStatus): void {
    this.status = status;
    this.updatedAt = new Date();
  }

  /**
   * 관리자 응답 추가
   */
  addAdminResponse(response: string, adminId: string): void {
    this.adminResponse = response;
    this.responderId = adminId;
    this.respondedAt = new Date();
    this.status = FeedbackStatus.COMPLETED;
    this.updatedAt = new Date();
  }

  /**
   * 우선순위 업데이트
   */
  updatePriority(priority: FeedbackPriority): void {
    this.priority = priority;
    this.updatedAt = new Date();
  }
}
