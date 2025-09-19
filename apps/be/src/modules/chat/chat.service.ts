import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Brackets } from 'typeorm';
import { ChatRoom, ChatRoomType } from '../../entities/chat-room.entity';
import {
  ChatMessage,
  ChatMessageType,
} from '../../entities/chat-message.entity';
import { User } from '../../entities/user.entity';
import { UserTeam } from '../../entities/user-team.entity';
import { Team } from '../../entities/team.entity';
import { ProgressService } from '../progress/progress.service';

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
    private readonly progressService: ProgressService, // 포인트/경험치 적립 서비스 주입
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
        new Brackets((qb) => {
          qb.where('chatRoom.teamId IS NULL');
          if (userTeamIds.length > 0) {
            qb.orWhere('chatRoom.teamId IN (:...teamIds)', {
              teamIds: userTeamIds,
            });
          }
        }),
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

    // === 포인트/경험치 적립 처리 (채팅 메시지 작성 액션) ===
    // 실패하더라도 채팅 흐름을 방해하지 않도록 별도 예외 전파 없이 로깅만 수행
    this.progressService
      .awardChatMessage(userId)
      .catch((err) =>
        console.error('[Progress] 채팅 메시지 적립 실패:', err?.message || err),
      );

    // === 팀별 경험치 적립 처리 ===
    // 팀 채팅방인 경우 해당 팀에 경험치 부여
    if (chatRoom.teamId) {
      this.progressService
        .awardTeamExperienceForChat(userId, chatRoom.teamId, savedMessage.id)
        .catch((err) =>
          console.error('[Progress] 팀 경험치 적립 실패:', err?.message || err),
        );
    } else {
      // 공용 채팅방인 경우 사용자의 모든 팀에 경험치 부여 (선택사항)
      // this.progressService
      //   .awardExperienceToAllUserTeams(userId, UserProgressAction.CHAT_MESSAGE, savedMessage.id, 'CHAT_MESSAGE')
      //   .catch((err) =>
      //     console.error('[Progress] 전체 팀 경험치 적립 실패:', err?.message || err),
      //   );
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

  /**
   * 1대1 개인 채팅방 생성 또는 조회
   * 두 사용자 간의 개인 채팅방이 이미 존재하면 기존 채팅방을 반환하고,
   * 없으면 새로운 개인 채팅방을 생성합니다.
   */
  async createOrGetPrivateChat(
    userId1: string,
    userId2: string,
  ): Promise<ChatRoom> {
    // 자기 자신과의 채팅방은 생성할 수 없음
    if (userId1 === userId2) {
      throw new Error('자기 자신과의 채팅방은 생성할 수 없습니다.');
    }

    // 두 사용자 정보 조회
    const [user1, user2] = await Promise.all([
      this.userRepository.findOne({ where: { id: userId1 } }),
      this.userRepository.findOne({ where: { id: userId2 } }),
    ]);

    if (!user1 || !user2) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // 기존 1대1 채팅방 조회 (두 사용자가 모두 참여하고 있는 PRIVATE 타입 채팅방)
    const subQuery = this.chatRoomRepository
      .createQueryBuilder('subChatRoom')
      .select('subChatRoom.id')
      .innerJoin('subChatRoom.participants', 'subParticipants')
      .where('subChatRoom.type = :type', { type: ChatRoomType.PRIVATE })
      .andWhere('subParticipants.id IN (:...userIds)', {
        userIds: [userId1, userId2],
      })
      .groupBy('subChatRoom.id')
      .having('COUNT(DISTINCT subParticipants.id) = 2');

    const existingChatRoom = await this.chatRoomRepository
      .createQueryBuilder('chatRoom')
      .leftJoinAndSelect('chatRoom.participants', 'participants')
      .where(`chatRoom.id IN (${subQuery.getQuery()})`)
      .setParameters(subQuery.getParameters())
      .getOne();

    if (existingChatRoom) {
      // 기존 채팅방이 있으면 참여자 정보와 함께 반환
      const foundChatRoom = await this.chatRoomRepository.findOne({
        where: { id: existingChatRoom.id },
        relations: ['participants', 'team'],
      });

      if (!foundChatRoom) {
        throw new NotFoundException('채팅방을 찾을 수 없습니다.');
      }

      return foundChatRoom;
    }

    // 새로운 1대1 채팅방 생성
    const chatRoomName = this.generatePrivateChatName(user1, user2);

    const newChatRoom = this.chatRoomRepository.create({
      name: chatRoomName,
      description: `${user1.nickname}님과 ${user2.nickname}님의 개인 채팅`,
      type: ChatRoomType.PRIVATE,
      maxParticipants: 2,
      currentParticipants: 2,
      isRoomActive: true,
      teamId: undefined, // 개인 채팅방은 팀에 속하지 않음
      participants: [user1, user2],
    });

    const savedChatRoom = await this.chatRoomRepository.save(newChatRoom);

    // 시스템 메시지 생성 (채팅방 생성 알림)
    const systemMessage = this.chatMessageRepository.create({
      content: `${user1.nickname}님과 ${user2.nickname}님이 채팅을 시작했습니다.`,
      type: ChatMessageType.SYSTEM,
      authorId: user1.id, // 채팅을 시작한 사용자
      roomId: savedChatRoom.id,
    });

    await this.chatMessageRepository.save(systemMessage);

    // 채팅방 최근 메시지 정보 업데이트
    savedChatRoom.updateLastMessage(systemMessage.content, new Date());
    savedChatRoom.incrementMessageCount();
    await this.chatRoomRepository.save(savedChatRoom);

    // 관계 정보와 함께 반환
    const finalChatRoom = await this.chatRoomRepository.findOne({
      where: { id: savedChatRoom.id },
      relations: ['participants', 'team'],
    });

    if (!finalChatRoom) {
      throw new Error('채팅방 생성 후 조회에 실패했습니다.');
    }

    return finalChatRoom;
  }

  /**
   * 1대1 개인 채팅방 이름 생성
   * 두 사용자의 닉네임을 조합하여 채팅방 이름을 생성합니다.
   */
  private generatePrivateChatName(user1: User, user2: User): string {
    // 닉네임을 알파벳 순으로 정렬하여 일관된 이름 생성
    const names = [user1.nickname, user2.nickname].sort();
    return `${names[0]} & ${names[1]}`;
  }

  /**
   * 사용자의 1대1 개인 채팅방 목록 조회
   * 사용자가 참여하고 있는 모든 개인 채팅방을 조회합니다.
   */
  async getUserPrivateChats(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const queryBuilder = this.chatRoomRepository
      .createQueryBuilder('chatRoom')
      .leftJoinAndSelect('chatRoom.participants', 'participants')
      .leftJoinAndSelect('chatRoom.team', 'team')
      .where('chatRoom.type = :type', { type: ChatRoomType.PRIVATE })
      .andWhere('chatRoom.teamId IS NULL') // 팀에 속하지 않은 개인 채팅방
      .andWhere('chatRoom.isRoomActive = :isActive', { isActive: true })
      .andWhere('participants.id = :userId', { userId })
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
   * 사용자 검색 (1대1 채팅 시작용)
   * 닉네임으로 사용자를 검색합니다.
   */
  async searchUsersForChat(
    searchQuery: string,
    currentUserId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    if (!searchQuery.trim()) {
      return {
        users: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .where('user.id != :currentUserId', { currentUserId }) // 자기 자신 제외
      .andWhere('user.nickname ILIKE :searchQuery', {
        searchQuery: `%${searchQuery.trim()}%`,
      })
      .orderBy('user.nickname', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [users, total] = await queryBuilder.getManyAndCount();

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 1대1 채팅방에서 상대방 정보 조회
   * 개인 채팅방에서 현재 사용자가 아닌 상대방의 정보를 반환합니다.
   */
  async getPrivateChatPartner(
    roomId: string,
    currentUserId: string,
  ): Promise<User | null> {
    const chatRoom = await this.chatRoomRepository.findOne({
      where: { id: roomId, type: ChatRoomType.PRIVATE },
      relations: ['participants'],
    });

    if (!chatRoom || chatRoom.participants.length !== 2) {
      return null;
    }

    // 현재 사용자가 아닌 상대방 찾기
    const partner = chatRoom.participants.find(
      (participant) => participant.id !== currentUserId,
    );

    return partner || null;
  }
}
