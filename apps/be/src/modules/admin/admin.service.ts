import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../../entities/user.entity';
import { Post } from '../../entities/post.entity';
import { ChatRoom, ChatRoomType } from '../../entities/chat-room.entity';
import { ChatMessage } from '../../entities/chat-message.entity';
import { Report, ReportStatus } from '../../entities/report.entity';
import {
  Feedback,
  FeedbackStatus,
  FeedbackPriority,
} from '../../entities/feedback.entity';

/**
 * 관리자 서비스
 *
 * 관리자 전용 기능들을 처리하는 서비스입니다.
 */
@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(ChatRoom)
    private readonly chatRoomRepository: Repository<ChatRoom>,
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepository: Repository<ChatMessage>,
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    @InjectRepository(Feedback)
    private readonly feedbackRepository: Repository<Feedback>,
  ) {}

  /**
   * 관리자 권한 확인
   */
  private validateAdminPermission(user: User): void {
    if (!user.isAdmin()) {
      throw new ForbiddenException('관리자 권한이 필요합니다.');
    }
  }

  // === 대시보드 통계 ===

  /**
   * 관리자 대시보드 통계 조회
   */
  async getDashboardStats(adminUser: User) {
    this.validateAdminPermission(adminUser);

    const [
      totalUsers,
      totalPosts,
      totalChatRooms,
      totalReports,
      activeUsers,
      recentPosts,
      pendingReports,
    ] = await Promise.all([
      this.userRepository.count(),
      this.postRepository.count(),
      this.chatRoomRepository.count(),
      this.reportRepository.count(),
      this.userRepository.count({
        where: {
          updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24시간 이내
        },
      }),
      this.postRepository.count({
        where: {
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24시간 이내
        },
      }),
      this.reportRepository.count({
        where: { status: ReportStatus.PENDING },
      }),
    ]);

    return {
      totalUsers,
      totalPosts,
      totalChatRooms,
      totalReports,
      activeUsers,
      recentPosts,
      pendingReports,
    };
  }

  // === 사용자 관리 ===

  /**
   * 모든 사용자 목록 조회
   */
  async getAllUsers(adminUser: User, page: number = 1, limit: number = 20) {
    this.validateAdminPermission(adminUser);

    const [users, total] = await this.userRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 사용자 역할 변경
   */
  async changeUserRole(adminUser: User, userId: string, newRole: UserRole) {
    this.validateAdminPermission(adminUser);

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    user.role = newRole;
    await this.userRepository.save(user);

    return user;
  }

  /**
   * 사용자 계정 비활성화/활성화
   */
  async toggleUserStatus(adminUser: User, userId: string) {
    this.validateAdminPermission(adminUser);

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // 사용자 상태 토글 로직 (필요시 User 엔티티에 isActive 필드 추가)
    await this.userRepository.save(user);

    return user;
  }

  // === 채팅방 관리 ===

  /**
   * 모든 채팅방 목록 조회
   */
  async getAllChatRooms(adminUser: User, page: number = 1, limit: number = 20) {
    this.validateAdminPermission(adminUser);

    const [chatRooms, total] = await this.chatRoomRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
      relations: ['participants'],
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
   * 채팅방 생성
   */
  async createChatRoom(
    adminUser: User,
    name: string,
    description?: string,
    type: ChatRoomType = ChatRoomType.PUBLIC,
    maxParticipants: number = 100,
  ) {
    this.validateAdminPermission(adminUser);

    const chatRoom = this.chatRoomRepository.create({
      name,
      description,
      type,
      maxParticipants,
      isRoomActive: true,
    });

    return await this.chatRoomRepository.save(chatRoom);
  }

  /**
   * 채팅방 삭제
   */
  async deleteChatRoom(adminUser: User, roomId: string) {
    this.validateAdminPermission(adminUser);

    const chatRoom = await this.chatRoomRepository.findOne({
      where: { id: roomId },
    });

    if (!chatRoom) {
      throw new NotFoundException('채팅방을 찾을 수 없습니다.');
    }

    await this.chatRoomRepository.remove(chatRoom);
    return true;
  }

  /**
   * 채팅방 수정
   */
  async updateChatRoom(
    adminUser: User,
    roomId: string,
    updates: {
      name?: string;
      description?: string;
      maxParticipants?: number;
      isRoomActive?: boolean;
    },
  ) {
    this.validateAdminPermission(adminUser);

    const chatRoom = await this.chatRoomRepository.findOne({
      where: { id: roomId },
    });

    if (!chatRoom) {
      throw new NotFoundException('채팅방을 찾을 수 없습니다.');
    }

    Object.assign(chatRoom, updates);
    return await this.chatRoomRepository.save(chatRoom);
  }

  // === 게시물 관리 ===

  /**
   * 모든 게시물 목록 조회
   */
  async getAllPosts(adminUser: User, page: number = 1, limit: number = 20) {
    this.validateAdminPermission(adminUser);

    const [posts, total] = await this.postRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
      relations: ['author'],
    });

    return {
      posts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 게시물 삭제
   */
  async deletePost(adminUser: User, postId: string) {
    this.validateAdminPermission(adminUser);

    const post = await this.postRepository.findOne({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('게시물을 찾을 수 없습니다.');
    }

    await this.postRepository.remove(post);
    return true;
  }

  // === 신고 관리 ===

  /**
   * 모든 신고 목록 조회
   */
  async getAllReports(adminUser: User, page: number = 1, limit: number = 20) {
    this.validateAdminPermission(adminUser);

    const [reports, total] = await this.reportRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
      relations: ['reporter', 'reportedUser', 'reportedPost'],
    });

    return {
      reports,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // === 피드백 관리 ===

  /**
   * 모든 피드백 목록 조회
   */
  async getAllFeedbacks(adminUser: User, page: number = 1, limit: number = 20) {
    this.validateAdminPermission(adminUser);

    const [feedbacks, total] = await this.feedbackRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
      relations: ['submitter', 'responder'],
    });

    return {
      feedbacks,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 피드백 상태별 조회
   */
  async getFeedbacksByStatus(
    adminUser: User,
    status: FeedbackStatus,
    page: number = 1,
    limit: number = 20,
  ) {
    this.validateAdminPermission(adminUser);

    const [feedbacks, total] = await this.feedbackRepository.findAndCount({
      where: { status },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
      relations: ['submitter', 'responder'],
    });

    return {
      feedbacks,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 피드백 응답 추가
   */
  async respondToFeedback(
    adminUser: User,
    feedbackId: string,
    response: string,
  ) {
    this.validateAdminPermission(adminUser);

    const feedback = await this.feedbackRepository.findOne({
      where: { id: feedbackId },
    });

    if (!feedback) {
      throw new NotFoundException('피드백을 찾을 수 없습니다.');
    }

    feedback.addAdminResponse(response, adminUser.id);
    await this.feedbackRepository.save(feedback);

    return feedback;
  }

  /**
   * 피드백 상태 업데이트
   */
  async updateFeedbackStatus(
    adminUser: User,
    feedbackId: string,
    status: FeedbackStatus,
  ) {
    this.validateAdminPermission(adminUser);

    const feedback = await this.feedbackRepository.findOne({
      where: { id: feedbackId },
    });

    if (!feedback) {
      throw new NotFoundException('피드백을 찾을 수 없습니다.');
    }

    feedback.updateStatus(status);
    await this.feedbackRepository.save(feedback);

    return feedback;
  }

  /**
   * 피드백 우선순위 업데이트
   */
  async updateFeedbackPriority(
    adminUser: User,
    feedbackId: string,
    priority: FeedbackPriority,
  ) {
    this.validateAdminPermission(adminUser);

    const feedback = await this.feedbackRepository.findOne({
      where: { id: feedbackId },
    });

    if (!feedback) {
      throw new NotFoundException('피드백을 찾을 수 없습니다.');
    }

    feedback.updatePriority(priority);
    await this.feedbackRepository.save(feedback);

    return feedback;
  }
}
