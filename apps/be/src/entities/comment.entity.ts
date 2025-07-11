import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Post } from './post.entity';

/**
 * 댓글 엔티티
 *
 * 게시물에 대한 댓글과 대댓글을 관리합니다.
 * 계층적 구조를 지원하여 댓글에 대한 답글을 무제한으로 달 수 있습니다.
 */
@ObjectType()
@Entity('comments')
@Index(['authorId'])
@Index(['postId'])
@Index(['parentCommentId'])
@Index(['createdAt'])
export class Comment extends BaseEntity {
  /**
   * 댓글 내용
   * 사용자가 작성한 댓글의 본문입니다.
   */
  @Field(() => String, { description: '댓글 내용' })
  @Column({
    type: 'text',
    comment: '댓글 내용',
  })
  @IsString({ message: '댓글 내용은 문자열이어야 합니다.' })
  @MinLength(1, { message: '댓글 내용은 최소 1자 이상이어야 합니다.' })
  @MaxLength(1000, { message: '댓글 내용은 최대 1,000자까지 가능합니다.' })
  content: string;

  /**
   * 댓글 좋아요 수
   * 사용자들이 댓글에 좋아요를 누른 횟수입니다.
   */
  @Field(() => Number, { description: '좋아요 수' })
  @Column({
    type: 'int',
    default: 0,
    comment: '댓글 좋아요 수',
  })
  likeCount: number;

  /**
   * 댓글 답글 수
   * 이 댓글에 달린 답글의 총 개수입니다.
   */
  @Field(() => Number, { description: '답글 수' })
  @Column({
    type: 'int',
    default: 0,
    comment: '댓글 답글 수',
  })
  replyCount: number;

  /**
   * 댓글 신고 수
   * 부적절한 댓글을 신고한 횟수입니다.
   */
  @Field(() => Number, { description: '신고 수' })
  @Column({
    type: 'int',
    default: 0,
    comment: '댓글 신고 수',
  })
  reportCount: number;

  /**
   * 댓글 고정 여부
   * 게시물 작성자나 관리자가 댓글을 상단에 고정할 수 있습니다.
   */
  @Field(() => Boolean, { description: '고정 여부' })
  @Column({
    type: 'boolean',
    default: false,
    comment: '댓글 고정 여부',
  })
  isPinned: boolean;

  /**
   * 댓글 숨김 여부
   * 관리자가 부적절한 댓글을 숨길 수 있습니다.
   */
  @Field(() => Boolean, { description: '숨김 여부' })
  @Column({
    type: 'boolean',
    default: false,
    comment: '댓글 숨김 여부',
  })
  isHidden: boolean;

  /**
   * 작성자 ID
   * 댓글을 작성한 사용자의 ID입니다.
   */
  @Column({
    type: 'uuid',
    comment: '작성자 ID',
  })
  authorId: string;

  /**
   * 게시물 ID
   * 댓글이 속한 게시물의 ID입니다.
   */
  @Column({
    type: 'uuid',
    comment: '게시물 ID',
  })
  postId: string;

  /**
   * 부모 댓글 ID
   * 대댓글인 경우 부모 댓글의 ID입니다.
   * 최상위 댓글인 경우 null입니다.
   */
  @Field(() => String, { nullable: true, description: '부모 댓글 ID' })
  @Column({
    type: 'uuid',
    nullable: true,
    comment: '부모 댓글 ID (대댓글인 경우)',
  })
  parentCommentId?: string;

  // === 관계 설정 ===

  /**
   * 댓글 작성자
   * 다대일 관계: 여러 댓글이 한 사용자에 의해 작성됩니다.
   */
  @Field(() => User, { description: '댓글 작성자' })
  @ManyToOne(() => User, (user) => user.comments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'authorId' })
  author: User;

  /**
   * 댓글이 속한 게시물
   * 다대일 관계: 여러 댓글이 한 게시물에 속합니다.
   */
  @Field(() => Post, { description: '댓글이 속한 게시물' })
  @ManyToOne(() => Post, (post) => post.comments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'postId' })
  post: Post;

  /**
   * 부모 댓글
   * 다대일 관계: 여러 대댓글이 한 부모 댓글에 속합니다.
   * 자기 참조 관계입니다.
   */
  @Field(() => Comment, { nullable: true, description: '부모 댓글' })
  @ManyToOne(() => Comment, (comment) => comment.childComments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parentCommentId' })
  parentComment?: Comment;

  /**
   * 자식 댓글들 (답글)
   * 일대다 관계: 한 댓글에는 여러 답글이 달릴 수 있습니다.
   * 자기 참조 관계입니다.
   */
  @Field(() => [Comment], { description: '답글 목록' })
  @OneToMany(() => Comment, (comment) => comment.parentComment)
  childComments: Comment[];

  // === 헬퍼 메서드 ===

  /**
   * 최상위 댓글인지 확인하는 메서드
   * @returns 최상위 댓글인 경우 true, 답글인 경우 false
   */
  isTopLevel(): boolean {
    return this.parentCommentId === null || this.parentCommentId === undefined;
  }

  /**
   * 답글인지 확인하는 메서드
   * @returns 답글인 경우 true, 최상위 댓글인 경우 false
   */
  isReply(): boolean {
    return !this.isTopLevel();
  }

  /**
   * 댓글 좋아요 수 증가 메서드
   * @param count 증가시킬 좋아요 수 (기본값: 1)
   */
  incrementLikeCount(count: number = 1): void {
    this.likeCount += count;
  }

  /**
   * 댓글 답글 수 증가 메서드
   * @param count 증가시킬 답글 수 (기본값: 1)
   */
  incrementReplyCount(count: number = 1): void {
    this.replyCount += count;
  }

  /**
   * 댓글 신고 수 증가 메서드
   * @param count 증가시킬 신고 수 (기본값: 1)
   */
  incrementReportCount(count: number = 1): void {
    this.reportCount += count;
  }

  /**
   * 댓글 고정 상태 토글 메서드
   */
  togglePin(): void {
    this.isPinned = !this.isPinned;
  }

  /**
   * 댓글 숨김 상태 토글 메서드
   */
  toggleHidden(): void {
    this.isHidden = !this.isHidden;
  }

  /**
   * 댓글 깊이 계산 메서드
   * 최상위 댓글은 0, 답글은 1, 답글의 답글은 2, ... 형태로 계산됩니다.
   * @returns 댓글의 깊이
   */
  getDepth(): number {
    if (this.isTopLevel()) {
      return 0;
    }
    // 실제 구현에서는 부모 댓글을 재귀적으로 탐색하여 깊이를 계산해야 합니다.
    // 여기서는 간단히 1을 반환합니다.
    return 1;
  }

  /**
   * 댓글 요약 정보 반환 메서드
   * @param maxLength 요약 최대 길이 (기본값: 50)
   * @returns 요약된 댓글 내용
   */
  getSummary(maxLength: number = 50): string {
    if (this.content.length <= maxLength) {
      return this.content;
    }
    return this.content.substring(0, maxLength) + '...';
  }

  /**
   * 댓글이 신고 임계값을 초과했는지 확인하는 메서드
   * @param threshold 신고 임계값 (기본값: 10)
   * @returns 임계값을 초과한 경우 true, 아닌 경우 false
   */
  isReportedTooMuch(threshold: number = 10): boolean {
    return this.reportCount >= threshold;
  }

  /**
   * 댓글이 표시 가능한지 확인하는 메서드
   * 삭제되지 않았고, 숨겨지지 않았으며, 과도하게 신고되지 않은 경우 표시 가능합니다.
   * @returns 표시 가능한 경우 true, 아닌 경우 false
   */
  isDisplayable(): boolean {
    return this.isEntityActive && !this.isHidden && !this.isReportedTooMuch();
  }
}
