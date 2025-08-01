import { Resolver, Mutation, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { InputType, Field, ObjectType } from '@nestjs/graphql';
import {
  IsString,
  IsEnum,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  ModerationService,
  CreateReportInput as ServiceCreateReportInput,
} from './moderation.service';
import { Report, ReportType } from '../../entities/report.entity';
import { Block } from '../../entities/block.entity';
import { User } from '../../entities/user.entity';
import {
  GqlAuthGuard,
  OptionalGqlAuthGuard,
} from '../../common/guards/gql-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/**
 * 신고 생성 입력 타입
 */
@InputType()
export class CreateReportInput implements ServiceCreateReportInput {
  @Field(() => ReportType, { description: '신고 유형' })
  @IsEnum(ReportType, { message: '올바른 신고 유형을 선택해주세요.' })
  type: ReportType;

  @Field(() => String, { description: '신고 사유' })
  @IsString({ message: '신고 사유는 문자열이어야 합니다.' })
  @MinLength(10, { message: '신고 사유는 최소 10자 이상이어야 합니다.' })
  @MaxLength(1000, { message: '신고 사유는 최대 1000자까지 가능합니다.' })
  reason: string;

  @Field(() => String, { nullable: true, description: '신고할 사용자 ID' })
  @IsOptional()
  @IsString({ message: '사용자 ID는 문자열이어야 합니다.' })
  reportedUserId?: string;

  @Field(() => String, { nullable: true, description: '신고할 게시물 ID' })
  @IsOptional()
  @IsString({ message: '게시물 ID는 문자열이어야 합니다.' })
  postId?: string;

  @Field(() => String, { nullable: true, description: '신고할 메시지 ID' })
  @IsOptional()
  @IsString({ message: '메시지 ID는 문자열이어야 합니다.' })
  messageId?: string;
}

/**
 * 신고 목록 응답 타입
 */
@ObjectType()
export class ReportsResponse {
  @Field(() => [Report], { description: '신고 목록' })
  reports: Report[];

  @Field(() => Number, { description: '총 신고 수' })
  total: number;

  @Field(() => Number, { description: '현재 페이지' })
  page: number;

  @Field(() => Number, { description: '페이지 크기' })
  limit: number;

  @Field(() => Number, { description: '총 페이지 수' })
  totalPages: number;
}

/**
 * 조정 리졸버
 * 신고 및 차단 기능을 제공합니다.
 */
@Resolver()
export class ModerationResolver {
  constructor(private readonly moderationService: ModerationService) {}

  /**
   * 신고 생성
   * @param user 현재 사용자
   * @param input 신고 정보
   * @returns 생성된 신고
   */
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Report, { description: '신고 생성' })
  async createReport(
    @CurrentUser() user: User,
    @Args('input') input: CreateReportInput,
  ): Promise<Report> {
    return await this.moderationService.createReport(user.id, input);
  }

  /**
   * 사용자 차단
   * @param user 현재 사용자
   * @param blockedUserId 차단할 사용자 ID
   * @returns 생성된 차단 관계
   */
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Block, { description: '사용자 차단' })
  async blockUser(
    @CurrentUser() user: User,
    @Args('blockedUserId') blockedUserId: string,
  ): Promise<Block> {
    return await this.moderationService.blockUser(user.id, blockedUserId);
  }

  /**
   * 사용자 차단 해제
   * @param user 현재 사용자
   * @param blockedUserId 차단 해제할 사용자 ID
   * @returns 성공 여부
   */
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean, { description: '사용자 차단 해제' })
  async unblockUser(
    @CurrentUser() user: User,
    @Args('blockedUserId') blockedUserId: string,
  ): Promise<boolean> {
    return await this.moderationService.unblockUser(user.id, blockedUserId);
  }

  /**
   * 차단된 사용자 목록 조회
   * @param user 현재 사용자
   * @returns 차단된 사용자 ID 배열
   */
  @UseGuards(OptionalGqlAuthGuard)
  @Query(() => [String], { description: '차단된 사용자 목록 조회' })
  async getBlockedUsers(@CurrentUser() user: User | null): Promise<string[]> {
    try {
      if (!user || !user.id) {
        return [];
      }
      return await this.moderationService.getBlockedUserIds(user.id);
    } catch (error) {
      console.error('차단된 사용자 목록 조회 오류:', error);
      return [];
    }
  }

  /**
   * 특정 사용자 차단 여부 확인
   * @param user 현재 사용자
   * @param userId 확인할 사용자 ID
   * @returns 차단 여부
   */
  @UseGuards(GqlAuthGuard)
  @Query(() => Boolean, { description: '사용자 차단 여부 확인' })
  async isUserBlocked(
    @CurrentUser() user: User,
    @Args('userId') userId: string,
  ): Promise<boolean> {
    return await this.moderationService.isUserBlocked(user.id, userId);
  }
}
