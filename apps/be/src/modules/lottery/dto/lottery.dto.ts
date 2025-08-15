import { ObjectType, Field, Int } from '@nestjs/graphql';
import { PointLottery } from '../../../entities/point-lottery.entity';
import { LotteryEntry } from '../../../entities/lottery-entry.entity';

/**
 * 현재 추첨 상태 응답 DTO
 */
@ObjectType()
export class LotteryStatusResponse {
  @Field(() => Boolean, { description: '활성 추첨 존재 여부' })
  hasActiveLottery: boolean;

  @Field(() => PointLottery, { nullable: true, description: '현재 추첨 정보' })
  lottery?: PointLottery;

  @Field(() => Boolean, { description: '사용자 응모 여부' })
  hasEntered: boolean;

  @Field(() => Int, { description: '남은 시간 (초)' })
  remainingSeconds: number;

  @Field(() => Int, { description: '총 응모자 수' })
  totalEntries: number;

  @Field(() => String, { description: '현재 추첨 단계' })
  currentPhase: 'entry' | 'announce' | 'completed';
}

/**
 * 추첨 이력 응답 DTO
 */
@ObjectType()
export class LotteryHistoryResponse {
  @Field(() => [PointLottery], { description: '추첨 목록' })
  lotteries: PointLottery[];

  @Field(() => Int, { description: '총 추첨 수' })
  total: number;

  @Field(() => Boolean, { description: '더 많은 데이터 존재 여부' })
  hasMore: boolean;

  @Field(() => Int, { description: '현재 페이지' })
  page: number;

  @Field(() => Int, { description: '페이지당 항목 수' })
  limit: number;
}

/**
 * 사용자 당첨 이력 응답 DTO
 */
@ObjectType()
export class UserWinHistoryResponse {
  @Field(() => [LotteryEntry], { description: '당첨 기록 목록' })
  entries: LotteryEntry[];

  @Field(() => Int, { description: '총 당첨 횟수' })
  total: number;

  @Field(() => Int, { description: '총 당첨 포인트' })
  totalWinnings: number;

  @Field(() => Int, { description: '현재 페이지' })
  page: number;

  @Field(() => Int, { description: '페이지당 항목 수' })
  limit: number;
}
