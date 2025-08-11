import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Notification } from '../../entities/notification.entity';
import { User } from '../../entities/user.entity';
import { Post } from '../../entities/post.entity';
import { Comment } from '../../entities/comment.entity';
import { PushToken } from '../../entities/push-token.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsResolver } from './notifications.resolver';

/**
 * 알림 모듈
 *
 * 알림 관련 기능을 제공하는 모듈입니다.
 * 이벤트 기반으로 동작하여 다른 모듈에서 발생하는 이벤트를 수신하여 알림을 생성합니다.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, User, Post, Comment, PushToken]),
    EventEmitterModule.forRoot(), // 이벤트 시스템 활성화
  ],
  providers: [NotificationsService, NotificationsResolver],
  exports: [NotificationsService], // 다른 모듈에서 사용할 수 있도록 export
})
export class NotificationsModule {}
