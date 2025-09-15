import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  User,
  UserProgressAction,
  USER_PROGRESS_REWARD,
} from '../../entities/user.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * ProgressService
 *
 * 사용자 활동(채팅 메시지 전송, 게시글 작성, 데일리 출석 등)에 따라
 * 포인트와 경험치를 적립하고 레벨 변동 정보를 계산/반환하는 서비스입니다.
 *
 * 현재 요구사항:
 * - 채팅 메시지: 5 포인트 / 5 경험치
 * - 게시글 작성: 5 포인트 / 5 경험치
 * - 데일리 출석: 20 포인트 / 20 경험치 (하루 1회)
 *
 * 확장 포인트:
 * 1. 포인트/경험치 비율이 달라져야 하면 USER_PROGRESS_REWARD value를
 *    number → { points: number; exp: number } 구조로 확장
 * 2. 새로운 액션은 UserProgressAction enum + USER_PROGRESS_REWARD 매핑만 추가
 * 3. 이벤트 기반(progress.awarded / progress.levelup) 확장 (배지, 알림, 로그)
 * 4. 고빈도 업데이트(채팅 폭주) 발생 시 현재 save() 대신 쿼리 빌더 UPDATE 사용 고려
 */
export interface AwardResult {
  userId: string;
  action: UserProgressAction;
  addedPoints: number;
  totalPoints: number;
  skipped?: boolean; // 중복 출석 등으로 보상 제외
  timestamp: Date;
  // === 확장 필드 (커스텀 지급 등) ===
  isCustom?: boolean;
  reason?: string;
}

/**
 * 사용자 진행도 스냅샷 DTO
 */
export interface UserProgressSnapshot {
  userId: string;
  points: number;
  lastAttendanceAt?: Date;
  timestamp: Date;
}

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * 사용자 진행 상태 스냅샷 조회
   */
  async getUserProgress(userId: string): Promise<UserProgressSnapshot> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    return {
      userId: user.id,
      points: user.points || 0,
      lastAttendanceAt: user.lastAttendanceAt,
      timestamp: new Date(),
    };
  }

  /**
   * 액션에 따른 포인트/경험치 적립 (범용 엔드포인트)
   * - 비즈니스 서비스(채팅, 게시글 등)에서 공통 호출
   */
  async awardAction(
    userId: string,
    action: UserProgressAction,
    now: Date = new Date(),
  ): Promise<AwardResult> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    const beforePoints = user.points || 0;

    // 출석 중복 방지
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

    const reward = USER_PROGRESS_REWARD[action] ?? 0;
    if (reward > 0) {
      // 트랜잭션을 사용하여 안전하게 포인트 업데이트 (레이스 컨디션 방지)
      await this.userRepository.manager.transaction(async (transactionalEntityManager) => {
        // 현재 사용자 포인트 조회 및 업데이트
        await transactionalEntityManager.increment(User, { id: userId }, 'points', reward);

        // 데일리 출석의 경우 lastAttendanceAt도 업데이트
        if (action === UserProgressAction.DAILY_ATTENDANCE) {
          await transactionalEntityManager.update(User, { id: userId }, { lastAttendanceAt: now });
        }

        // 로컬 user 객체의 points를 업데이트하여 반환값에 반영
        user.points = beforePoints + reward;
        if (action === UserProgressAction.DAILY_ATTENDANCE) {
          user.lastAttendanceAt = now;
        }
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
   * 채팅 메시지 작성 적립
   */
  async awardChatMessage(userId: string): Promise<AwardResult> {
    return this.awardAction(userId, UserProgressAction.CHAT_MESSAGE);
  }

  /**
   * 게시글 작성 적립
   */
  async awardPostCreate(userId: string): Promise<AwardResult> {
    return this.awardAction(userId, UserProgressAction.POST_CREATE);
  }

  /**
   * 데일리 출석 적립 (하루 1회 제한)
   */
  async awardDailyAttendance(userId: string): Promise<AwardResult> {
    return this.awardAction(userId, UserProgressAction.DAILY_ATTENDANCE);
  }

  /**
   * 포인트 차감 (상점 구매 등)
   *
   * @param userId 대상 사용자
   * @param amount 차감할 포인트 양
   * @param reason 차감 사유
   * @param now 기준 시간
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

    const currentPoints = user.points || 0;
    if (currentPoints < amount) {
      return {
        success: false,
        message: `포인트가 부족합니다. 필요: ${amount}P, 보유: ${currentPoints}P`,
        remainingPoints: currentPoints,
      };
    }

    // 트랜잭션을 사용하여 안전하게 포인트 차감 (레이스 컨디션 방지)
    await this.userRepository.manager.transaction(async (transactionalEntityManager) => {
      // 포인트 차감
      await transactionalEntityManager.decrement(User, { id: userId }, 'points', amount);

      // 이벤트 발행
      this.eventEmitter.emit('progress.deducted', {
        userId,
        deductedPoints: amount,
        remainingPoints: currentPoints - amount,
        reason,
        timestamp: now,
      });

      // 로컬 객체 업데이트
      user.points = currentPoints - amount;
    });

    return {
      success: true,
      message: `${amount}P가 차감되었습니다.`,
      remainingPoints: user.points,
    };
  }

  /**
   * 커스텀 포인트/경험치 지급
   *
   * - 사유(reason)와 함께 임의 양 지급
   * - 기존 enum 구조 유지 위해 action 필드는 임의 값(CHAT_MESSAGE) 사용,
   *   isCustom=true 로 커스텀 지급 여부를 식별
   * - 향후 UserProgressAction에 CUSTOM 추가 시 action 교체 가능
   *
   * @param userId 대상 사용자
   * @param amount 지급 양 (포인트=경험치 동일 비율)
   * @param reason 지급 사유 (로그/이벤트 메타데이터)
   * @param now 기준 시간
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
        action: UserProgressAction.CHAT_MESSAGE,
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

    user.points = (user.points || 0) + amount;
    await this.userRepository.save(user);

    const result: AwardResult = {
      userId,
      action: UserProgressAction.CHAT_MESSAGE,
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

  /**
   * (헬퍼) 액션별 기본 보상 값 조회
   */
  getRewardValue(action: UserProgressAction): number {
    return USER_PROGRESS_REWARD[action] ?? 0;
  }
}

/*
커밋 메세지: feat(progress): 커스텀 포인트/경험치 지급 메서드 awardCustom 추가
*/
