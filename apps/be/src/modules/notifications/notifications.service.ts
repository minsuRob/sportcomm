import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import {
  Notification,
  NotificationType,
} from '../../entities/notification.entity';
import { User } from '../../entities/user.entity';
import { Post } from '../../entities/post.entity';
import { Comment } from '../../entities/comment.entity';

/**
 * 알림 생성 DTO
 */
export interface CreateNotificationDto {
  type: NotificationType;
  recipientId: string;
  senderId?: string;
  postId?: string;
  commentId?: string;
  metadata?: Record<string, any>;
}

/**
 * 알림 이벤트 타입들
 */
export interface NotificationEvents {
  'notification.like': { postId: string; userId: string; authorId: string };
  'notification.comment': {
    postId: string;
    commentId: string;
    userId: string;
    authorId: string;
  };
  'notification.follow': { followerId: string; followedId: string };
  'notification.like.milestone': {
    postId: string;
    authorId: string;
    likeCount: number;
  };
}

/**
 * 알림 서비스
 *
 * 알림 생성, 조회, 읽음 처리 등의 기능을 제공합니다.
 * 이벤트 기반으로 동작하여 다른 모듈에서 발생하는 이벤트를 수신하여 알림을 생성합니다.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * 사용자의 알림 목록 조회
   */
  async getNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    notifications: Notification[];
    total: number;
    hasMore: boolean;
  }> {
    const [notifications, total] =
      await this.notificationRepository.findAndCount({
        where: { recipientId: userId },
        relations: ['sender', 'post', 'comment'],
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });

    return {
      notifications,
      total,
      hasMore: total > page * limit,
    };
  }

  /**
   * 읽지 않은 알림 개수 조회
   */
  async getUnreadCount(userId: string): Promise<number> {
    return await this.notificationRepository.count({
      where: { recipientId: userId, isRead: false },
    });
  }

  /**
   * 알림 읽음 처리
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const result = await this.notificationRepository.update(
      { id: notificationId, recipientId: userId },
      { isRead: true },
    );

    return result.affected > 0;
  }

  /**
   * 모든 알림 읽음 처리
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.notificationRepository.update(
      { recipientId: userId, isRead: false },
      { isRead: true },
    );

    return result.affected || 0;
  }

  /**
   * 알림 생성
   */
  async createNotification(dto: CreateNotificationDto): Promise<Notification> {
    // 자기 자신에게는 알림을 보내지 않음
    if (dto.senderId && dto.senderId === dto.recipientId) {
      this.logger.debug('자기 자신에게 알림을 보내려고 시도함. 무시됨.');
      return null;
    }

    // 발신자 정보 조회 (있는 경우)
    let sender: User | undefined;
    if (dto.senderId) {
      sender = await this.userRepository.findOne({
        where: { id: dto.senderId },
      });
    }

    // 알림 메시지 생성
    const { title, message } = Notification.createMessage(
      dto.type,
      sender?.nickname,
      undefined, // postTitle은 필요시 추가
      dto.metadata,
    );

    // 알림 생성
    const notification = this.notificationRepository.create({
      type: dto.type,
      title,
      message,
      recipientId: dto.recipientId,
      senderId: dto.senderId,
      postId: dto.postId,
      commentId: dto.commentId,
      metadata: dto.metadata,
    });

    const savedNotification =
      await this.notificationRepository.save(notification);

    // 관련 엔티티들을 포함하여 다시 조회
    const fullNotification = await this.notificationRepository.findOne({
      where: { id: savedNotification.id },
      relations: ['sender', 'post', 'comment'],
    });

    this.logger.log(`알림 생성됨: ${dto.type} -> ${dto.recipientId}`);

    // 실시간 알림 이벤트 발생 (WebSocket 등에서 사용)
    this.eventEmitter.emit('notification.created', fullNotification);

    return fullNotification;
  }

  /**
   * 좋아요 이벤트 처리
   */
  @OnEvent('notification.like')
  async handleLikeEvent(payload: NotificationEvents['notification.like']) {
    const { postId, userId, authorId } = payload;

    // 게시물 작성자에게 좋아요 알림 전송
    await this.createNotification({
      type: NotificationType.LIKE,
      recipientId: authorId,
      senderId: userId,
      postId,
    });

    // 좋아요 마일스톤 확인
    await this.checkLikeMilestone(postId, authorId);
  }

  /**
   * 댓글 이벤트 처리
   */
  @OnEvent('notification.comment')
  async handleCommentEvent(
    payload: NotificationEvents['notification.comment'],
  ) {
    const { postId, commentId, userId, authorId } = payload;

    // 게시물 작성자에게 댓글 알림 전송
    await this.createNotification({
      type: NotificationType.COMMENT,
      recipientId: authorId,
      senderId: userId,
      postId,
      commentId,
    });
  }

  /**
   * 팔로우 이벤트 처리
   */
  @OnEvent('notification.follow')
  async handleFollowEvent(payload: NotificationEvents['notification.follow']) {
    const { followerId, followedId } = payload;

    // 팔로우 당한 사용자에게 알림 전송
    await this.createNotification({
      type: NotificationType.FOLLOW,
      recipientId: followedId,
      senderId: followerId,
    });
  }

  /**
   * 좋아요 마일스톤 확인 및 알림 전송
   */
  private async checkLikeMilestone(postId: string, authorId: string) {
    try {
      // 게시물의 현재 좋아요 수 조회
      const post = await this.postRepository.findOne({
        where: { id: postId },
        select: ['id', 'likeCount'],
      });

      if (!post) return;

      const likeCount = post.likeCount;
      const milestones = [10, 50, 100, 500, 1000]; // 마일스톤 기준

      // 마일스톤에 도달했는지 확인
      const reachedMilestone = milestones.find(
        (milestone) => likeCount === milestone,
      );

      if (reachedMilestone) {
        // 이미 해당 마일스톤 알림을 보냈는지 확인
        const existingNotification = await this.notificationRepository.findOne({
          where: {
            type: NotificationType.LIKE_MILESTONE,
            recipientId: authorId,
            postId,
            metadata: { likeCount: reachedMilestone } as any,
          },
        });

        if (!existingNotification) {
          await this.createNotification({
            type: NotificationType.LIKE_MILESTONE,
            recipientId: authorId,
            postId,
            metadata: { likeCount: reachedMilestone },
          });

          this.logger.log(
            `좋아요 마일스톤 알림 전송: ${reachedMilestone}개 (postId: ${postId})`,
          );
        }
      }
    } catch (error) {
      this.logger.error('좋아요 마일스톤 확인 중 오류:', error);
    }
  }

  /**
   * 알림 삭제 (관리자용)
   */
  async deleteNotification(
    notificationId: string,
    userId: string,
  ): Promise<boolean> {
    const result = await this.notificationRepository.delete({
      id: notificationId,
      recipientId: userId,
    });

    return result.affected > 0;
  }

  /**
   * 오래된 알림 정리 (배치 작업용)
   */
  async cleanupOldNotifications(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.notificationRepository.delete({
      createdAt: { $lt: cutoffDate } as any,
      isRead: true,
    });

    this.logger.log(
      `${result.affected || 0}개의 오래된 알림이 정리되었습니다.`,
    );
    return result.affected || 0;
  }
}
