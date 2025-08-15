import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';
import { ChatRoom } from '../../entities/chat-room.entity';
import { ChatMessage } from '../../entities/chat-message.entity';
import { UserTeam } from '../../entities/user-team.entity';
import { ObjectType, Field } from '@nestjs/graphql';

// === GraphQL 타입 정의 ===

@ObjectType()
export class PaginatedUserChatRooms {
  @Field(() => [ChatRoom], { description: '사용자 접근 가능한 채팅방 목록' })
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
export class PaginatedPublicChatRooms {
  @Field(() => [ChatRoom], { description: '공용 채팅방 목록' })
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
export class PaginatedChatMessages {
  @Field(() => [ChatMessage], { description: '채팅 메시지 목록' })
  messages: ChatMessage[];

  @Field(() => Int, { description: '총 메시지 수' })
  total: number;

  @Field(() => Int, { description: '현재 페이지' })
  page: number;

  @Field(() => Int, { description: '페이지당 항목 수' })
  limit: number;

  @Field(() => Int, { description: '총 페이지 수' })
  totalPages: number;

  @Field(() => ChatRoom, { description: '채팅방 정보' })
  chatRoom: ChatRoom;
}

@ObjectType()
export class SearchUsersResponse {
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

/**
 * 채팅 리졸버
 *
 * 채팅방 및 메시지 관련 GraphQL API를 제공합니다.
 * 팀별 채팅방 필터링 및 공용 채팅방 기능을 포함합니다.
 */
@Resolver()
@UseGuards(GqlAuthGuard)
export class ChatResolver {
  constructor(private readonly chatService: ChatService) {}

  // === 채팅방 조회 ===

  @Query(() => PaginatedUserChatRooms, {
    description:
      '사용자가 접근 가능한 채팅방 목록 조회 (팀 채팅방 + 공용 채팅방)',
  })
  async getUserChatRooms(
    @CurrentUser() user: User,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
  ): Promise<PaginatedUserChatRooms> {
    return await this.chatService.getUserAccessibleChatRooms(
      user.id,
      page,
      limit,
    );
  }

  @Query(() => PaginatedPublicChatRooms, {
    description: '공용 채팅방 목록 조회 (모든 사용자 접근 가능)',
  })
  async getPublicChatRooms(
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
  ): Promise<PaginatedPublicChatRooms> {
    return await this.chatService.getPublicChatRooms(page, limit);
  }

  @Query(() => PaginatedUserChatRooms, {
    description: '특정 팀의 채팅방 목록 조회',
  })
  async getTeamChatRooms(
    @Args('teamId') teamId: string,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
  ): Promise<PaginatedUserChatRooms> {
    return await this.chatService.getTeamChatRooms(teamId, page, limit);
  }

  @Query(() => ChatRoom, {
    description: '채팅방 상세 정보 조회 (접근 권한 확인 포함)',
  })
  async getChatRoom(
    @CurrentUser() user: User,
    @Args('roomId') roomId: string,
  ): Promise<ChatRoom> {
    return await this.chatService.getChatRoomById(roomId, user.id);
  }

  // === 메시지 관련 ===

  @Query(() => PaginatedChatMessages, {
    description: '채팅방 메시지 목록 조회 (접근 권한 확인 포함)',
  })
  async getChatMessages(
    @CurrentUser() user: User,
    @Args('roomId') roomId: string,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 50 }) limit: number,
  ): Promise<PaginatedChatMessages> {
    return await this.chatService.getChatMessages(roomId, user.id, page, limit);
  }

  @Mutation(() => ChatMessage, {
    description: '메시지 전송 (접근 권한 확인 포함)',
  })
  async sendChatMessage(
    @CurrentUser() user: User,
    @Args('roomId') roomId: string,
    @Args('content') content: string,
    @Args('replyToMessageId', { nullable: true }) replyToMessageId?: string,
  ): Promise<ChatMessage> {
    return await this.chatService.sendMessage(
      roomId,
      user.id,
      content,
      replyToMessageId,
    );
  }

  // === 채팅방 참여/나가기 ===

  @Mutation(() => Boolean, {
    description: '채팅방 참여 (접근 권한 확인 포함)',
  })
  async joinChatRoom(
    @CurrentUser() user: User,
    @Args('roomId') roomId: string,
  ): Promise<boolean> {
    return await this.chatService.joinChatRoom(roomId, user.id);
  }

  @Mutation(() => Boolean, {
    description: '채팅방 나가기',
  })
  async leaveChatRoom(
    @CurrentUser() user: User,
    @Args('roomId') roomId: string,
  ): Promise<boolean> {
    return await this.chatService.leaveChatRoom(roomId, user.id);
  }

  // === 사용자 팀 정보 ===

  @Query(() => [UserTeam], {
    description: '사용자의 팀 목록 조회 (채팅방 필터링용)',
  })
  async getUserTeamsForChat(@CurrentUser() user: User): Promise<UserTeam[]> {
    return await this.chatService.getUserTeams(user.id);
  }

  // === 1대1 개인 채팅 ===

  @Mutation(() => ChatRoom, {
    description: '1대1 개인 채팅방 생성 또는 조회',
  })
  async createOrGetPrivateChat(
    @CurrentUser() user: User,
    @Args('targetUserId') targetUserId: string,
  ): Promise<ChatRoom> {
    return await this.chatService.createOrGetPrivateChat(user.id, targetUserId);
  }

  @Query(() => PaginatedUserChatRooms, {
    description: '사용자의 1대1 개인 채팅방 목록 조회',
  })
  async getUserPrivateChats(
    @CurrentUser() user: User,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
  ): Promise<PaginatedUserChatRooms> {
    return await this.chatService.getUserPrivateChats(user.id, page, limit);
  }

  @Query(() => SearchUsersResponse, {
    description: '사용자 검색 (1대1 채팅 시작용)',
  })
  async searchUsersForChat(
    @CurrentUser() user: User,
    @Args('searchQuery') searchQuery: string,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
  ): Promise<SearchUsersResponse> {
    return await this.chatService.searchUsersForChat(
      searchQuery,
      user.id,
      page,
      limit,
    );
  }

  @Query(() => User, {
    nullable: true,
    description: '1대1 채팅방에서 상대방 정보 조회',
  })
  async getPrivateChatPartner(
    @CurrentUser() user: User,
    @Args('roomId') roomId: string,
  ): Promise<User | null> {
    return await this.chatService.getPrivateChatPartner(roomId, user.id);
  }
}
