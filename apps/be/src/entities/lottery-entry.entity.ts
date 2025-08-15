import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ObjectType, Field, Int } from '@nestjs/graphql';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { PointLottery } from './point-lottery.entity';

/**
 * 추첨 응모 기록 엔티티
 *
 * 사용자가 포인트 추첨에 응모한 기록을 관리합니다.
 * 각 사용자는 추첨당 1번만 응모할 수 있습니다.
 */
@ObjectType()
@Entity('lottery_entries')
@Index(['userId', 'lotteryId'], { unique: true })
@Index(['userId'])
@Index(['lotteryId'])
@Index(['isWinner'])
@Index(['createdAt'])
export class LotteryEntry extends BaseEntity {
  /**
   * 응모한 사용자 ID
   */
  @Column({
    type: 'uuid',
    comment: '응모한 사용자 ID',
  })
  userId: string;

  /**
   * 응모한 추첨 ID
   */
  @Column({
    type: 'uuid',
    comment: '응모한 추첨 ID',
  })
  lotteryId: string;

  /**
   * 당첨 여부
   * 추첨 완료 후 당첨되었는지 여부를 나타냅니다.
   */
  @Field(() => Boolean, { description: '당첨 여부' })
  @Column({
    type: 'boolean',
    default: false,
    comment: '당첨 여부',
  })
  isWinner: boolean;

  /**
   * 당첨 포인트
   * 당첨된 경우 지급받은 포인트 금액입니다.
   */
  @Field(() => Int, { nullable: true, description: '당첨 포인트' })
  @Column({
    type: 'integer',
    nullable: true,
    comment: '당첨 포인트',
  })
  prizePoints?: number;

  /**
   * 응모 시 IP 주소
   * 중복 응모 방지를 위한 참고 정보입니다.
   */
  @Column({
    type: 'varchar',
    length: 45,
    nullable: true,
    comment: '응모 시 IP 주소',
  })
  ipAddress?: string;

  /**
   * 응모 시 사용자 에이전트
   * 중복 응모 방지를 위한 참고 정보입니다.
   */
  @Column({
    type: 'text',
    nullable: true,
    comment: '응모 시 사용자 에이전트',
  })
  userAgent?: string;

  // === 관계 설정 ===

  /**
   * 응모한 사용자
   * 다대일 관계: 여러 응모 기록이 한 사용자에 속합니다.
   */
  @Field(() => User, { description: '응모한 사용자' })
  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  /**
   * 응모한 추첨
   * 다대일 관계: 여러 응모 기록이 한 추첨에 속합니다.
   */
  @Field(() => PointLottery, { description: '응모한 추첨' })
  @ManyToOne(() => PointLottery, (lottery) => lottery.entries, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'lotteryId' })
  lottery: PointLottery;

  // === 헬퍼 메서드 ===

  /**
   * 당첨 처리 메서드
   * @param prizePoints 당첨 포인트
   */
  markAsWinner(prizePoints: number): void {
    this.isWinner = true;
    this.prizePoints = prizePoints;
    this.updatedAt = new Date();
  }

  /**
   * 응모 기록 생성 정적 메서드
   * @param userId 사용자 ID
   * @param lotteryId 추첨 ID
   * @param ipAddress IP 주소
   * @param userAgent 사용자 에이전트
   * @returns LotteryEntry 인스턴스
   */
  static create(
    userId: string,
    lotteryId: string,
    ipAddress?: string,
    userAgent?: string,
  ): LotteryEntry {
    const entry = new LotteryEntry();
    entry.userId = userId;
    entry.lotteryId = lotteryId;
    entry.ipAddress = ipAddress;
    entry.userAgent = userAgent;
    entry.isWinner = false;
    return entry;
  }
}
