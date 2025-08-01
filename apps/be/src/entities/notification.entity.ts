import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import { User } from './user.entity';
import { Post } from './post.entity';
import { Comment } from './comment.entity';

/**
 * 알림 타입 열거형
 */
export enum NotificationType {
  LIKE = 'LIKE', // 좋아요
  COMMENT = 'COMMENT', // 댓글
  FOLLOW = 'FOLLOW', // 팔로우
  MENTION = 'MENTION', // 멘션
  POST = 'POST', // 새 게시물
  SYSTEM = 'SYSTEM', // 시스템 알림
  LIKE_MILESTONE = 'LIKE_MILESTONE', // 좋아요 마일스톤 (10개, 50개, 100개 등)
}

// GraphQL에서 사용할 수 있도록 열거형 등록
registerEnumType(NotificationType, {
  name: 'NotificationType',
  description: '알림 타입',
});

/**
 * 알림 엔티티
 *
 * 사용자에게 전송되는 모든 알림을 관리합니다.
 * 댓글, 좋아요, 팔로우 등의 이벤트에 대한 알림을 저장합니다.
 */
@ObjectType({ description: '알림' })
@Entity('notifications')
@Index(['recipientId', 'createdAt']) // 수신자별 최신 알림 조회 최적화
@Index(['recipientId', 'isRead']) // 읽지 않은 알림 조회 최적화
export class Notification {
  @Field(() => ID, { description: '알림 ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => NotificationType, { description: '알림 타입' })
  @Column({
    type: 'enum',
    enum: NotificationType,
    comment: '알림 타입 (LIKE, COMMENT, FOLLOW 등)',
  })
  type: NotificationType;

  @Field({ description: '알림 제목' })
  @Column({ length: 255, comment: '알림 제목' })
  title: string;

  @Field({ description: '알림 메시지' })
  @Column({ type: 'text', comment: '알림 메시지 내용' })
  message: string;

  @Field(() => Boolean, { description: '읽음 여부' })
  @Column({ default: false, comment: '읽음 여부' })
  isRead: boolean;

  // 수신자 (알림을 받는 사용자)
  @Field(() => User, { description: '알림 수신자' })
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipient_id' })
  recipient: User;

  @Column({ name: 'recipient_id', comment: '알림 수신자 ID' })
  recipientId: string;

  // 발신자 (알림을 발생시킨 사용자, 선택적)
  @Field(() => User, { nullable: true, description: '알림 발신자' })
  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sender_id' })
  sender?: User;

  @Column({ name: 'sender_id', nullable: true, comment: '알림 발신자 ID' })
  senderId?: string;

  // 관련 게시물 (선택적)
  @Field(() => Post, { nullable: true, description: '관련 게시물' })
  @ManyToOne(() => Post, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post?: Post;

  @Column({ name: 'post_id', nullable: true, comment: '관련 게시물 ID' })
  postId?: string;

  // 관련 댓글 (선택적)
  @Field(() => Comment, { nullable: true, description: '관련 댓글' })
  @ManyToOne(() => Comment, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'comment_id' })
  comment?: Comment;

  @Column({ name: 'comment_id', nullable: true, comment: '관련 댓글 ID' })
  commentId?: string;

  // 추가 메타데이터 (JSON 형태로 저장)
  @Field(() => String, {
    nullable: true,
    description: '추가 메타데이터 (JSON 문자열)',
  })
  @Column({ type: 'json', nullable: true, comment: '추가 메타데이터' })
  metadata?: Record<string, any>;

  @Field({ description: '생성일시' })
  @CreateDateColumn({ comment: '생성일시' })
  createdAt: Date;

  @Field({ description: '수정일시' })
  @UpdateDateColumn({ comment: '수정일시' })
  updatedAt: Date;

  /**
   * 알림 읽음 처리
   */
  markAsRead(): void {
    this.isRead = true;
  }

  /**
   * 알림이 특정 사용자의 것인지 확인
   */
  belongsToUser(userId: string): boolean {
    return this.recipientId === userId;
  }

  /**
   * 알림 메시지 생성 헬퍼
   */
  static createMessage(
    type: NotificationType,
    senderName?: string,
    postTitle?: string,
    metadata?: Record<string, any>,
  ): { title: string; message: string } {
    switch (type) {
      case NotificationType.LIKE:
        return {
          title: '새로운 좋아요',
          message: `${senderName}님이 회원님의 게시물을 좋아합니다.`,
        };

      case NotificationType.COMMENT:
        return {
          title: '새로운 댓글',
          message: `${senderName}님이 회원님의 게시물에 댓글을 남겼습니다.`,
        };

      case NotificationType.FOLLOW:
        return {
          title: '새로운 팔로워',
          message: `${senderName}님이 회원님을 팔로우하기 시작했습니다.`,
        };

      case NotificationType.LIKE_MILESTONE:
        const count = metadata?.likeCount || 0;
        return {
          title: '좋아요 마일스톤 달성!',
          message: `회원님의 게시물이 ${count}개의 좋아요를 받았습니다! 🎉`,
        };

      case NotificationType.MENTION:
        return {
          title: '멘션 알림',
          message: `${senderName}님이 회원님을 언급했습니다.`,
        };

      case NotificationType.POST:
        return {
          title: '새로운 게시물',
          message: `${senderName}님이 새로운 게시물을 작성했습니다.`,
        };

      case NotificationType.SYSTEM:
        return {
          title: '시스템 알림',
          message: metadata?.message || '새로운 시스템 알림이 있습니다.',
        };

      default:
        return {
          title: '알림',
          message: '새로운 알림이 있습니다.',
        };
    }
  }
}
