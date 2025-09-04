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
  addedExperience: number;
  totalPoints: number;
  totalExperience: number;
  previousLevel: number;
  newLevel: number;
  levelUp: boolean;
  skipped?: boolean; // 중복 출석 등으로 보상 제외
  experienceToNextLevel: number;
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
  experience: number;
  level: number;
  experienceToNextLevel: number;
  levelProgressRatio: number; // 0~1
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
      experience: user.experience || 0,
      level: user.level,
      experienceToNextLevel: user.experienceToNextLevel,
      levelProgressRatio: user.getLevelProgressRatio(),
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
    // 1. 사용자 조회
    const user = await this.userRepository.findOne({
      where: { id: userId },
      // 동시성 이슈 증가 시 lock: { mode: 'pessimistic_write' } 고려
    });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    const previousLevel = user.level;
    const beforePoints = user.points || 0;
    const beforeExp = user.experience || 0;

    // 2. 데일리 출석 중복 처리
    if (
      action === UserProgressAction.DAILY_ATTENDANCE &&
      !user.canClaimDailyAttendance(now)
    ) {
      return {
        userId,
        action,
        addedPoints: 0,
        addedExperience: 0,
        totalPoints: beforePoints,
        totalExperience: beforeExp,
        previousLevel,
        newLevel: previousLevel,
        levelUp: false,
        skipped: true,
        experienceToNextLevel: user.experienceToNextLevel,
        timestamp: now,
      };
    }

    // 3. 엔티티 헬퍼를 통한 적립
    const progressResult = user.awardProgress(action, now);

    // 4. DB 반영
    //    (고빈도 액션이면 쿼리 빌더 UPDATE ... SET points = points + X 사용 고려)
    await this.userRepository.save(user);

    const newLevel = user.level;

    // 5. 결과 DTO 구성
    const result: AwardResult = {
      userId,
      action,
      addedPoints: progressResult.added,
      addedExperience: progressResult.added,
      totalPoints: user.points,
      totalExperience: user.experience,
      previousLevel,
      newLevel,
      levelUp: newLevel > previousLevel,
      skipped: progressResult.skipped,
      experienceToNextLevel: user.experienceToNextLevel,
      timestamp: now,
    };

    // 6. 이벤트 발행 (비동기 확장: 알림/배지/로그)
    this.eventEmitter.emit('progress.awarded', result);
    if (result.levelUp) {
      this.eventEmitter.emit('progress.levelup', {
        userId,
        previousLevel,
        newLevel,
        timestamp: now,
      });
    }

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
      // 무효 지급 방지 (skipped 처리)
      const snapshot = await this.getUserProgress(userId);
      return {
        userId,
        action: UserProgressAction.CHAT_MESSAGE,
        addedPoints: 0,
        addedExperience: 0,
        totalPoints: snapshot.points,
        totalExperience: snapshot.experience,
        previousLevel: snapshot.level,
        newLevel: snapshot.level,
        levelUp: false,
        skipped: true,
        experienceToNextLevel: snapshot.experienceToNextLevel,
        timestamp: now,
        isCustom: true,
        reason,
      };
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    const previousLevel = user.level;

    user.points = (user.points || 0) + amount;
    user.experience = (user.experience || 0) + amount;
    await this.userRepository.save(user);

    const newLevel = user.level;

    const result: AwardResult = {
      userId,
      action: UserProgressAction.CHAT_MESSAGE, // 임시(커스텀 구분은 isCustom 활용)
      addedPoints: amount,
      addedExperience: amount,
      totalPoints: user.points,
      totalExperience: user.experience,
      previousLevel,
      newLevel,
      levelUp: newLevel > previousLevel,
      skipped: false,
      experienceToNextLevel: user.experienceToNextLevel,
      timestamp: now,
      isCustom: true,
      reason,
    };

    this.eventEmitter.emit('progress.awarded', result);
    if (result.levelUp) {
      this.eventEmitter.emit('progress.levelup', {
        userId,
        previousLevel,
        newLevel,
        timestamp: now,
        isCustom: true,
        reason,
      });
    }

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
