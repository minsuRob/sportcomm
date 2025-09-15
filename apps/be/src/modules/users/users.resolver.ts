import { UseGuards } from '@nestjs/common';
import {
  Args,
  Mutation,
  Resolver,
  ResolveField,
  Query,
  Parent,
  ObjectType,
  Field,
} from '@nestjs/graphql';
import { Follow } from '../../entities/follow.entity';
import { UserTeam } from '../../entities/user-team.entity';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import {
  CurrentUser,
  CurrentUserId,
} from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { User } from '../../entities/user.entity';

/**
 * 닉네임 중복 확인 결과 타입
 */
@ObjectType()
export class NicknameAvailabilityResult {
  @Field(() => Boolean, { description: '닉네임 사용 가능 여부' })
  available: boolean;

  @Field(() => String, { description: '결과 메시지' })
  message: string;
}

/**
 * 추천인 코드 검증 결과 타입
 */
@ObjectType()
export class ReferralCodeValidationResult {
  @Field(() => Boolean, { description: '추천인 코드 유효 여부' })
  isValid: boolean;

  @Field(() => String, { description: '결과 메시지' })
  message: string;
}

/**
 * 추천인 코드 적용 결과 타입
 */
@ObjectType()
export class ReferralCodeApplicationResult {
  @Field(() => Boolean, { description: '적용 성공 여부' })
  success: boolean;

  @Field(() => String, { description: '결과 메시지' })
  message: string;

  @Field(() => Number, { nullable: true, description: '지급된 포인트' })
  pointsAwarded?: number;
}

/**
 * 추천받은 사용자 정보 타입
 */
@ObjectType()
export class ReferredUserInfo {
  @Field(() => String, { description: '사용자 ID' })
  id: string;

  @Field(() => String, { description: '닉네임' })
  nickname: string;

  @Field(() => Date, { description: '가입 일시' })
  createdAt: Date;
}

/**
 * 추천인 통계 타입
 */
@ObjectType()
export class ReferralStats {
  @Field(() => String, { description: '내 추천인 코드' })
  referralCode: string;

  @Field(() => Number, { description: '총 추천 수' })
  totalReferrals: number;

  @Field(() => Number, { description: '남은 추천 가능 횟수' })
  availableSlots: number;

  @Field(() => [ReferredUserInfo], { description: '추천받은 사용자 목록' })
  referredUsers: ReferredUserInfo[];
}

@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  /**
   * 사용자의 팔로잉 목록을 반환하는 리졸버
   * @param user 현재 처리 중인 User 객체
   * @returns 팔로잉 목록 배열 (항상 배열 반환, null 아님)
   */
  @ResolveField(() => [Follow], { nullable: false })
  async following(@Parent() user: User): Promise<Follow[]> {
    console.log(`[Resolver] 사용자 ${user.id}의 팔로잉 조회 요청`);
    const following = await this.usersService.getFollowing(user.id);
    console.log(`[Resolver] 사용자 ${user.id}의 팔로잉 조회 결과:`, following);
    return following || [];
  }

  /**
   * 사용자의 팔로워 목록을 반환하는 리졸버
   * @param user 현재 처리 중인 User 객체
   * @returns 팔로워 목록 배열 (항상 배열 반환, null 아님)
   */
  @ResolveField(() => [Follow], { nullable: false })
  async followers(@Parent() user: User): Promise<Follow[]> {
    console.log(`[Resolver] 사용자 ${user.id}의 팔로워 조회 요청`);
    const followers = await this.usersService.getFollowers(user.id);
    console.log(`[Resolver] 사용자 ${user.id}의 팔로워 조회 결과:`, followers);
    return followers || [];
  }

  /**
   * 사용자 ID로 사용자 정보를 조회하는 쿼리
   * @param userId 조회할 사용자 ID
   * @returns 사용자 정보
   */
  @UseGuards(GqlAuthGuard)
  @Query(() => User, { description: '사용자 ID로 사용자 정보 조회' })
  async getUserById(@Args('userId') userId: string): Promise<User> {
    return this.usersService.findById(userId);
  }

  /**
   * 사용자를 팔로우하거나 언팔로우하는 뮤테이션
   * @param userId 팔로우/언팔로우할 대상 사용자 ID
   * @param currentUserId 현재 로그인한 사용자 ID
   * @returns 새로운 팔로우 상태 (true: 팔로우, false: 언팔로우)
   */
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean)
  async toggleFollow(
    @Args('userId') userId: string,
    @CurrentUserId() currentUserId: string,
  ): Promise<boolean> {
    return this.usersService.toggleFollow(currentUserId, userId);
  }

  /**
   * 특정 사용자의 팔로워 수를 반환하는 리졸버
   * @param user 현재 처리 중인 User 객체
   * @returns 팔로워 수
   */
  @ResolveField(() => Number, { description: '이 사용자의 팔로워 수' })
  async followerCount(@Parent() user: User): Promise<number> {
    return this.usersService.getFollowerCount(user.id);
  }

  /**
   * 특정 사용자가 팔로우하는 사용자 수를 반환하는 리졸버
   * @param user 현재 처리 중인 User 객체
   * @returns 팔로잉 수
   */
  @ResolveField(() => Number, {
    description: '이 사용자가 팔로우하는 사용자 수',
  })
  async followingCount(@Parent() user: User): Promise<number> {
    return this.usersService.getFollowingCount(user.id);
  }

  /**
   * 특정 사용자가 작성한 게시물 수를 반환하는 리졸버
   * @param user 현재 처리 중인 User 객체
   * @returns 게시물 수
   */
  @ResolveField(() => Number, { description: '이 사용자가 작성한 게시물 수' })
  async postCount(@Parent() user: User): Promise<number> {
    return this.usersService.getPostCount(user.id);
  }

  /**
   * 현재 로그인한 사용자가 특정 사용자를 팔로우하는지 여부를 반환하는 리졸버
   * @param user 현재 처리 중인 User 객체
   * @param currentUser 현재 로그인한 사용자 정보 (선택적)
   * @returns 팔로우 여부
   */
  @ResolveField(() => Boolean, {
    description: '현재 사용자가 이 사용자를 팔로우하는지 여부',
  })
  async isFollowing(
    @Parent() user: User,
    @CurrentUser() currentUser: User,
  ): Promise<boolean> {
    if (!currentUser || currentUser.id === user.id) {
      return false;
    }
    return this.usersService.isFollowing(currentUser.id, user.id);
  }

  /**
   * 사용자가 선택한 팀 목록을 반환하는 리졸버
   * @param user 현재 처리 중인 User 객체
   * @returns 사용자가 선택한 팀 목록 배열
   */
  @ResolveField(() => [UserTeam], {
    nullable: false,
    description: '사용자가 선택한 팀 목록',
  })
  async myTeams(@Parent() user: User): Promise<UserTeam[]> {
    return this.usersService.getUserTeams(user.id);
  }

  /**
   * 닉네임 중복 확인 쿼리
   * @param nickname 확인할 닉네임
   * @param excludeUserId 제외할 사용자 ID (프로필 수정 시 본인 제외)
   * @returns 닉네임 사용 가능 여부와 메시지
   */
  @Query(() => NicknameAvailabilityResult, {
    description: '닉네임 중복 확인',
  })
  async checkNicknameAvailability(
    @Args('nickname') nickname: string,
    @Args('excludeUserId', { nullable: true }) excludeUserId?: string,
  ): Promise<NicknameAvailabilityResult> {
    return this.usersService.checkNicknameAvailability(nickname, excludeUserId);
  }

  /**
   * 추천인 코드 검증 쿼리
   * @param referralCode 검증할 추천인 코드
   * @param currentUserId 현재 사용자 ID
   * @returns 추천인 코드 유효성 검증 결과
   */
  @UseGuards(GqlAuthGuard)
  @Query(() => ReferralCodeValidationResult, {
    description: '추천인 코드 유효성 검증',
  })
  async validateReferralCode(
    @Args('referralCode') referralCode: string,
    @CurrentUserId() currentUserId: string,
  ): Promise<ReferralCodeValidationResult> {
    const result = await this.usersService.validateReferralCode(
      referralCode,
      currentUserId,
    );
    return {
      isValid: result.isValid,
      message: result.message,
    };
  }

  /**
   * 추천인 코드 적용 뮤테이션
   * @param referralCode 적용할 추천인 코드
   * @param currentUserId 현재 사용자 ID
   * @returns 추천인 코드 적용 결과
   */
  @UseGuards(GqlAuthGuard)
  @Mutation(() => ReferralCodeApplicationResult, {
    description: '추천인 코드 적용 및 포인트 지급',
  })
  async applyReferralCode(
    @Args('referralCode') referralCode: string,
    @CurrentUserId() currentUserId: string,
  ): Promise<ReferralCodeApplicationResult> {
    return this.usersService.applyReferralCode(currentUserId, referralCode);
  }

  /**
   * 추천인 통계 조회 쿼리
   * @param currentUserId 현재 사용자 ID
   * @returns 추천인 통계 정보
   */
  @UseGuards(GqlAuthGuard)
  @Query(() => ReferralStats, {
    description: '추천인 통계 및 추천받은 사용자 목록 조회',
  })
  async getReferralStats(
    @CurrentUserId() currentUserId: string,
  ): Promise<ReferralStats> {
    return this.usersService.getReferralStats(currentUserId);
  }
}
