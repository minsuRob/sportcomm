import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report, ReportType, ReportStatus } from '../../entities/report.entity';
import { Block } from '../../entities/block.entity';
import { User } from '../../entities/user.entity';
import { Post } from '../../entities/post.entity';
import { ChatMessage } from '../../entities/chat-message.entity';

/**
 * 신고 생성 입력 인터페이스
 */
export interface CreateReportInput {
  type: ReportType;
  reason: string;
  reportedUserId?: string;
  postId?: string;
  messageId?: string;
}

/**
 * 조정 서비스
 * 신고 및 차단 기능을 관리합니다.
 */
@Injectable()
export class ModerationService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    @InjectRepository(Block)
    private readonly blockRepository: Repository<Block>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepository: Repository<ChatMessage>,
  ) {}

  /**
   * 신고 생성
   * @param reporterId 신고자 ID
   * @param input 신고 정보
   * @returns 생성된 신고
   */
  async createReport(
    reporterId: string,
    input: CreateReportInput,
  ): Promise<Report> {
    const { type, reason, reportedUserId, postId, messageId } = input;

    // 신고 대상 검증
    if (!reportedUserId && !postId && !messageId) {
      throw new BadRequestException(
        '신고할 사용자, 게시물 또는 메시지를 지정해야 합니다.',
      );
    }

    // 자기 자신을 신고하는 것 방지
    if (reportedUserId === reporterId) {
      throw new BadRequestException('자기 자신을 신고할 수 없습니다.');
    }

    // 신고 대상 존재 확인
    if (reportedUserId) {
      const reportedUser = await this.userRepository.findOne({
        where: { id: reportedUserId },
      });
      if (!reportedUser) {
        throw new NotFoundException('신고할 사용자를 찾을 수 없습니다.');
      }
    }

    if (postId) {
      const post = await this.postRepository.findOne({
        where: { id: postId },
        relations: ['author'],
      });
      if (!post) {
        throw new NotFoundException('신고할 게시물을 찾을 수 없습니다.');
      }
      // 게시물 신고 시 작성자도 함께 설정
      if (!reportedUserId) {
        input.reportedUserId = post.author.id;
      }
    }

    if (messageId) {
      const message = await this.chatMessageRepository.findOne({
        where: { id: messageId },
        relations: ['author'],
      });
      if (!message) {
        throw new NotFoundException('신고할 메시지를 찾을 수 없습니다.');
      }
      // 메시지 신고 시 작성자도 함께 설정
      if (!reportedUserId) {
        input.reportedUserId = message.author.id;
      }
    }

    // 중복 신고 확인
    const existingReport = await this.reportRepository.findOne({
      where: {
        reporterId,
        reportedUserId: input.reportedUserId,
        postId,
        messageId,
        status: ReportStatus.PENDING,
      },
    });

    if (existingReport) {
      throw new BadRequestException('이미 신고한 내용입니다.');
    }

    // 신고 생성
    const report = this.reportRepository.create({
      type,
      reason,
      reporterId,
      reportedUserId: input.reportedUserId,
      postId,
      messageId,
      status: ReportStatus.PENDING,
    });

    return await this.reportRepository.save(report);
  }

  /**
   * 사용자 차단
   * @param blockerId 차단하는 사용자 ID
   * @param blockedUserId 차단당할 사용자 ID
   * @returns 생성된 차단 관계
   */
  async blockUser(blockerId: string, blockedUserId: string): Promise<Block> {
    // 자기 자신을 차단하는 것 방지
    if (blockerId === blockedUserId) {
      throw new BadRequestException('자기 자신을 차단할 수 없습니다.');
    }

    // 차단할 사용자 존재 확인
    const blockedUser = await this.userRepository.findOne({
      where: { id: blockedUserId },
    });
    if (!blockedUser) {
      throw new NotFoundException('차단할 사용자를 찾을 수 없습니다.');
    }

    // 이미 차단된 사용자인지 확인
    const existingBlock = await this.blockRepository.findOne({
      where: {
        blockerId,
        blockedUserId,
      },
    });

    if (existingBlock) {
      throw new BadRequestException('이미 차단된 사용자입니다.');
    }

    // 차단 관계 생성
    const block = this.blockRepository.create({
      blockerId,
      blockedUserId,
    });

    return await this.blockRepository.save(block);
  }

  /**
   * 사용자 차단 해제
   * @param blockerId 차단하는 사용자 ID
   * @param blockedUserId 차단당한 사용자 ID
   * @returns 성공 여부
   */
  async unblockUser(
    blockerId: string,
    blockedUserId: string,
  ): Promise<boolean> {
    const block = await this.blockRepository.findOne({
      where: {
        blockerId,
        blockedUserId,
      },
    });

    if (!block) {
      throw new NotFoundException('차단 관계를 찾을 수 없습니다.');
    }

    await this.blockRepository.remove(block);
    return true;
  }

  /**
   * 차단된 사용자 목록 조회
   * @param userId 사용자 ID
   * @returns 차단된 사용자 ID 배열
   */
  async getBlockedUserIds(userId: string): Promise<string[]> {
    const blocks = await this.blockRepository.find({
      where: { blockerId: userId },
      select: ['blockedUserId'],
    });

    return blocks.map((block) => block.blockedUserId);
  }

  /**
   * 특정 사용자가 차단되었는지 확인
   * @param blockerId 차단하는 사용자 ID
   * @param blockedUserId 확인할 사용자 ID
   * @returns 차단 여부
   */
  async isUserBlocked(
    blockerId: string,
    blockedUserId: string,
  ): Promise<boolean> {
    const block = await this.blockRepository.findOne({
      where: {
        blockerId,
        blockedUserId,
      },
    });

    return !!block;
  }

  /**
   * 신고 목록 조회 (관리자용)
   * @param page 페이지 번호
   * @param limit 페이지 크기
   * @returns 신고 목록
   */
  async getReports(page: number = 1, limit: number = 20) {
    const [reports, total] = await this.reportRepository.findAndCount({
      relations: ['reporter', 'reportedUser', 'post'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      reports,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 신고 처리 (관리자용)
   * @param reportId 신고 ID
   * @param status 처리 상태
   * @param adminNote 관리자 메모
   * @returns 업데이트된 신고
   */
  async processReport(
    reportId: string,
    status: ReportStatus,
    adminNote?: string,
  ): Promise<Report> {
    const report = await this.reportRepository.findOne({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException('신고를 찾을 수 없습니다.');
    }

    report.status = status;
    if (adminNote) {
      report.adminNote = adminNote;
    }

    return await this.reportRepository.save(report);
  }
}
