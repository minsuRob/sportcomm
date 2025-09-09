import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';
import { Feedback } from '../../entities/feedback.entity';
import { CreateFeedbackInput } from './feedback.input';
import { ObjectType, Field } from '@nestjs/graphql';

/**
 * 사용자 피드백 목록 응답 타입
 */
@ObjectType()
export class PaginatedUserFeedbacks {
  @Field(() => [Feedback], { description: '피드백 목록' })
  feedbacks: Feedback[];

  @Field(() => Int, { description: '총 피드백 수' })
  total: number;

  @Field(() => Int, { description: '현재 페이지' })
  page: number;

  @Field(() => Int, { description: '페이지당 항목 수' })
  limit: number;

  @Field(() => Int, { description: '총 페이지 수' })
  totalPages: number;
}

/**
 * 피드백 리졸버
 *
 * 사용자 피드백 관련 GraphQL API를 제공합니다.
 */
@Resolver()
@UseGuards(GqlAuthGuard)
export class FeedbackResolver {
  constructor(private readonly feedbackService: FeedbackService) {}

  /**
   * 피드백 생성
   */
  @Mutation(() => Feedback, { description: '피드백 생성' })
  async createFeedback(
    @CurrentUser() user: User,
    @Args('input') input: CreateFeedbackInput,
  ): Promise<Feedback> {
    return await this.feedbackService.createFeedback(user, input);
  }

  /**
   * 내 피드백 목록 조회
   */
  @Query(() => PaginatedUserFeedbacks, { description: '내 피드백 목록 조회' })
  async myFeedbacks(
    @CurrentUser() user: User,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
  ): Promise<PaginatedUserFeedbacks> {
    return await this.feedbackService.getUserFeedbacks(user, page, limit);
  }

  /**
   * 특정 피드백 조회
   */
  @Query(() => Feedback, { description: '피드백 상세 조회' })
  async feedback(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<Feedback> {
    return await this.feedbackService.getFeedbackById(id, user);
  }
}
