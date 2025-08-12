/**
 * 게시물 생성 이벤트 핸들러
 *
 * 게시물 생성 후 비동기적으로 처리해야 할 작업들을 담당합니다.
 */

import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Injectable, Logger } from '@nestjs/common';
import { PostCreatedEvent } from '../post-created.event';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../entities/user.entity';
import { Notification } from '../../../entities/notification.entity';

@Injectable()
@EventsHandler(PostCreatedEvent)
export class PostCreatedHandler implements IEventHandler<PostCreatedEvent> {
  private readonly logger = new Logger(PostCreatedHandler.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async handle(event: PostCreatedEvent): Promise<void> {
    this.logger.debug(`게시물 생성 이벤트 처리 시작: ${event.postId}`);

    try {
      // 병렬로 후속 작업 실행
      await Promise.all([
        this.sendNotificationsToFollowers(event),
        this.updateUserStats(event),
        this.indexForSearch(event),
        this.processMediaOptimization(event),
      ]);

      this.logger.log(`게시물 생성 이벤트 처리 완료: ${event.postId}`);
    } catch (error) {
      this.logger.error(
        `게시물 생성 이벤트 처리 실패: ${event.postId}`,
        error instanceof Error ? error.stack : String(error),
      );
      // 이벤트 처리 실패는 메인 플로우에 영향을 주지 않음
    }
  }

  /**
   * 팔로워들에게 알림 전송
   */
  private async sendNotificationsToFollowers(
    event: PostCreatedEvent,
  ): Promise<void> {
    try {
      // 작성자의 팔로워 조회
      const author = await this.userRepository.findOne({
        where: { id: event.authorId },
        relations: ['followers'],
      });

      if (!author || !author.followers?.length) {
        return;
      }

      // 팔로워들에게 알림 생성
      const notifications = author.followers.map((follower) =>
        this.notificationRepository.create({
          userId: follower.id,
          type: 'NEW_POST',
          title: '새 게시물 알림',
          message: `${author.nickname}님이 새 게시물을 작성했습니다.`,
          data: {
            postId: event.postId,
            authorId: event.authorId,
            authorNickname: author.nickname,
            postTitle: event.title,
            postType: event.type,
          },
          isRead: false,
          createdAt: new Date(),
        }),
      );

      await this.notificationRepository.save(notifications);

      this.logger.debug(`팔로워 알림 전송 완료: ${notifications.length}명`);
    } catch (error) {
      this.logger.error('팔로워 알림 전송 실패', error);
    }
  }

  /**
   * 사용자 통계 업데이트
   */
  private async updateUserStats(event: PostCreatedEvent): Promise<void> {
    try {
      // 작성자의 게시물 수 증가
      await this.userRepository.increment(
        { id: event.authorId },
        'postCount',
        1,
      );

      this.logger.debug(`사용자 통계 업데이트 완료: ${event.authorId}`);
    } catch (error) {
      this.logger.error('사용자 통계 업데이트 실패', error);
    }
  }

  /**
   * 검색 인덱싱
   */
  private async indexForSearch(event: PostCreatedEvent): Promise<void> {
    try {
      // TODO: Elasticsearch나 다른 검색 엔진에 인덱싱
      // 현재는 로깅만 수행
      this.logger.debug(`검색 인덱싱 예정: ${event.postId}`);

      // 예시: 검색 서비스 호출
      // await this.searchService.indexPost({
      //   id: event.postId,
      //   title: event.title,
      //   content: event.content,
      //   type: event.type,
      //   authorId: event.authorId,
      //   teamId: event.teamId,
      //   createdAt: event.timestamp,
      // });
    } catch (error) {
      this.logger.error('검색 인덱싱 실패', error);
    }
  }

  /**
   * 미디어 최적화 처리
   */
  private async processMediaOptimization(
    event: PostCreatedEvent,
  ): Promise<void> {
    try {
      if (event.mediaIds.length === 0) {
        return;
      }

      // TODO: 미디어 최적화 작업 큐에 추가
      this.logger.debug(`미디어 최적화 예정: ${event.mediaIds.length}개 파일`);

      // 예시: 미디어 최적화 서비스 호출
      // await this.mediaOptimizationService.optimizeMedia(event.mediaIds);
    } catch (error) {
      this.logger.error('미디어 최적화 실패', error);
    }
  }
}
