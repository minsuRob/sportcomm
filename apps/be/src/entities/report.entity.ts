import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ObjectType, Field, registerEnumType } from '@nestjs/graphql';
import { IsString, IsEnum, MaxLength, IsOptional } from 'class-validator';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Post } from './post.entity';

/**
 * 신고 유형 열거형
 */
export enum ReportType {
  /** 스팸 */
  SPAM = 'SPAM',
  /** 부적절한 콘텐츠 */
  INAPPROPRIATE_CONTENT = 'INAPPROPRIATE_CONTENT',
  /** 괴롭힘 */
  HARASSMENT = 'HARASSMENT',
  /** 허위 정보 */
  MISINFORMATION = 'MISINFORMATION',
  /** 저작권 침해 */
  COPYRIGHT = 'COPYRIGHT',
  /** 기타 */
  OTHER = 'OTHER',
}

/**
 * 신고 상태 열거형
 */
export enum ReportStatus {
  /** 대기 중 */
  PENDING = 'PENDING',
  /** 검토 중 */
  REVIEWING = 'REVIEWING',
  /** 승인됨 */
  APPROVED = 'APPROVED',
  /** 거부됨 */
  REJECTED = 'REJECTED',
}

// GraphQL 스키마에 enum 등록
registerEnumType(ReportType, {
  name: 'ReportType',
  description: '신고 유형',
});

registerEnumType(ReportStatus, {
  name: 'ReportStatus',
  description: '신고 처리 상태',
});

/**
 * 신고 엔티티
 *
 * 사용자가 부적절한 게시물이나 사용자를 신고할 때 사용됩니다.
 */
@ObjectType()
@Entity('reports')
@Index(['reporterId'])
@Index(['reportedUserId'])
@Index(['postId'])
@Index(['type'])
@Index(['status'])
@Index(['createdAt'])
export class Report extends BaseEntity {
  /**
   * 신고 유형
   */
  @Field(() => ReportType, { description: '신고 유형' })
  @Column({
    type: 'enum',
    enum: ReportType,
    comment: '신고 유형',
  })
  @IsEnum(ReportType, { message: '올바른 신고 유형을 선택해주세요.' })
  type: ReportType;

  /**
   * 신고 사유
   */
  @Field(() => String, { description: '신고 사유' })
  @Column({
    type: 'text',
    comment: '신고 사유',
  })
  @IsString({ message: '신고 사유는 문자열이어야 합니다.' })
  @MaxLength(1000, { message: '신고 사유는 최대 1000자까지 가능합니다.' })
  reason: string;

  /**
   * 신고 처리 상태
   */
  @Field(() => ReportStatus, { description: '신고 처리 상태' })
  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.PENDING,
    comment: '신고 처리 상태',
  })
  @IsEnum(ReportStatus, { message: '올바른 신고 상태를 선택해주세요.' })
  status: ReportStatus;

  /**
   * 관리자 메모
   */
  @Field(() => String, { nullable: true, description: '관리자 메모' })
  @Column({
    type: 'text',
    nullable: true,
    comment: '관리자 메모',
  })
  @IsOptional()
  @IsString({ message: '관리자 메모는 문자열이어야 합니다.' })
  @MaxLength(500, { message: '관리자 메모는 최대 500자까지 가능합니다.' })
  adminNote?: string;

  /**
   * 신고자 ID
   */
  @Column({
    type: 'uuid',
    comment: '신고자 ID',
  })
  reporterId: string;

  /**
   * 신고당한 사용자 ID
   */
  @Column({
    type: 'uuid',
    nullable: true,
    comment: '신고당한 사용자 ID',
  })
  reportedUserId?: string;

  /**
   * 신고된 게시물 ID
   */
  @Column({
    type: 'uuid',
    nullable: true,
    comment: '신고된 게시물 ID',
  })
  postId?: string;

  // === 관계 설정 ===

  /**
   * 신고자
   */
  @Field(() => User, { description: '신고자' })
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reporterId' })
  reporter: User;

  /**
   * 신고당한 사용자
   */
  @Field(() => User, { nullable: true, description: '신고당한 사용자' })
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reportedUserId' })
  reportedUser?: User;

  /**
   * 신고된 게시물
   */
  @Field(() => Post, { nullable: true, description: '신고된 게시물' })
  @ManyToOne(() => Post, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post?: Post;

  // === 헬퍼 메서드 ===

  /**
   * 신고가 대기 중인지 확인
   */
  isPending(): boolean {
    return this.status === ReportStatus.PENDING;
  }

  /**
   * 신고가 승인되었는지 확인
   */
  isApproved(): boolean {
    return this.status === ReportStatus.APPROVED;
  }

  /**
   * 신고가 거부되었는지 확인
   */
  isRejected(): boolean {
    return this.status === ReportStatus.REJECTED;
  }

  /**
   * 게시물 신고인지 확인
   */
  isPostReport(): boolean {
    return !!this.postId;
  }

  /**
   * 사용자 신고인지 확인
   */
  isUserReport(): boolean {
    return !!this.reportedUserId && !this.postId;
  }
}
