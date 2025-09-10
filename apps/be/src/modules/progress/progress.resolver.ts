import { UseGuards, BadRequestException } from '@nestjs/common';
import {
  Args,
  Field,
  GraphQLISODateTime,
  Int,
  Mutation,
  ObjectType,
  Resolver,
  registerEnumType,
} from '@nestjs/graphql';
import { ProgressService } from './progress.service';
import { AdminGuard } from '../../common/guards/admin.guard';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { UserProgressAction } from '../../entities/user.entity';

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
}

/*
커밋 메세지: feat(be-graphql): ProgressResolver 추가 및 adminAwardUserPoints 뮤테이션/타입 정의
*/
