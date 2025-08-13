import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ChatRoom } from '../../entities/chat-room.entity';
import { ChatMessage } from '../../entities/chat-message.entity';
import { User } from '../../entities/user.entity';
import { UserTeam } from '../../entities/user-team.entity';
import { Team } from '../../entities/team.entity';

/**
 * 채팅 서비스
 *
 * 채팅방 및 메시지 관련 비즈니스 로직을 처리합니다.
 * 팀별 채팅방 필터링 및 공용 채팅방 기능을 제공합니다.
 */
@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatRoom)
    private readonly chatRoomRepository: Repository<ChatRoom>,
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepository: Repository<ChatMessage>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserTeam)
    private readonly userTeamRepository: Repository<UserTeam>,
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
  ) {}

  /**
   * 사용자가 접근 가능한 채팅방 목록 조회
   * - 사용자의 팀 채팅방
   * - 공용 채팅방 (teamId가 null인 채팅방)
   */
  async getUserAccessibleChatRooms(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    // 사용자의 팀 목록 조회
    const userTeams = await this.userTeamRepository.find({
      where: { userId },
      relations: ['team'],
    });

    const userTeamIds = userTeams.map((ut) => ut.teamId);

    // 사용자가 접근 가능한 채팅방 조회
    // 1. 사용자의 팀 채팅방
    // 2. 공용 채팅방 (teamId가 null)
    const queryBuilder = this.chatRoomRepository
      .createQueryBuilder('chatRoom')
      .leftJoinAndSelect('chatRoom.team', 'team')
      .leftJoinAndSelect('chatRoom.participants', 'participants')
      .where('chatRoom.isRoomActive = :isActive', { isActive: true })
      .andWhere(
        '(chatRoom.teamId IS NULL OR chatRoom.teamId IN (:...teamIds))',
        { teamIds: userTeamIds.length > 0 ? userTeamIds : [''] },
      )
      .orderBy('chatRoom.lastMessageAt', 'DESC')
      .addOrderBy('chatRoom.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [chatRooms, total] = await queryBuilder.getManyAndCount();

    return {
      chatRooms,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 공용 채팅방 목록 조회 (모든 사용자 접근 가능)
   */
  async getPublicChatRooms(page: number = 1, limit: number = 20) {
    const queryBuilder = this.chatRoomRepository
      .createQueryBuilder('chatRoom')
      .leftJoinAndSelect('chatRoom.team', 'team')
      .leftJoinAndSelect('chatRoom.participants', 'participants')
      .where('chatRoom.teamId IS NULL') // 공용 채팅방 (팀에 속하지 않음)
      .andWhere('chatRoom.isRoomActive = :isActive', { isActive: true })
      .orderBy('chatRoom.lastMessageAt', 'DESC')
      .addOrderBy('chatRoom.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [chatRooms, total] = await queryBuilder.getManyAndCount();

    return {
      chatRooms,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 특정 팀의 채팅방 목록 조회
   */
  async getTeamChatRooms(teamId: string, page: number = 1, limit: number = 20) {
    const [chatRooms, total] = await this.chatRoomRepository.findAndCount({
      where: {
        teamId,
        isRoomActive: true,
      },
      relations: ['team', 'participants'],
      order: {
        lastMessageAt: 'DESC',
        createdAt: 'DESC',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      chatRooms,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 채팅방 상세 정보 조회 (접근 권한 확인 포함)
   */
  async getChatRoomById(roomId: string, userId: string): Promise<ChatRoom> {
    const chatRoom = await this.chatRoomRepository.findOne({
      where: { id: roomId },
      relations: ['team', 'participants'],
    });

    if (!chatRoom) {
      throw new NotFoundException('채팅방을 찾을 수 없습니다.');
    }

    // 접근 권한 확인
    const hasAccess = await this.checkUserChatRoomAccess(userId, chatRoom);
    if (!hasAccess) {
      throw new NotFoundException('접근 권한이 없는 채팅방입니다.');
    }

    return chatRoom;
  }

  /**
   * 사용자의 채팅방 접근 권한 확인
   */
  private async checkUserChatRoomAccess(
    userId: string,
    chatRoom: ChatRoom,
  ): Promise<boolean> {
    // 공용 채팅방인 경우 모든 사용자 접근 가능
    if (chatRoom.isGeneralChat()) {
      return true;
    }

    // 팀 채팅방인 경우 해당 팀 멤버만 접근 가능
    if (chatRoom.isTeamChat() && chatRoom.teamId) {
      const userTeam = await this.userTeamRepository.findOne({
        where: {
          userId,
          teamId: chatRoom.teamId,
        },
      });
      return !!userTeam;
    }

    return false;
  }

  /**
   * 채팅방 메시지 조회 (접근 권한 확인 포함)
   */
  async getChatMessages(
    roomId: string,
    userId: string,
    page: number = 1,
    limit: number = 50,
  ) {
    // 채팅방 접근 권한 확인
    const chatRoom = await this.getChatRoomById(roomId, userId);

    const [messages, total] = await this.chatMessageRepository.findAndCount({
      where: { roomId },
      relations: ['author', 'replyToMessage', 'replyToMessage.author'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      messages: messages.reverse(), // 최신 메시지가 아래로 오도록 순서 변경
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      chatRoom,
    };
  }

  /**
   * 메시지 전송 (접근 권한 확인 포함)
   */
  async sendMessage(
    roomId: string,
    userId: string,
    content: string,
    replyToMessageId?: string,
  ): Promise<ChatMessage> {
    // 채팅방 접근 권한 확인
    const chatRoom = await this.getChatRoomById(roomId, userId);

    // 사용자 정보 조회
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // 답장 메시지 확인 (선택사항)
    let replyToMessage: ChatMessage | null = null;
    if (replyToMessageId) {
      replyToMessage = await this.chatMessageRepository.findOne({
        where: { id: replyToMessageId, roomId },
      });
    }

    // 메시지 생성
    const message = this.chatMessageRepository.create({
      content,
      authorId: userId,
      roomId,
      replyToMessageId: replyToMessage?.id || undefined,
    });

    const savedMessage = await this.chatMessageRepository.save(message);

    // 채팅방 최근 메시지 정보 업데이트
    chatRoom.updateLastMessage(content, new Date());
    chatRoom.incrementMessageCount();
    await this.chatRoomRepository.save(chatRoom);

    // 관계 정보와 함께 메시지 반환
    const messageWithRelations = await this.chatMessageRepository.findOne({
      where: { id: savedMessage.id },
      relations: ['author', 'replyToMessage', 'replyToMessage.author'],
    });

    if (!messageWithRelations) {
      throw new Error('메시지 저장 후 조회에 실패했습니다.');
    }

    return messageWithRelations;
  }

  /**
   * 채팅방 참여 (접근 권한 확인 포함)
   */
  async joinChatRoom(roomId: string, userId: string): Promise<boolean> {
    const chatRoom = await this.getChatRoomById(roomId, userId);

    // 이미 참여 중인지 확인
    const isAlreadyParticipant = chatRoom.participants.some(
      (p) => p.id === userId,
    );

    if (isAlreadyParticipant) {
      return true; // 이미 참여 중
    }

    // 참여 가능 여부 확인
    if (!chatRoom.canJoin()) {
      throw new Error('채팅방에 참여할 수 없습니다.');
    }

    // 사용자 정보 조회
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // 참여자 추가
    chatRoom.participants.push(user);
    chatRoom.incrementParticipants();

    await this.chatRoomRepository.save(chatRoom);
    return true;
  }

  /**
   * 채팅방 나가기
   */
  async leaveChatRoom(roomId: string, userId: string): Promise<boolean> {
    const chatRoom = await this.getChatRoomById(roomId, userId);

    // 참여자 목록에서 제거
    chatRoom.participants = chatRoom.participants.filter(
      (p) => p.id !== userId,
    );
    chatRoom.decrementParticipants();

    await this.chatRoomRepository.save(chatRoom);
    return true;
  }

  /**
   * 사용자의 팀 목록 조회 (채팅방 필터링용)
   */
  async getUserTeams(userId: string) {
    return await this.userTeamRepository.find({
      where: { userId },
      relations: ['team'],
      order: { priority: 'ASC' },
    });
  }
}
