import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserRole } from '../../entities/user.entity';
import { Post } from '../../entities/post.entity';
import { ChatRoom, ChatRoomType } from '../../entities/chat-room.entity';
import { Report } from '../../entities/report.entity';
import {
  Feedback,
  FeedbackStatus,
  FeedbackPriority,
} from '../../entities/feedback.entity';
import { ObjectType, Field } from '@nestjs/graphql';

// === GraphQL 타입 정의 ===

@ObjectType()
export class AdminDashboardStats {
  @Field(() => Int, { description: '총 사용자 수' })
  totalUsers: number;

  @Field(() => Int, { description: '총 게시물 수' })
  totalPosts: number;

  @Field(() => Int, { description: '총 채팅방 수' })
  totalChatRooms: number;

  @Field(() => Int, { description: '총 신고 수' })
  totalReports: number;

  @Field(() => Int, { description: '활성 사용자 수 (24시간)' })
  activeUsers: number;

  @Field(() => Int, { description: '최근 게시물 수 (24시간)' })
  recentPosts: number;

  @Field(() => Int, { description: '대기 중인 신고 수' })
  pendingReports: number;
}

@ObjectType()
export class PaginatedUsers {
  @Field(() => [User], { description: '사용자 목록' })
  users: User[];

  @Field(() => Int, { description: '총 사용자 수' })
  total: number;

  @Field(() => Int, { description: '현재 페이지' })
  page: number;

  @Field(() => Int, { description: '페이지당 항목 수' })
  limit: number;

  @Field(() => Int, { description: '총 페이지 수' })
  totalPages: number;
}

@ObjectType()
export class PaginatedChatRooms {
  @Field(() => [ChatRoom], { description: '채팅방 목록' })
  chatRooms: ChatRoom[];

  @Field(() => Int, { description: '총 채팅방 수' })
  total: number;

  @Field(() => Int, { description: '현재 페이지' })
  page: number;

  @Field(() => Int, { description: '페이지당 항목 수' })
  limit: number;

  @Field(() => Int, { description: '총 페이지 수' })
  totalPages: number;
}

@ObjectType()
export class PaginatedPosts {
  @Field(() => [Post], { description: '게시물 목록' })
  posts: Post[];

  @Field(() => Int, { description: '총 게시물 수' })
  total: number;

  @Field(() => Int, { description: '현재 페이지' })
  page: number;

  @Field(() => Int, { description: '페이지당 항목 수' })
  limit: number;

  @Field(() => Int, { description: '총 페이지 수' })
  totalPages: number;
}

@ObjectType()
export class PaginatedReports {
  @Field(() => [Report], { description: '신고 목록' })
  reports: Report[];

  @Field(() => Int, { description: '총 신고 수' })
  total: number;

  @Field(() => Int, { description: '현재 페이지' })
  page: number;

  @Field(() => Int, { description: '페이지당 항목 수' })
  limit: number;

  @Field(() => Int, { description: '총 페이지 수' })
  totalPages: number;
}

/**
 * 관리자 리졸버
 *
 * 관리자 전용 GraphQL API를 제공합니다.
 */
@Resolver()
@UseGuards(JwtAuthGuard)
export class AdminResolver {
  constructor(private readonly adminService: AdminService) {}

  // === 대시보드 ===

  @Query(() => AdminDashboardStats, {
    description: '관리자 대시보드 통계 조회',
  })
  async adminDashboardStats(
    @CurrentUser() user: User,
  ): Promise<AdminDashboardStats> {
    return await this.adminService.getDashboardStats(user);
  }

  // === 사용자 관리 ===

  @Query(() => PaginatedUsers, { description: '모든 사용자 목록 조회' })
  async adminGetAllUsers(
    @CurrentUser() user: User,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
  ): Promise<PaginatedUsers> {
    return await this.adminService.getAllUsers(user, page, limit);
  }

  @Mutation(() => User, { description: '사용자 역할 변경' })
  async adminChangeUserRole(
    @CurrentUser() user: User,
    @Args('userId') userId: string,
    @Args('newRole', { type: () => UserRole }) newRole: UserRole,
  ): Promise<User> {
    return await this.adminService.changeUserRole(user, userId, newRole);
  }

  @Mutation(() => User, { description: '사용자 계정 상태 토글' })
  async adminToggleUserStatus(
    @CurrentUser() user: User,
    @Args('userId') userId: string,
  ): Promise<User> {
    return await this.adminService.toggleUserStatus(user, userId);
  }

  // === 채팅방 관리 ===

  @Query(() => PaginatedChatRooms, { description: '모든 채팅방 목록 조회' })
  async adminGetAllChatRooms(
    @CurrentUser() user: User,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
  ): Promise<PaginatedChatRooms> {
    return await this.adminService.getAllChatRooms(user, page, limit);
  }

  @Mutation(() => ChatRoom, { description: '채팅방 생성' })
  async adminCreateChatRoom(
    @CurrentUser() user: User,
    @Args('name') name: string,
    @Args('description', { nullable: true }) description?: string,
    @Args('type', {
      type: () => ChatRoomType,
      defaultValue: ChatRoomType.PUBLIC,
    })
    type?: ChatRoomType,
    @Args('maxParticipants', { type: () => Int, defaultValue: 100 })
    maxParticipants?: number,
  ): Promise<ChatRoom> {
    return await this.adminService.createChatRoom(
      user,
      name,
      description,
      type,
      maxParticipants,
    );
  }

  @Mutation(() => Boolean, { description: '채팅방 삭제' })
  async adminDeleteChatRoom(
    @CurrentUser() user: User,
    @Args('roomId') roomId: string,
  ): Promise<boolean> {
    return await this.adminService.deleteChatRoom(user, roomId);
  }

  @Mutation(() => ChatRoom, { description: '채팅방 수정' })
  async adminUpdateChatRoom(
    @CurrentUser() user: User,
    @Args('roomId') roomId: string,
    @Args('name', { nullable: true }) name?: string,
    @Args('description', { nullable: true }) description?: string,
    @Args('maxParticipants', { type: () => Int, nullable: true })
    maxParticipants?: number,
    @Args('isRoomActive', { nullable: true }) isRoomActive?: boolean,
  ): Promise<ChatRoom> {
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (maxParticipants !== undefined)
      updates.maxParticipants = maxParticipants;
    if (isRoomActive !== undefined) updates.isRoomActive = isRoomActive;

    return await this.adminService.updateChatRoom(user, roomId, updates);
  }

  // === 게시물 관리 ===

  @Query(() => PaginatedPosts, { description: '모든 게시물 목록 조회' })
  async adminGetAllPosts(
    @CurrentUser() user: User,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
  ): Promise<PaginatedPosts> {
    return await this.adminService.getAllPosts(user, page, limit);
  }

  @Mutation(() => Boolean, { description: '게시물 삭제' })
  async adminDeletePost(
    @CurrentUser() user: User,
    @Args('postId') postId: string,
  ): Promise<boolean> {
    return await this.adminService.deletePost(user, postId);
  }

  // === 신고 관리 ===

  @Query(() => PaginatedReports, { description: '모든 신고 목록 조회' })
  async adminGetAllReports(
    @CurrentUser() user: User,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
  ): Promise<PaginatedReports> {
    return await this.adminService.getAllReports(user, page, limit);
  }

  // === 피드백 관리 ===

  @Query(() => PaginatedFeedbacks, { description: '모든 피드백 목록 조회' })
  async adminGetAllFeedbacks(
    @CurrentUser() user: User,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
  ): Promise<PaginatedFeedbacks> {
    return await this.adminService.getAllFeedbacks(user, page, limit);
  }

  @Query(() => PaginatedFeedbacks, { description: '상태별 피드백 목록 조회' })
  async adminGetFeedbacksByStatus(
    @CurrentUser() user: User,
    @Args('status', { type: () => FeedbackStatus }) status: FeedbackStatus,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
  ): Promise<PaginatedFeedbacks> {
    return await this.adminService.getFeedbacksByStatus(
      user,
      status,
      page,
      limit,
    );
  }

  @Mutation(() => Feedback, { description: '피드백에 응답' })
  async adminRespondToFeedback(
    @CurrentUser() user: User,
    @Args('feedbackId') feedbackId: string,
    @Args('response') response: string,
  ): Promise<Feedback> {
    return await this.adminService.respondToFeedback(
      user,
      feedbackId,
      response,
    );
  }

  @Mutation(() => Feedback, { description: '피드백 상태 업데이트' })
  async adminUpdateFeedbackStatus(
    @CurrentUser() user: User,
    @Args('feedbackId') feedbackId: string,
    @Args('status', { type: () => FeedbackStatus }) status: FeedbackStatus,
  ): Promise<Feedback> {
    return await this.adminService.updateFeedbackStatus(
      user,
      feedbackId,
      status,
    );
  }

  @Mutation(() => Feedback, { description: '피드백 우선순위 업데이트' })
  async adminUpdateFeedbackPriority(
    @CurrentUser() user: User,
    @Args('feedbackId') feedbackId: string,
    @Args('priority', { type: () => FeedbackPriority })
    priority: FeedbackPriority,
  ): Promise<Feedback> {
    return await this.adminService.updateFeedbackPriority(
      user,
      feedbackId,
      priority,
    );
  }
}

@ObjectType()
export class PaginatedFeedbacks {
  @Field(() => [Feedback], { description: '피드백 목록' })
  feedbacks: Feedback[];

  @Field(() => Int, { description: '총 피드백 수' })
  total: number;

  @Field(() => Int, { description: '현재 페이지' })
  page: number;

  @Field(() => Int, { description: '페이지당 항목 수' })
  limit: number;

  @Field(() => Int, { description: '총 페이지 수' })
  totalPages: number;
}
