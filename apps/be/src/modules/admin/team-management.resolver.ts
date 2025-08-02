import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { TeamManagementService } from './team-management.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';
import {
  TeamInfo,
  SportCategoryInfo,
  CreateTeamInput,
  UpdateTeamInput,
  TeamManagementResponse,
} from './dto/team-management.dto';

/**
 * 팀 관리 리졸버
 *
 * 관리자 전용 팀 관리 GraphQL API를 제공합니다.
 */
@Resolver()
@UseGuards(JwtAuthGuard)
export class TeamManagementResolver {
  constructor(private readonly teamManagementService: TeamManagementService) {}

  // === 팀 조회 ===

  @Query(() => [TeamInfo], { description: '모든 팀 목록 조회' })
  async adminGetAllTeams(@CurrentUser() user: User): Promise<TeamInfo[]> {
    return await this.teamManagementService.getAllTeams(user);
  }

  @Query(() => [SportCategoryInfo], { description: '카테고리별 팀 목록 조회' })
  async adminGetTeamsByCategory(
    @CurrentUser() user: User,
  ): Promise<SportCategoryInfo[]> {
    return await this.teamManagementService.getTeamsByCategory(user);
  }

  @Query(() => TeamInfo, { description: '특정 팀 조회' })
  async adminGetTeamById(
    @CurrentUser() user: User,
    @Args('teamId') teamId: string,
  ): Promise<TeamInfo> {
    return await this.teamManagementService.getTeamById(user, teamId);
  }

  // === 팀 관리 ===

  @Mutation(() => TeamInfo, { description: '팀 생성' })
  async adminCreateTeam(
    @CurrentUser() user: User,
    @Args('input') input: CreateTeamInput,
  ): Promise<TeamInfo> {
    return await this.teamManagementService.createTeam(user, input);
  }

  @Mutation(() => TeamInfo, { description: '팀 수정' })
  async adminUpdateTeam(
    @CurrentUser() user: User,
    @Args('teamId') teamId: string,
    @Args('input') input: UpdateTeamInput,
  ): Promise<TeamInfo> {
    return await this.teamManagementService.updateTeam(user, teamId, input);
  }

  @Mutation(() => Boolean, { description: '팀 삭제' })
  async adminDeleteTeam(
    @CurrentUser() user: User,
    @Args('teamId') teamId: string,
  ): Promise<boolean> {
    return await this.teamManagementService.deleteTeam(user, teamId);
  }

  @Mutation(() => TeamInfo, { description: '팀 활성화/비활성화 토글' })
  async adminToggleTeamStatus(
    @CurrentUser() user: User,
    @Args('teamId') teamId: string,
  ): Promise<TeamInfo> {
    return await this.teamManagementService.toggleTeamStatus(user, teamId);
  }

  // === 프론트엔드 지원 ===

  @Query(() => String, {
    description: '프론트엔드용 팀 데이터 내보내기 (JSON 문자열)',
  })
  async exportTeamsForFrontend(): Promise<string> {
    const teamsData = await this.teamManagementService.exportTeamsForFrontend();
    return JSON.stringify(teamsData, null, 2);
  }
}
