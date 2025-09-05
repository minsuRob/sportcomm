import { Resolver, Mutation, Args, Query } from '@nestjs/graphql';
import { UseGuards, Logger } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { User } from '../../entities/user.entity';
import { UserSyncService } from './user-sync.service';
import { SyncUserInput, UpdateUserProfileInput } from './dto/sync-user.input';

/**
 * 사용자 동기화 GraphQL 리졸버
 *
 * Supabase Auth와 NestJS 간의 사용자 정보 동기화를 위한 GraphQL API를 제공합니다.
 * 회원가입 후 클라이언트에서 사용자 정보를 동기화할 때 사용합니다.
 */
@Resolver(() => User)
export class AuthSyncResolver {
  private readonly logger = new Logger(AuthSyncResolver.name);

  constructor(private readonly userSyncService: UserSyncService) {}

  /**
   * 사용자 정보 동기화 뮤테이션
   *
   * Supabase Auth 회원가입 후 NestJS에 사용자 정보를 생성/업데이트합니다.
   * JWT 토큰을 통해 인증된 사용자만 자신의 정보를 동기화할 수 있습니다.
   *
   * @param user 현재 인증된 사용자 (JWT에서 추출)
   * @param input 동기화할 사용자 정보
   * @returns 동기화된 User
   */
  @Mutation(() => User, {
    description: '사용자 정보 동기화 (회원가입 후 호출)',
  })
  @UseGuards(SupabaseAuthGuard)
  async syncUser(
    @CurrentUser() user: User,
    @Args('input') input: SyncUserInput,
  ): Promise<User> {
    this.logger.log(`사용자 동기화 요청: ${user.id} (${input.nickname})`);

    try {
      const syncedUser = await this.userSyncService.syncUser({
        userId: user.id,
        nickname: input.nickname,
        role: input.role,
        profileImageUrl: input.profileImageUrl,
        bio: input.bio,
      });

      this.logger.log(
        `사용자 동기화 성공: ${user.id} -> ${syncedUser.nickname}`,
      );
      return syncedUser;
    } catch (error) {
      this.logger.error(`사용자 동기화 실패: ${user.id}`, error.stack);
      throw error;
    }
  }

  /**
   * 사용자 프로필 업데이트 뮤테이션
   *
   * 인증된 사용자가 자신의 프로필 정보를 업데이트합니다.
   *
   * @param user 현재 인증된 사용자
   * @param input 업데이트할 프로필 정보
   * @returns 업데이트된 User
   */
  @Mutation(() => User, {
    description: '사용자 프로필 업데이트',
  })
  @UseGuards(SupabaseAuthGuard)
  async updateUserProfile(
    @CurrentUser() user: User,
    @Args('input') input: UpdateUserProfileInput,
  ): Promise<User> {
    this.logger.log(`프로필 업데이트 요청: ${user.id}`);

    try {
      const updatedUser = await this.userSyncService.updateUserProfile(
        user.id,
        input,
      );

      this.logger.log(
        `프로필 업데이트 성공: ${user.id} -> ${updatedUser.nickname}`,
      );
      return updatedUser;
    } catch (error) {
      this.logger.error(`프로필 업데이트 실패: ${user.id}`, error.stack);
      throw error;
    }
  }

  /**
   * 현재 사용자 정보 조회 쿼리
   *
   * JWT 토큰을 통해 인증된 사용자의 상세 정보를 조회합니다.
   * Supabase Auth 정보와 User를 결합한 통합 정보를 반환합니다.
   *
   * @param user 현재 인증된 사용자
   * @returns 통합 사용자 정보
   */
  @Query(() => User, {
    description: '현재 사용자 정보 조회',
  })
  @UseGuards(SupabaseAuthGuard)
  async getCurrentUserInfo(@CurrentUser() user: User): Promise<User> {
    this.logger.log(`현재 사용자 정보 조회: ${user.id}`);

    try {
      // UserInfo 조회 (없으면 자동 생성)
      const combinedInfo = await this.userSyncService.getCombinedUserInfo(
        user.id,
      );

      if (!combinedInfo) {
        throw new Error('사용자 정보를 찾을 수 없습니다.');
      }

      // CombinedUserInfo를 User 형태로 변환
      // User 인스턴스를 직접 생성하여 클래스 메서드/게터(level 등) 호환성을 확보
      const currentUser = new User();
      currentUser.id = combinedInfo.id;
      currentUser.nickname = combinedInfo.nickname;
      currentUser.email = combinedInfo.email || '';
      currentUser.role = combinedInfo.role;
      currentUser.profileImageUrl = combinedInfo.profileImageUrl;
      currentUser.bio = combinedInfo.bio;
      currentUser.isActive = combinedInfo.isActive;
      currentUser.isEmailVerified = !!combinedInfo.emailConfirmedAt;
      currentUser.createdAt = combinedInfo.createdAt;
      currentUser.updatedAt = combinedInfo.updatedAt;
      currentUser.points = (combinedInfo as any).points ?? 0;
      currentUser.lastAttendanceAt =
        (combinedInfo as any).lastAttendanceAt || undefined;
      // 선택 필드(출석/레벨 계산 관련)는 entity 게터/메서드 내부 로직으로 처리됨
      // 관계 배열은 지연 로딩/별도 조회 대상이므로 빈 배열로 초기화 (선택적)
      currentUser.posts = [];
      currentUser.comments = [];
      currentUser.following = [];
      currentUser.followers = [];
      currentUser.chatMessages = [];
      currentUser.likes = [];
      currentUser.blocking = [];
      currentUser.blockedBy = [];
      currentUser.bookmarks = [];
      currentUser.userTeams = [];

      return currentUser;
    } catch (error) {
      this.logger.error(`현재 사용자 정보 조회 실패: ${user.id}`, error.stack);
      throw error;
    }
  }

  /**
   * 닉네임 중복 확인 쿼리
   *
   * 회원가입이나 프로필 업데이트 시 닉네임 중복을 확인합니다.
   *
   * @param nickname 확인할 닉네임
   * @param user 현재 사용자 (본인 제외용)
   * @returns 중복 여부 (true: 사용 불가, false: 사용 가능)
   */
  @Query(() => Boolean, {
    description: '닉네임 중복 확인 (true: 사용 불가, false: 사용 가능)',
  })
  @UseGuards(SupabaseAuthGuard)
  async checkNicknameTaken(
    @Args('nickname') nickname: string,
    @CurrentUser() user: User,
  ): Promise<boolean> {
    this.logger.log(`닉네임 중복 확인: ${nickname} (요청자: ${user.id})`);

    try {
      const isTaken = await this.userSyncService.isNicknameTaken(
        nickname,
        user.id,
      );

      this.logger.log(
        `닉네임 중복 확인 결과: ${nickname} -> ${isTaken ? '사용 불가' : '사용 가능'}`,
      );
      return isTaken;
    } catch (error) {
      this.logger.error(`닉네임 중복 확인 실패: ${nickname}`, error.stack);
      throw error;
    }
  }
}
