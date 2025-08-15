import { Entity, Column, OneToMany, Index } from 'typeorm';
import { ObjectType, Field, registerEnumType, Int } from '@nestjs/graphql';
import { IsNumber, Min, Max } from 'class-validator';
import { BaseEntity } from './base.entity';
import { LotteryEntry } from './lottery-entry.entity';

/**
 * 포인트 추첨 상태 열거형
 */
export enum LotteryStatus {
  /** 진행 중 (응모 가능) */
  ACTIVE = 'ACTIVE',
  /** 결과 발표 중 (응모 마감, 당첨자 공개) */
  ANNOUNCING = 'ANNOUNCING',
  /** 추첨 완료 */
  COMPLETED = 'COMPLETED',
  /** 취소됨 */
  CANCELLED = 'CANCELLED',
}

// GraphQL enum 등록
registerEnumType(LotteryStatus, {
  name: 'LotteryStatus',
  description: '포인트 추첨 상태',
});

/**
 * 포인트 추첨 엔티티
 *
 * 60분마다 진행되는 포인트 추첨 정보를 관리합니다.
 * 각 추첨마다 5명의 당첨자를 선정하여 포인트를 지급합니다.
 */
@ObjectType()
@Entity('point_lotteries')
@Index(['roundNumber'], { unique: true })
@Index(['status'])
@Index(['startTime'])
@Index(['endTime'])
export class PointLottery extends BaseEntity {
  /**
   * 추첨 회차 번호
   * 1부터 시작하는 순차적인 회차 번호입니다.
   */
  @Field(() => Int, { description: '추첨 회차 번호' })
  @Column({
    type: 'integer',
    unique: true,
    comment: '추첨 회차 번호',
  })
  @IsNumber({}, { message: '회차 번호는 숫자여야 합니다.' })
  @Min(1, { message: '회차 번호는 1 이상이어야 합니다.' })
  roundNumber: number;

  /**
   * 추첨 시작 시간
   * 응모가 시작되는 시간입니다.
   */
  @Field(() => Date, { description: '추첨 시작 시간' })
  @Column({
    type: 'timestamp with time zone',
    comment: '추첨 시작 시간',
  })
  startTime: Date;

  /**
   * 응모 마감 시간
   * 응모가 마감되는 시간입니다 (시작 후 50분).
   */
  @Field(() => Date, { description: '응모 마감 시간' })
  @Column({
    type: 'timestamp with time zone',
    comment: '응모 마감 시간',
  })
  endTime: Date;

  /**
   * 결과 발표 시작 시간
   * 당첨자가 발표되는 시간입니다 (응모 마감 직후).
   */
  @Field(() => Date, { description: '결과 발표 시작 시간' })
  @Column({
    type: 'timestamp with time zone',
    comment: '결과 발표 시작 시간',
  })
  announceTime: Date;

  /**
   * 추첨 완전 종료 시간
   * 결과 발표가 끝나고 다음 추첨이 시작되는 시간입니다 (시작 후 60분).
   */
  @Field(() => Date, { description: '추첨 완전 종료 시간' })
  @Column({
    type: 'timestamp with time zone',
    comment: '추첨 완전 종료 시간',
  })
  finalEndTime: Date;

  /**
   * 추첨 상태
   * 현재 추첨의 진행 상태를 나타냅니다.
   */
  @Field(() => String, { description: '추첨 상태' })
  @Column({
    type: 'enum',
    enum: LotteryStatus,
    default: LotteryStatus.ACTIVE,
    comment: '추첨 상태',
  })
  status: LotteryStatus;

  /**
   * 총 상금 포인트
   * 이번 추첨에서 지급될 총 포인트 금액입니다.
   */
  @Field(() => Int, { description: '총 상금 포인트' })
  @Column({
    type: 'integer',
    default: 1000,
    comment: '총 상금 포인트',
  })
  @IsNumber({}, { message: '상금은 숫자여야 합니다.' })
  @Min(100, { message: '상금은 최소 100P 이상이어야 합니다.' })
  @Max(10000, { message: '상금은 최대 10,000P 이하여야 합니다.' })
  totalPrize: number;

  /**
   * 당첨자 수
   * 이번 추첨에서 선정될 당첨자 수입니다.
   */
  @Field(() => Int, { description: '당첨자 수' })
  @Column({
    type: 'integer',
    default: 5,
    comment: '당첨자 수',
  })
  @IsNumber({}, { message: '당첨자 수는 숫자여야 합니다.' })
  @Min(1, { message: '당첨자 수는 최소 1명 이상이어야 합니다.' })
  @Max(20, { message: '당첨자 수는 최대 20명 이하여야 합니다.' })
  winnerCount: number;

  /**
   * 총 응모자 수
   * 이번 추첨에 응모한 총 사용자 수입니다.
   */
  @Field(() => Int, { description: '총 응모자 수' })
  @Column({
    type: 'integer',
    default: 0,
    comment: '총 응모자 수',
  })
  totalEntries: number;

  /**
   * 당첨자 ID 목록
   * 추첨 완료 후 당첨된 사용자들의 ID 목록입니다.
   */
  @Field(() => [String], { nullable: true, description: '당첨자 ID 목록' })
  @Column({
    type: 'json',
    nullable: true,
    comment: '당첨자 ID 목록 (JSON 배열)',
  })
  winnerIds?: string[];

  /**
   * 개별 당첨 금액
   * 각 당첨자가 받을 포인트 금액입니다.
   */
  @Field(() => Int, { description: '개별 당첨 금액' })
  @Column({
    type: 'integer',
    default: 200,
    comment: '개별 당첨 금액',
  })
  prizePerWinner: number;

  // === 관계 설정 ===

  /**
   * 이 추첨에 대한 응모 기록들
   * 일대다 관계: 한 추첨에는 여러 응모 기록이 있을 수 있습니다.
   */
  @Field(() => [LotteryEntry], {
    nullable: true,
    description: '응모 기록 목록',
  })
  @OneToMany(() => LotteryEntry, (entry) => entry.lottery)
  entries: LotteryEntry[];

  // === 헬퍼 메서드 ===

  /**
   * 추첨이 진행 중인지 확인하는 메서드 (응모 가능)
   * @returns 진행 중인 경우 true, 아닌 경우 false
   */
  isActive(): boolean {
    return this.status === LotteryStatus.ACTIVE;
  }

  /**
   * 결과 발표 중인지 확인하는 메서드
   * @returns 결과 발표 중인 경우 true, 아닌 경우 false
   */
  isAnnouncing(): boolean {
    return this.status === LotteryStatus.ANNOUNCING;
  }

  /**
   * 추첨이 완료되었는지 확인하는 메서드
   * @returns 완료된 경우 true, 아닌 경우 false
   */
  isCompleted(): boolean {
    return this.status === LotteryStatus.COMPLETED;
  }

  /**
   * 응모 가능한 시간인지 확인하는 메서드
   * @returns 응모 가능한 경우 true, 아닌 경우 false
   */
  canEnter(): boolean {
    const now = new Date();
    return this.isActive() && now >= this.startTime && now < this.endTime;
  }

  /**
   * 현재 상태에 따른 남은 시간을 초 단위로 반환하는 메서드
   * @returns 남은 시간 (초)
   */
  getRemainingSeconds(): number {
    const now = new Date();

    if (this.isActive()) {
      // 응모 기간 중: 응모 마감까지 남은 시간
      const remaining = this.endTime.getTime() - now.getTime();
      return Math.max(0, Math.floor(remaining / 1000));
    } else if (this.isAnnouncing()) {
      // 결과 발표 기간 중: 발표 종료까지 남은 시간
      const remaining = this.finalEndTime.getTime() - now.getTime();
      return Math.max(0, Math.floor(remaining / 1000));
    }

    return 0;
  }

  /**
   * 현재 추첨의 단계를 반환하는 메서드
   * @returns 'entry' | 'announce' | 'completed'
   */
  getCurrentPhase(): 'entry' | 'announce' | 'completed' {
    const now = new Date();

    if (now < this.endTime && this.isActive()) {
      return 'entry';
    } else if (
      now < this.finalEndTime &&
      (this.isActive() || this.isAnnouncing())
    ) {
      return 'announce';
    } else {
      return 'completed';
    }
  }

  /**
   * 응모자 수 증가 메서드
   */
  incrementEntries(): void {
    this.totalEntries += 1;
  }

  /**
   * 결과 발표 시작 처리 메서드
   * @param winnerIds 당첨자 ID 목록
   */
  startAnnouncement(winnerIds: string[]): void {
    this.status = LotteryStatus.ANNOUNCING;
    this.winnerIds = winnerIds;
    this.updatedAt = new Date();
  }

  /**
   * 추첨 완료 처리 메서드
   */
  complete(): void {
    this.status = LotteryStatus.COMPLETED;
    this.updatedAt = new Date();
  }

  /**
   * 다음 추첨 시작 시간 계산 메서드
   * @returns 다음 추첨 시작 시간
   */
  static getNextStartTime(): Date {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0);
    return nextHour;
  }

  /**
   * 응모 마감 시간 계산 메서드
   * @param startTime 시작 시간
   * @returns 응모 마감 시간 (시작 시간 + 50분)
   */
  static getEndTime(startTime: Date): Date {
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + 50);
    return endTime;
  }

  /**
   * 결과 발표 시작 시간 계산 메서드
   * @param startTime 시작 시간
   * @returns 결과 발표 시작 시간 (시작 시간 + 50분)
   */
  static getAnnounceTime(startTime: Date): Date {
    const announceTime = new Date(startTime);
    announceTime.setMinutes(announceTime.getMinutes() + 50);
    return announceTime;
  }

  /**
   * 추첨 완전 종료 시간 계산 메서드
   * @param startTime 시작 시간
   * @returns 완전 종료 시간 (시작 시간 + 60분)
   */
  static getFinalEndTime(startTime: Date): Date {
    const finalEndTime = new Date(startTime);
    finalEndTime.setHours(finalEndTime.getHours() + 1);
    return finalEndTime;
  }
}
