import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  Subscription,
  ObjectType,
  Field,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';
import { Notification } from '../../entities/notification.entity';
import { NotificationsService } from './notifications.service';

/**
 * 알림 목록 응답 타입
 */
@ObjectType()
export class NotificationsResponse {
  @Field(() => [Notification], { description: '알림 목록' })
  notifications: Notification[];

  @Field(() => Int, { description: '전체 알림 개수' })
  total: number;

  @Field(() => Boolean, { description: '더 많은 알림이 있는지 여부' })
  hasMore: boolean;

  @Field(() => Int, { description: '현재 페이지' })
  page: number;

  @Field(() => Int, { description: '페이지당 항목 수' })
  limit: number;
}

/**
 * 알림 GraphQL 리졸버
 */
@Resolver(() => Notification)
export class NotificationsResolver {
  private pubSub = new PubSub();

  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * 사용자의 알림 목록 조회
   */
  @Query(() => NotificationsResponse, { description: '알림 목록 조회' })
  @UseGuards(GqlAuthGuard)
  async notifications(
    @CurrentUser() user: User,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
  ): Promise<NotificationsResponse> {
    const result = await this.notificationsService.getNotifications(
      user.id,
      page,
      limit,
    );

    return {
      ...result,
      page,
      limit,
    };
  }

  /**
   * 읽지 않은 알림 개수 조회
   */
  @Query(() => Int, { description: '읽지 않은 알림 개수 조회' })
  @UseGuards(GqlAuthGuard)
  async unreadNotificationCount(@CurrentUser() user: User): Promise<number> {
    return await this.notificationsService.getUnreadCount(user.id);
  }

  /**
   * 알림 읽음 처리
   */
  @Mutation(() => Boolean, { description: '알림 읽음 처리' })
  @UseGuards(GqlAuthGuard)
  async markNotificationAsRead(
    @CurrentUser() user: User,
    @Args('notificationId') notificationId: string,
  ): Promise<boolean> {
    const success = await this.notificationsService.markAsRead(
      notificationId,
      user.id,
    );

    if (success) {
      // 실시간 업데이트를 위한 구독 이벤트 발생
      this.pubSub.publish(`notification_updated_${user.id}`, {
        notificationUpdated: { notificationId, isRead: true },
      });
    }

    return success;
  }

  /**
   * 모든 알림 읽음 처리
   */
  @Mutation(() => Int, { description: '모든 알림 읽음 처리' })
  @UseGuards(GqlAuthGuard)
  async markAllNotificationsAsRead(@CurrentUser() user: User): Promise<number> {
    const count = await this.notificationsService.markAllAsRead(user.id);

    if (count > 0) {
      // 실시간 업데이트를 위한 구독 이벤트 발생
      this.pubSub.publish(`notification_updated_${user.id}`, {
        notificationUpdated: { allRead: true, count },
      });
    }

    return count;
  }

  /**
   * 알림 삭제
   */
  @Mutation(() => Boolean, { description: '알림 삭제' })
  @UseGuards(GqlAuthGuard)
  async deleteNotification(
    @CurrentUser() user: User,
    @Args('notificationId') notificationId: string,
  ): Promise<boolean> {
    return await this.notificationsService.deleteNotification(
      notificationId,
      user.id,
    );
  }

  /**
   * 새로운 알림 실시간 구독
   */
  @Subscription(() => Notification, {
    description: '새로운 알림 실시간 구독',
    filter: (payload, variables, context) => {
      // 현재 사용자의 알림만 필터링
      return payload.newNotification.recipientId === context.req.user.id;
    },
  })
  @UseGuards(GqlAuthGuard)
  newNotification(@CurrentUser() user: User) {
    return this.pubSub.asyncIterator('notification_created');
  }

  /**
   * 알림 업데이트 실시간 구독 (읽음 처리 등)
   */
  @Subscription(() => String, {
    description: '알림 업데이트 실시간 구독',
  })
  @UseGuards(GqlAuthGuard)
  notificationUpdated(@CurrentUser() user: User) {
    return this.pubSub.asyncIterator(`notification_updated_${user.id}`);
  }
}

/**
 * 알림 업데이트 이벤트 타입
 */
@ObjectType()
export class NotificationUpdateEvent {
  @Field({ nullable: true, description: '업데이트된 알림 ID' })
  notificationId?: string;

  @Field({ nullable: true, description: '읽음 상태' })
  isRead?: boolean;

  @Field({ nullable: true, description: '모든 알림 읽음 처리 여부' })
  allRead?: boolean;

  @Field(() => Int, { nullable: true, description: '처리된 알림 개수' })
  count?: number;
}
