import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback, FeedbackStatus, FeedbackPriority } from '../../entities/feedback.entity';
import { User } from '../../entities/user.entity';
import { CreateFeedbackInput } from './feedback.input';

/**
 * 피드백 서비스
 *
 * 피드백 관련 비즈니스 로직을 처리합니다.
 */
@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback)
    private readonly feedbackRepository: Repository<Feedback>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * 피드백 생성
   */
  async createFeedback(
    user: User,
    input: CreateFeedbackInput,
  ): Promise<Feedback> {
    // 피드백 생성
    const feedback = this.feedbackRepository.create({
      title: input.title,
      content: input.content,
      type: input.type,
      status: FeedbackStatus.NEW,
      priority: FeedbackPriority.MEDIUM,
      attachmentUrl: input.attachmentUrl,
      contactInfo: input.contactInfo,
      submitterId: user.id,
    });

    return await this.feedbackRepository.save(feedback);
  }

  /**
   * 사용자의 피드백 목록 조회
   */
  async getUserFeedbacks(
    user: User,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    feedbacks: Feedback[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const [feedbacks, total] = await this.feedbackRepository.findAndCount({
      where: { submitterId: user.id },
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
   * 특정 피드백 조회
   */
  async getFeedbackById(feedbackId: string, user: User): Promise<Feedback> {
    const feedback = await this.feedbackRepository.findOne({
      where: { id: feedbackId },
      relations: ['submitter', 'responder'],
    });

    if (!feedback) {
      throw new NotFoundException('피드백을 찾을 수 없습니다.');
    }

    // 본인이 작성한 피드백만 조회 가능
    if (feedback.submitterId !== user.id) {
      throw new ForbiddenException('접근 권한이 없습니다.');
    }

    return feedback;
  }
}
