import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  User,
  UserProgressAction,
  USER_PROGRESS_REWARD,
  DAILY_POINT_LIMITS,
} from '../../entities/user.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  PointTransaction,
  PointTransactionType,
  PointReferenceType,
} from '../../entities/point-transaction.entity';

/**
 * ProgressService
 *
 * 사용자 활동(채팅 메시지 전송, 게시글 작성, 데일리 출석 등)에 따라
 * 포인트 변동을 처리하는 서비스.
 * (경험치/레벨 시스템 제거됨 → 포인트 중심)
 *
 * 이번 수정 사항:
 * - 포인트 적립/차감/커스텀 지급 시 point_transactions 테이블에 이력(스냅샷) 기록
 * - balanceAfter(변동 후 잔액) 저장으로 재계산 필요 최소화
 */
export interface AwardResult {
  userId: string;
  action: UserProgressAction;
  addedPoints: number;
  totalPoints: number;
  skipped?: boolean;
  timestamp: Date;
  isCustom?: boolean;
  reason?: string;
}

export interface UserProgressSnapshot {
  userId: string;
  points: number;
  lastAttendanceAt?: Date;
  dailyChatPoints: number;
  dailyPostPoints: number;
  lastDailyResetAt?: Date;
  timestamp: Date;
}

export interface DailyLimitsInfo {
  userId: string;
  dailyChatPoints: number;
  dailyPostPoints: number;
  chatPointLimit: number;
  postPointLimit: number;
  canSendChat: boolean;
  canCreatePost: boolean;
  lastResetAt?: Date;
  nextResetAt?: Date;
  timezone: string;
}

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(PointTransaction)
    private readonly pointTxRepo: Repository<PointTransaction>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ================== 내부 유틸 ==================

  /**
   * UserProgressAction → PointTransactionType 매핑
   */
  private mapActionToTxType(action: UserProgressAction): PointTransactionType {
    switch (action) {
      case UserProgressAction.CHAT_MESSAGE:
        return PointTransactionType.CHAT_MESSAGE;
      case UserProgressAction.POST_CREATE:
        return PointTransactionType.POST_CREATE;
      case UserProgressAction.DAILY_ATTENDANCE:
        return PointTransactionType.ATTENDANCE;
      default:
        return PointTransactionType.ADJUSTMENT;
    }
  }

  /**
   * PointTransaction 생성 및 저장 헬퍼
   * amount: 양수(적립) / 음수(차감)
   */
  private async recordPointTransaction(params: {
    manager?: Repository<PointTransaction> | any; // 트랜잭션 내 entityManager (선택)
    userId: string;
    amount: number;
    balanceAfter: number;
    type: PointTransactionType;
    description?: string;
    referenceType?: PointReferenceType;
    referenceId?: string;
    metadata?: Record<string, any>;
  }): Promise<PointTransaction> {
    const {
      manager,
      userId,
      amount,
      balanceAfter,
      type,
      description,
      referenceType,
      referenceId,
      metadata,
    } = params;

    const repo = manager
      ? manager.getRepository(PointTransaction)
      : this.pointTxRepo;

    const entity = repo.create({
      userId,
      amount,
      balanceAfter,
      type,
      description,
      referenceType,
      referenceId,
      metadata,
    });

    return repo.save(entity);
  }

  /**
   * 상점 구매 여부 추론 (차감 reason 기반 간단 heuristic)
   */
  private guessShopPurchase(reason?: string): boolean {
    if (!reason) return false;
    return /상점\s*구매|shop\s*purchase/i.test(reason);
    // 필요 시 아이템 아이디 패턴 등 추가
  }

  /**
   * 사용자 진행 상태 스냅샷 조회
   */
  async getUserProgress(
    userId: string,
    timezone: string = 'Asia/Seoul',
  ): Promise<UserProgressSnapshot> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    if (user.needsDailyReset(new Date(), timezone)) {
      user.resetDailyLimits(new Date());
      await this.userRepository.save(user);
    }

    return {
      userId: user.id,
      points: user.points || 0,
      lastAttendanceAt: user.lastAttendanceAt,
      dailyChatPoints: user.dailyChatPoints || 0,
      dailyPostPoints: user.dailyPostPoints || 0,
      lastDailyResetAt: user.lastDailyResetAt,
      timestamp: new Date(),
    };
  }

  /**
   * 사용자 일일 제한 정보 조회
   */
  async getDailyLimitsInfo(
    userId: string,
    timezone: string = 'Asia/Seoul',
  ): Promise<DailyLimitsInfo> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    const now = new Date();
    const chatPointLimit = DAILY_POINT_LIMITS[UserProgressAction.CHAT_MESSAGE];
    const postPointLimit = DAILY_POINT_LIMITS[UserProgressAction.POST_CREATE];

    if (user.needsDailyReset(now, timezone)) {
      user.resetDailyLimits(now);
      await this.userRepository.save(user);
    }

    const nextReset = new Date(now);
    nextReset.setHours(6, 0, 0, 0);
    if (now.getHours() >= 6) {
      nextReset.setDate(nextReset.getDate() + 1);
    }

    return {
      userId: user.id,
      dailyChatPoints: user.dailyChatPoints || 0,
      dailyPostPoints: user.dailyPostPoints || 0,
      chatPointLimit,
      postPointLimit,
      canSendChat: user.canSendChatMessage(),
      canCreatePost: user.canCreatePost(),
      lastResetAt: user.lastDailyResetAt,
      nextResetAt: nextReset,
      timezone,
    };
  }

  /**
   * 수동 일일 제한 초기화
   */
  async resetUserDailyLimits(
    userId: string,
    timezone: string = 'Asia/Seoul',
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    const now = new Date();
    user.resetDailyLimits(now);
    await this.userRepository.save(user);

    this.eventEmitter.emit('progress.dailyLimitsReset', {
      userId,
      timestamp: now,
      timezone,
    });
  }

  /**
   * 범용 액션 포인트 적립 + 트랜잭션 기록
   */
  async awardAction(
    userId: string,
    action: UserProgressAction,
    now: Date = new Date(),
    timezone: string = 'Asia/Seoul',
  ): Promise<AwardResult> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    const beforePoints = user.points || 0;

    if (user.needsDailyReset(now, timezone)) {
      user.resetDailyLimits(now);
      await this.userRepository.save(user);
    }

    if (
      action === UserProgressAction.DAILY_ATTENDANCE &&
      !user.canClaimDailyAttendance(now)
    ) {
      return {
        userId,
        action,
        addedPoints: 0,
        totalPoints: beforePoints,
        skipped: true,
        timestamp: now,
      };
    }

    if (
      action === UserProgressAction.CHAT_MESSAGE &&
      !user.canSendChatMessage()
    ) {
      return {
        userId,
        action,
        addedPoints: 0,
        totalPoints: beforePoints,
        skipped: true,
        timestamp: now,
        reason: `일일 댓글 포인트 제한(${DAILY_POINT_LIMITS[action]}점)을 초과했습니다.`,
      };
    }

    if (action === UserProgressAction.POST_CREATE && !user.canCreatePost()) {
      return {
        userId,
        action,
        addedPoints: 0,
        totalPoints: beforePoints,
        skipped: true,
        timestamp: now,
        reason: `일일 게시물 포인트 제한(${DAILY_POINT_LIMITS[action]}점)을 초과했습니다.`,
      };
    }

    const reward = USER_PROGRESS_REWARD[action] ?? 0;

    if (reward > 0) {
      await this.userRepository.manager.transaction(async (tem) => {
        // 포인트 증가
        await tem.increment(User, { id: userId }, 'points', reward);

        if (action === UserProgressAction.DAILY_ATTENDANCE) {
          await tem.update(User, { id: userId }, { lastAttendanceAt: now });
        }

        if (action === UserProgressAction.CHAT_MESSAGE) {
          user.addChatPoints(reward);
          await tem.increment(User, { id: userId }, 'dailyChatPoints', reward);
        } else if (action === UserProgressAction.POST_CREATE) {
          user.addPostPoints(reward);
          await tem.increment(User, { id: userId }, 'dailyPostPoints', reward);
        }

        user.points = beforePoints + reward;
        if (action === UserProgressAction.DAILY_ATTENDANCE) {
          user.lastAttendanceAt = now;
        }

        // 포인트 트랜잭션 기록
        await this.recordPointTransaction({
          manager: tem,
          userId,
          amount: reward,
          balanceAfter: user.points,
          type: this.mapActionToTxType(action),
          description: this.buildAutoDescription(action, reward),
          referenceType: this.resolveReferenceType(action),
          referenceId: undefined,
        });
      });
    }

    const result: AwardResult = {
      userId,
      action,
      addedPoints: reward,
      totalPoints: user.points,
      skipped: false,
      timestamp: now,
    };

    this.eventEmitter.emit('progress.awarded', result);
    return result;
  }

  /**
   * 채팅 메시지 포인트 적립
   */
  async awardChatMessage(
    userId: string,
    timezone: string = 'Asia/Seoul',
  ): Promise<AwardResult> {
    return this.awardAction(
      userId,
      UserProgressAction.CHAT_MESSAGE,
      new Date(),
      timezone,
    );
  }

  /**
   * 게시글 작성 포인트 적립
   */
  async awardPostCreate(
    userId: string,
    timezone: string = 'Asia/Seoul',
  ): Promise<AwardResult> {
    return this.awardAction(
      userId,
      UserProgressAction.POST_CREATE,
      new Date(),
      timezone,
    );
  }

  /**
   * 출석 포인트 적립
   */
  async awardDailyAttendance(userId: string): Promise<AwardResult> {
    return this.awardAction(userId, UserProgressAction.DAILY_ATTENDANCE);
  }

  /**
   * 포인트 차감 + 트랜잭션 기록
   */
  async deductPoints(
    userId: string,
    amount: number,
    reason?: string,
    now: Date = new Date(),
  ): Promise<{ success: boolean; message: string; remainingPoints: number }> {
    if (amount <= 0) {
      const snapshot = await this.getUserProgress(userId);
      return {
        success: false,
        message: '차감할 포인트 양이 올바르지 않습니다.',
        remainingPoints: snapshot.points,
      };
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    const current = user.points || 0;
    if (current < amount) {
      return {
        success: false,
        message: `포인트가 부족합니다. 필요: ${amount}P, 보유: ${current}P`,
        remainingPoints: current,
      };
    }

    await this.userRepository.manager.transaction(async (tem) => {
      await tem.decrement(User, { id: userId }, 'points', amount);
      user.points = current - amount;

      // 트랜잭션 타입 결정
      const txType = this.guessShopPurchase(reason)
        ? PointTransactionType.SHOP_PURCHASE
        : PointTransactionType.ADJUSTMENT;

      await this.recordPointTransaction({
        manager: tem,
        userId,
        amount: -amount, // 차감이므로 음수 기록
        balanceAfter: user.points,
        type: txType,
        description: reason || '포인트 차감',
        referenceType: this.guessShopPurchase(reason)
          ? PointReferenceType.SHOP_ITEM
          : undefined,
      });

      this.eventEmitter.emit('progress.deducted', {
        userId,
        deductedPoints: amount,
        remainingPoints: user.points,
        reason,
        timestamp: now,
      });
    });

    return {
      success: true,
      message: `${amount}P가 차감되었습니다.`,
      remainingPoints: user.points,
    };
  }

  /**
   * 커스텀 포인트 지급 (관리자 보상, 환불 등)
   */
  async awardCustom(
    userId: string,
    amount: number,
    reason?: string,
    now: Date = new Date(),
  ): Promise<AwardResult> {
    if (amount <= 0) {
      const snapshot = await this.getUserProgress(userId);
      return {
        userId,
        action: UserProgressAction.CHAT_MESSAGE, // placeholder
        addedPoints: 0,
        totalPoints: snapshot.points,
        skipped: true,
        timestamp: now,
        isCustom: true,
        reason,
      };
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    const before = user.points || 0;

    await this.userRepository.manager.transaction(async (tem) => {
      await tem.increment(User, { id: userId }, 'points', amount);
      user.points = before + amount;

      await this.recordPointTransaction({
        manager: tem,
        userId,
        amount,
        balanceAfter: user.points,
        type: PointTransactionType.ADJUSTMENT,
        description: reason || '커스텀 지급',
        referenceType: PointReferenceType.SYSTEM,
        metadata: { isCustom: true, reason },
      });
    });

    const result: AwardResult = {
      userId,
      action: UserProgressAction.CHAT_MESSAGE, // enum 확장 전까지 임시 사용
      addedPoints: amount,
      totalPoints: user.points,
      skipped: false,
      timestamp: now,
      isCustom: true,
      reason,
    };

    this.eventEmitter.emit('progress.awarded', result);
    return result;
  }

  getRewardValue(action: UserProgressAction): number {
    return USER_PROGRESS_REWARD[action] ?? 0;
  }

  // ================== 부가 설명/가독성 위한 헬퍼 ==================

  /**
   * 액션별 자동 설명 문자열
   */
  private buildAutoDescription(
    action: UserProgressAction,
    reward: number,
  ): string {
    switch (action) {
      case UserProgressAction.CHAT_MESSAGE:
        return `채팅 메시지 작성 +${reward}P`;
      case UserProgressAction.POST_CREATE:
        return `게시글 작성 +${reward}P`;
      case UserProgressAction.DAILY_ATTENDANCE:
        return `출석 체크 +${reward}P`;
      default:
        return `포인트 적립 +${reward}P`;
    }
  }

  /**
   * 액션 → 참조 타입 추론
   */
  private resolveReferenceType(
    action: UserProgressAction,
  ): PointReferenceType | undefined {
    switch (action) {
      case UserProgressAction.CHAT_MESSAGE:
        return PointReferenceType.CHAT_MESSAGE;
      case UserProgressAction.POST_CREATE:
        return PointReferenceType.POST;
      case UserProgressAction.DAILY_ATTENDANCE:
        return PointReferenceType.ATTENDANCE;
      default:
        return undefined;
    }
  }
}

/*
커밋 메세지: feat(progress): 포인트 적립/차감/커스텀 지급 시 PointTransaction 이력 기록 추가
*/
