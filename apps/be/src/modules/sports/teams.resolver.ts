import {
  Resolver,
  Query,
  Mutation,
  Args,
  ResolveField,
  Parent,
  Context,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Team, UserTeam, Sport } from '../../entities';
import { TeamsService } from './teams.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

/**
 * 팀 GraphQL 리졸버
 *
 * 팀 관련 GraphQL 쿼리와 뮤테이션을 처리합니다.
 */
@Resolver(() => Team)
export class TeamsResolver {
  constructor(private readonly teamsService: TeamsService) {}

  /**
   * 모든 팀 목록을 조회합니다.
   * @returns 팀 목록
   */
  @Query(() => [Team], {
    name: 'teams',
    description: '모든 활성화된 팀 목록을 조회합니다.',
  })
  async getTeams(): Promise<Team[]> {
    return this.teamsService.findAll();
  }

  /**
   * 특정 팀을 ID로 조회합니다.
   * @param id 팀 ID
   * @returns 팀 정보
   */
  @Query(() => Team, {
    name: 'team',
    description: '특정 팀을 ID로 조회합니다.',
  })
  async getTeam(
    @Args('id', { type: () => String, description: '팀 ID' }) id: string,
  ): Promise<Team> {
    return this.teamsService.findById(id);
  }

  /**
   * 팀 코드로 조회합니다.
   * @param code 팀 코드
   * @returns 팀 정보
   */
  @Query(() => Team, {
    name: 'teamByCode',
    description: '팀 코드로 조회합니다.',
  })
  async getTeamByCode(
    @Args('code', { type: () => String, description: '팀 코드' }) code: string,
  ): Promise<Team> {
    return this.teamsService.findByCode(code);
  }

  /**
   * 현재 사용자가 선택한 팀 목록을 조회합니다.
   * @param context GraphQL 컨텍스트 (사용자 정보 포함)
   * @returns 사용자가 선택한 팀 목록
   */
  @Query(() => [UserTeam], {
    name: 'myTeams',
    description: '현재 사용자가 선택한 팀 목록을 조회합니다.',
  })
  @UseGuards(JwtAuthGuard)
  async getMyTeams(@Context() context: any): Promise<UserTeam[]> {
    // GraphQL 컨텍스트에서 사용자 정보 추출
    const request = context.req || context.request;
    const user = request?.user;

    console.log('getMyTeams 컨텍스트 디버깅:', {
      hasContext: !!context,
      hasReq: !!context.req,
      hasRequest: !!context.request,
      hasUser: !!user,
      userId: user?.id,
      userKeys: user ? Object.keys(user) : null,
    });

    if (!user || !user.id) {
      throw new Error(
        '인증된 사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.',
      );
    }

    const userId = user.id;
    return this.teamsService.getUserTeams(userId);
  }

  /**
   * 현재 사용자의 주 팀을 조회합니다.
   * @param context GraphQL 컨텍스트 (사용자 정보 포함)
   * @returns 주 팀 정보
   */
  @Query(() => Team, {
    name: 'myPrimaryTeam',
    description: '현재 사용자의 주 팀을 조회합니다.',
    nullable: true,
  })
  @UseGuards(JwtAuthGuard)
  async getMyPrimaryTeam(@Context() context: any): Promise<Team | null> {
    const userId = context.req.user.id;
    return this.teamsService.getUserPrimaryTeam(userId);
  }

  /**
   * 팀을 선택합니다.
   * @param teamId 팀 ID
   * @param priority 우선순위 (0이 주 팀)
   * @param context GraphQL 컨텍스트 (사용자 정보 포함)
   * @returns 생성된 UserTeam 관계
   */
  @Mutation(() => UserTeam, {
    name: 'selectTeam',
    description: '팀을 선택합니다.',
  })
  @UseGuards(JwtAuthGuard)
  async selectTeam(
    @Args('teamId', { type: () => String, description: '팀 ID' })
    teamId: string,
    @Args('priority', {
      type: () => Number,
      description: '우선순위 (0이 주 팀)',
      defaultValue: 0,
    })
    priority: number,
    @Context() context: any,
  ): Promise<UserTeam> {
    const userId = context.req.user.id;
    return this.teamsService.selectTeam(userId, teamId, priority);
  }

  /**
   * 팀 선택을 해제합니다.
   * @param teamId 팀 ID
   * @param context GraphQL 컨텍스트 (사용자 정보 포함)
   * @returns 삭제 성공 여부
   */
  @Mutation(() => Boolean, {
    name: 'unselectTeam',
    description: '팀 선택을 해제합니다.',
  })
  @UseGuards(JwtAuthGuard)
  async unselectTeam(
    @Args('teamId', { type: () => String, description: '팀 ID' })
    teamId: string,
    @Context() context: any,
  ): Promise<boolean> {
    const userId = context.req.user.id;
    return this.teamsService.unselectTeam(userId, teamId);
  }

  /**
   * 사용자의 팀 선택을 모두 업데이트합니다.
   * @param teamIds 선택할 팀 ID 배열
   * @param context GraphQL 컨텍스트 (사용자 정보 포함)
   * @returns 업데이트된 UserTeam 관계 배열
   */
  @Mutation(() => [UserTeam], {
    name: 'updateMyTeams',
    description: '사용자의 팀 선택을 모두 업데이트합니다.',
  })
  @UseGuards(JwtAuthGuard)
  async updateMyTeams(
    @Args('teamIds', {
      type: () => [String],
      description: '선택할 팀 ID 배열',
    })
    teamIds: string[],
    @Context() context: any,
  ): Promise<UserTeam[]> {
    // GraphQL 컨텍스트에서 사용자 정보 추출
    const request = context.req || context.request;
    const user = request?.user;

    console.log('updateMyTeams 컨텍스트 디버깅:', {
      hasContext: !!context,
      hasReq: !!context.req,
      hasRequest: !!context.request,
      hasUser: !!user,
      userId: user?.id,
      userKeys: user ? Object.keys(user) : null,
    });

    if (!user || !user.id) {
      throw new Error(
        '인증된 사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.',
      );
    }

    const userId = user.id;
    return this.teamsService.updateUserTeams(userId, teamIds);
  }

  /**
   * 팀의 소속 스포츠를 조회합니다.
   * @param parent 부모 팀 객체
   * @returns 소속 스포츠 정보
   */
  @ResolveField(() => Sport, { description: '소속 스포츠' })
  async sport(@Parent() team: Team): Promise<Sport> {
    if (!team.sport) {
      // 스포츠 정보가 없을 경우 직접 조회
      const fullTeam = await this.teamsService.findById(team.id);
      if (!fullTeam.sport) {
        throw new Error(`팀 ${team.name}의 스포츠 정보를 찾을 수 없습니다.`);
      }
      return fullTeam.sport;
    }
    return team.sport;
  }

  /**
   * 팀을 선택한 총 사용자 수를 조회합니다.
   * @param parent 부모 팀 객체
   * @returns 총 사용자 수
   */
  @ResolveField(() => Number, { description: '이 팀을 선택한 총 사용자 수' })
  async totalUsers(@Parent() team: Team): Promise<number> {
    const stats = await this.teamsService.getTeamStats(team.id);
    return stats.totalUsers;
  }

  /**
   * 팀을 주 팀으로 선택한 사용자 수를 조회합니다.
   * @param parent 부모 팀 객체
   * @returns 주 팀으로 선택한 사용자 수
   */
  @ResolveField(() => Number, {
    description: '이 팀을 주 팀으로 선택한 사용자 수',
  })
  async primaryUsers(@Parent() team: Team): Promise<number> {
    const stats = await this.teamsService.getTeamStats(team.id);
    return stats.primaryUsers;
  }
}
