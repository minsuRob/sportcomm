import { Resolver, Query, Mutation, Args, Context, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { LotteryService } from './lottery.service';
import { PointLottery } from '../../entities/point-lottery.entity';
import { LotteryEntry } from '../../entities/lottery-entry.entity';
import {
  LotteryStatusResponse,
  LotteryHistoryResponse,
  UserWinHistoryResponse,
} from './dto/lottery.dto';

/**
 * 포인트 추첨 GraphQL 리졸버
 */
@Resolver()
export class LotteryResolver {
  constructor(private readonly lotteryService: LotteryService) {}

  /**
   * 현재 추첨 상태 조회
   */
  @Query(() => LotteryStatusResponse, {
    description: '현재 진행 중인 추첨 상태 조회',
  })
  @UseGuards(GqlAuthGuard)
  async currentLotteryStatus(
    @Context() context: any,
  ): Promise<LotteryStatusResponse> {
    const userId = context.req?.user?.userId || context.req?.user?.id;
    const currentLottery = await this.lotteryService.getCurrentLottery();

    // getCurrentLottery()에서 자동으로 추첨을 생성하므로 항상 추첨이 존재해야 함
    if (!currentLottery) {
      console.error('❌ 추첨 자동 생성에 실패했습니다.');
      return {
        hasActiveLottery: false,
        lottery: undefined,
        hasEntered: false,
        remainingSeconds: 0,
        totalEntries: 0,
        currentPhase: 'completed',
      };
    }

    let hasEntered = false;
    if (userId) {
      const entryStatus = await this.lotteryService.getUserEntryStatus(userId);
      hasEntered = entryStatus.hasEntered;
    }

    return {
      hasActiveLottery: true,
      lottery: currentLottery,
      hasEntered,
      remainingSeconds: currentLottery.getRemainingSeconds(),
      totalEntries: currentLottery.totalEntries,
      currentPhase: currentLottery.getCurrentPhase(),
    };
  }

  /**
   * 추첨 응모
   */
  @Mutation(() => LotteryEntry, { description: '포인트 추첨 응모' })
  @UseGuards(GqlAuthGuard)
  async enterLottery(@Context() context: any): Promise<LotteryEntry> {
    const userId = context.req?.user?.userId || context.req?.user?.id;
    const ipAddress = context.req?.ip || context.req?.connection?.remoteAddress;
    const userAgent = context.req?.headers?.['user-agent'];

    console.log('🔍 enterLottery context:', {
      userId,
      user: context.req?.user,
      ipAddress,
      userAgent,
    });

    if (!userId) {
      throw new Error('사용자 인증 정보를 찾을 수 없습니다.');
    }

    return await this.lotteryService.enterLottery(userId, ipAddress, userAgent);
  }

  /**
   * 사용자 응모 상태 확인
   */
  @Query(() => Boolean, { description: '현재 추첨 응모 여부 확인' })
  @UseGuards(GqlAuthGuard)
  async hasEnteredCurrentLottery(@Context() context: any): Promise<boolean> {
    const userId = context.req?.user?.userId || context.req?.user?.id;
    const entryStatus = await this.lotteryService.getUserEntryStatus(userId);
    return entryStatus.hasEntered;
  }

  /**
   * 추첨 이력 조회
   */
  @Query(() => LotteryHistoryResponse, { description: '추첨 이력 조회' })
  async lotteryHistory(
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
  ): Promise<LotteryHistoryResponse> {
    const result = await this.lotteryService.getLotteryHistory(page, limit);

    return {
      lotteries: result.lotteries,
      total: result.total,
      hasMore: result.hasMore,
      page,
      limit,
    };
  }

  /**
   * 특정 추첨의 당첨자 조회
   */
  @Query(() => [LotteryEntry], { description: '특정 추첨의 당첨자 조회' })
  async lotteryWinners(
    @Args('lotteryId', { type: () => String }) lotteryId: string,
  ): Promise<LotteryEntry[]> {
    return await this.lotteryService.getLotteryWinners(lotteryId);
  }

  /**
   * 사용자 당첨 이력 조회
   */
  @Query(() => UserWinHistoryResponse, { description: '사용자 당첨 이력 조회' })
  @UseGuards(GqlAuthGuard)
  async userWinHistory(
    @Context() context: any,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
  ): Promise<UserWinHistoryResponse> {
    const userId = context.req?.user?.userId || context.req?.user?.id;
    const result = await this.lotteryService.getUserWinHistory(
      userId,
      page,
      limit,
    );

    return {
      entries: result.entries,
      total: result.total,
      totalWinnings: result.totalWinnings,
      page,
      limit,
    };
  }
}
