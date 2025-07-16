import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { IsString, IsNumber, MaxLength, MinLength, Min } from 'class-validator';
import { BaseEntity } from './base.entity';
import { Comment } from './comment.entity';

/**
 * 댓글 버전 엔티티
 *
 * 댓글의 수정 이력을 관리합니다.
 * 댓글이 수정될 때마다 새로운 버전이 생성되어
 * 변경 내역을 추적하고 이전 버전으로 복원할 수 있습니다.
 */
@ObjectType()
@Entity('comment_versions')
@Index(['commentId'])
@Index(['version'])
@Index(['createdAt'])
export class CommentVersion extends BaseEntity {
  /**
   * 댓글 내용 (해당 버전)
   * 이 버전에서의 댓글 내용입니다.
   */
  @Field(() => String, { description: '댓글 내용 (해당 버전)' })
  @Column({
    type: 'text',
    comment: '댓글 내용 (해당 버전)',
  })
  @IsString({ message: '내용은 문자열이어야 합니다.' })
  @MinLength(1, { message: '내용은 최소 1자 이상이어야 합니다.' })
  @MaxLength(5000, { message: '내용은 최대 5,000자까지 가능합니다.' })
  content: string;

  /**
   * 버전 번호
   * 댓글의 버전을 나타내는 순차적 번호입니다.
   * 1부터 시작하여 수정될 때마다 1씩 증가합니다.
   */
  @Field(() => Number, { description: '버전 번호' })
  @Column({
    type: 'int',
    comment: '버전 번호',
  })
  @IsNumber({}, { message: '버전 번호는 숫자여야 합니다.' })
  @Min(1, { message: '버전 번호는 1 이상이어야 합니다.' })
  version: number;

  /**
   * 수정 사유
   * 댓글을 수정한 이유를 설명합니다.
   */
  @Field(() => String, { nullable: true, description: '수정 사유' })
  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: '수정 사유',
  })
  @IsString({ message: '수정 사유는 문자열이어야 합니다.' })
  @MaxLength(500, { message: '수정 사유는 최대 500자까지 가능합니다.' })
  editReason?: string;

  /**
   * 변경 내용 요약
   * 이전 버전과 비교하여 변경된 내용의 요약입니다.
   */
  @Field(() => String, { nullable: true, description: '변경 내용 요약' })
  @Column({
    type: 'text',
    nullable: true,
    comment: '변경 내용 요약',
  })
  @IsString({ message: '변경 내용 요약은 문자열이어야 합니다.' })
  @MaxLength(1000, { message: '변경 내용 요약은 최대 1,000자까지 가능합니다.' })
  changeSummary?: string;

  /**
   * 문자 수 변화
   * 이전 버전 대비 문자 수의 변화량입니다.
   * 양수: 증가, 음수: 감소, 0: 변화 없음
   */
  @Field(() => Number, { description: '문자 수 변화' })
  @Column({
    type: 'int',
    default: 0,
    comment: '문자 수 변화 (이전 버전 대비)',
  })
  @IsNumber({}, { message: '문자 수 변화는 숫자여야 합니다.' })
  characterDiff: number;

  /**
   * 주요 변경 여부
   * 단순 오타 수정이 아닌 내용상의 주요 변경인지 여부입니다.
   */
  @Field(() => Boolean, { description: '주요 변경 여부' })
  @Column({
    type: 'boolean',
    default: false,
    comment: '주요 변경 여부',
  })
  isMajorChange: boolean;

  /**
   * 댓글 ID
   * 버전이 속한 댓글의 ID입니다.
   */
  @Column({
    type: 'uuid',
    comment: '댓글 ID',
  })
  commentId: string;

  // === 관계 설정 ===

  /**
   * 버전이 속한 댓글
   * 다대일 관계: 여러 버전이 한 댓글에 속합니다.
   */
  @Field(() => Comment, { description: '버전이 속한 댓글' })
  @ManyToOne(() => Comment, (comment) => comment.versions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'commentId' })
  comment: Comment;
}