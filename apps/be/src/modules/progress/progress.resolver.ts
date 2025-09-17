import { UseGuards, BadRequestException } from '@nestjs/common';
import {
  Args,
  Field,
  GraphQLISODateTime,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  registerEnumType,
} from '@nestjs/graphql';
import { ProgressService } from './progress.service';
import { AdminGuard } from '../../common/guards/admin.guard';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { UserProgressAction } from '../../entities/user.entity';

/**
 * 포인트 차감 GraphQL 타입
 */
@ObjectType('DeductResult')
export class DeductResultGraphQL {
  @Field(() => Boolean, { description: '차감 성공 여부' })
  success!: boolean;

  @Field(() => String, { description: '결과 메시지' })
  message!: string;

  @Field(() => Int, { description: '차감 후 잔여 포인트' })
  remainingPoints!: number;

  @Field(() => String, { nullable: true, description: '차감 사유' })
  reason?: string;

  @Field(() => GraphQLISODateTime, { description: '차감 시각' })
  timestamp!: Date;
}

/**
 * GraphQL에서 사용할 진행도 액션 열거형 등록
 * - 이미 다른 곳에서 등록되어 있다면 중복 등록되어도 문제는 없지만
 *   가능하면 한 곳에서만 등록되도록 유지하세요.
 */
registerEnumType(UserProgressAction, {
  name: 'UserProgressAction',
  description: '사용자 진행도 액션 타입',
});

/**
 * 관리자 포인트 지급 결과 GraphQL 타입
 * - ProgressService.AwardResult 형태를 GraphQL에 맞춰 정의
 */
@ObjectType('AwardResult')
class AwardResultGraphQL {
  @Field(() => String, { description: '대상 사용자 ID' })
  userId!: string;

  @Field(() => UserProgressAction, { description: '처리된 액션(내부 표준화용)' })
  action!: UserProgressAction;

  @Field(() => Int, { description: '지급된 포인트 양' })
  addedPoints!: number;

  @Field(() => Int, { description: '지급 후 총 포인트' })
  totalPoints!: number;

  @Field(() => Boolean, {
    nullable: true,
    description: '보상 스킵 여부(정책상 미지급 등)',
  })
  skipped?: boolean;

  @Field(() => GraphQLISODateTime, { description: '처리 시각' })
  timestamp!: Date;

  @Field(() => Boolean, {
    nullable: true,
    description: '커스텀(임의) 지급 여부',
  })
  isCustom?: boolean;

  @Field(() => String, {
    nullable: true,
    description: '지급 사유(로그/분석용)',
  })
  reason?: string;
}

/**
 * 사용자 진행도 스냅샷 GraphQL 타입
 */
@ObjectType('UserProgressSnapshot')
class UserProgressSnapshotGraphQL {
  @Field(() => String, { description: '사용자 ID' })
  userId!: string;

  @Field(() => Int, { description: '현재 포인트' })
  points!: number;

  @Field(() => GraphQLISODateTime, {
    nullable: true,
    description: '최근 출석 체크 일시'
  })
  lastAttendanceAt?: Date;

  @Field(() => Int, { description: '오늘 댓글로 얻은 포인트' })
  dailyChatPoints!: number;

  @Field(() => Int, { description: '오늘 게시물로 얻은 포인트' })
  dailyPostPoints!: number;

  @Field(() => GraphQLISODateTime, {
    nullable: true,
    description: '마지막 일일 제한 초기화 일시'
  })
  lastDailyResetAt?: Date;

  @Field(() => GraphQLISODateTime, { description: '조회 시각' })
  timestamp!: Date;
}

/**
 * 일일 제한 정보 GraphQL 타입
 */
@ObjectType('DailyLimitsInfo')
class DailyLimitsInfoGraphQL {
  @Field(() => String, { description: '사용자 ID' })
  userId!: string;

  @Field(() => Int, { description: '오늘 댓글로 얻은 포인트' })
  dailyChatPoints!: number;

  @Field(() => Int, { description: '오늘 게시물로 얻은 포인트' })
  dailyPostPoints!: number;

  @Field(() => Int, { description: '댓글 포인트 일일 제한 (30점)' })
  chatPointLimit!: number;

  @Field(() => Int, { description: '게시물 포인트 일일 제한' })
  postPointLimit!: number;

  @Field(() => Boolean, { description: '댓글 작성 가능 여부' })
  canSendChat!: boolean;

  @Field(() => Boolean, { description: '게시물 작성 가능 여부' })
  canCreatePost!: boolean;

  @Field(() => GraphQLISODateTime, {
    nullable: true,
    description: '마지막 초기화 일시'
  })
  lastResetAt?: Date;

  @Field(() => GraphQLISODateTime, {
    nullable: true,
    description: '다음 초기화 예정 일시'
  })
  nextResetAt?: Date;

  @Field(() => String, { description: '적용된 시간대' })
  timezone!: string;
}

/**
 * ProgressResolver
 *
 * - 관리자 권한으로 특정 사용자에게 포인트를 지급하는 뮤테이션 제공
 * - 내부적으로 ProgressService.awardCustom을 호출하여 포인트를 적립
 *
 * 주의:
 * - 이 리졸버를 활성화하려면 ProgressModule.providers에 등록해야 합니다.
 */
@Resolver()
export class ProgressResolver {
  constructor(private readonly progressService: ProgressService) {}

  /**
   * 관리자: 특정 사용자에게 커스텀 포인트 지급
   *
   * 예)
   * mutation AdminAwardUserPoints($userId: String!, $amount: Int!, $reason: String) {
   *   adminAwardUserPoints(userId: $userId, amount: $amount, reason: $reason) {
   *     userId
   *     addedPoints
   *     totalPoints
   *     timestamp
   *     isCustom
   *     reason
   *   }
   * }
   */
  @UseGuards(GqlAuthGuard, AdminGuard)
  @Mutation(() => AwardResultGraphQL, {
    name: 'adminAwardUserPoints',
    description: '관리자 권한으로 특정 사용자에게 커스텀 포인트를 지급합니다.',
  })
  async adminAwardUserPoints(
    @Args('userId', { type: () => String }) userId: string,
    @Args('amount', { type: () => Int }) amount: number,
    @Args('reason', { type: () => String, nullable: true }) reason?: string,
  ): Promise<AwardResultGraphQL> {
    // 빠른 검증: 1 미만 금액 거부
    if (amount <= 0) {
      throw new BadRequestException('지급 포인트는 1 이상이어야 합니다.');
    }

    // 서비스 호출 (내부적으로 NotFoundException 등 처리)
    const result = await this.progressService.awardCustom(
      userId,
      amount,
      reason,
    );

    // GraphQL 타입에 맞춰 반환
    return {
      userId: result.userId,
      action: result.action,
      addedPoints: result.addedPoints,
      totalPoints: result.totalPoints,
      skipped: result.skipped,
      timestamp: result.timestamp,
      isCustom: result.isCustom,
      reason: result.reason,
    };
  }


  @UseGuards(GqlAuthGuard)
  @Mutation(() => DeductResultGraphQL, {
    name: 'deductUserPoints',
    description: '사용자의 포인트를 차감합니다 (상점 구매 등).',
  })
  async deductUserPoints(
    @Args('userId', { type: () => String }) userId: string,
    @Args('amount', { type: () => Int }) amount: number,
    @Args('reason', { type: () => String, nullable: true }) reason?: string,
  ): Promise<DeductResultGraphQL> {
    // 빠른 검증: 1 미만 금액 거부
    if (amount <= 0) {
      throw new BadRequestException('차감 포인트는 1 이상이어야 합니다.');
    }

    // 서비스 호출
    const result = await this.progressService.deductPoints(
      userId,
      amount,
      reason,
    );

    if (!result.success) {
      throw new BadRequestException(result.message);
    }

    // GraphQL 타입에 맞춰 반환
    return {
      success: result.success,
      message: result.message,
      remainingPoints: result.remainingPoints,
      reason,
      timestamp: new Date(),
    };
  }

  /**
   * 사용자 진행도 정보 조회
   */
  @UseGuards(GqlAuthGuard)
  @Query(() => UserProgressSnapshotGraphQL, {
    name: 'getUserProgress',
    description: '사용자의 진행도 정보를 조회합니다.',
  })
  async getUserProgress(
    @Args('userId', { type: () => String }) userId: string,
    @Args('timezone', { type: () => String, nullable: true }) timezone?: string,
  ): Promise<UserProgressSnapshotGraphQL> {
    const result = await this.progressService.getUserProgress(
      userId,
      timezone || 'Asia/Seoul'
    );

    return {
      userId: result.userId,
      points: result.points,
      lastAttendanceAt: result.lastAttendanceAt,
      dailyChatPoints: result.dailyChatPoints,
      dailyPostPoints: result.dailyPostPoints,
      lastDailyResetAt: result.lastDailyResetAt,
      timestamp: result.timestamp,
    };
  }

  /**
   * 사용자 일일 제한 정보 조회
   */
  @UseGuards(GqlAuthGuard)
  @Query(() => DailyLimitsInfoGraphQL, {
    name: 'getDailyLimitsInfo',
    description: '사용자의 일일 제한 정보를 조회합니다.',
  })
  async getDailyLimitsInfo(
    @Args('userId', { type: () => String }) userId: string,
    @Args('timezone', { type: () => String, nullable: true }) timezone?: string,
  ): Promise<DailyLimitsInfoGraphQL> {
    const result = await this.progressService.getDailyLimitsInfo(
      userId,
      timezone || 'Asia/Seoul'
    );

    return {
      userId: result.userId,
      dailyChatPoints: result.dailyChatPoints,
      dailyPostPoints: result.dailyPostPoints,
      chatPointLimit: result.chatPointLimit,
      postPointLimit: result.postPointLimit,
      canSendChat: result.canSendChat,
      canCreatePost: result.canCreatePost,
      lastResetAt: result.lastResetAt,
      nextResetAt: result.nextResetAt,
      timezone: result.timezone,
    };
  }

  /**
   * 관리자: 사용자 일일 제한 수동 초기화
   */
  @UseGuards(GqlAuthGuard, AdminGuard)
  @Mutation(() => Boolean, {
    name: 'adminResetUserDailyLimits',
    description: '관리자 권한으로 사용자의 일일 제한을 수동으로 초기화합니다.',
  })
  async adminResetUserDailyLimits(
    @Args('userId', { type: () => String }) userId: string,
    @Args('timezone', { type: () => String, nullable: true }) timezone?: string,
  ): Promise<boolean> {
    await this.progressService.resetUserDailyLimits(
      userId,
      timezone || 'Asia/Seoul'
    );
    return true;
  }
}

/*
커밋 메세지: feat(be-graphql): ProgressResolver 추가 및 adminAwardUserPoints 뮤테이션/타입 정의
*/
