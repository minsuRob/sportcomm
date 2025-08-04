import { Resolver, Query, Args, ResolveField, Parent } from '@nestjs/graphql';
import { Sport, Team } from '../../entities';
import { SportsService } from './sports.service';

/**
 * 스포츠 GraphQL 리졸버
 *
 * 스포츠 관련 GraphQL 쿼리를 처리합니다.
 */
@Resolver(() => Sport)
export class SportsResolver {
  constructor(private readonly sportsService: SportsService) {}

  /**
   * 모든 스포츠 목록을 조회합니다.
   * @returns 스포츠 목록
   */
  @Query(() => [Sport], {
    name: 'sports',
    description: '모든 활성화된 스포츠 목록을 조회합니다.',
  })
  async getSports(): Promise<Sport[]> {
    return this.sportsService.findAll();
  }

  /**
   * 특정 스포츠를 ID로 조회합니다.
   * @param id 스포츠 ID
   * @returns 스포츠 정보
   */
  @Query(() => Sport, {
    name: 'sport',
    description: '특정 스포츠를 ID로 조회합니다.',
  })
  async getSport(
    @Args('id', { type: () => String, description: '스포츠 ID' }) id: string,
  ): Promise<Sport> {
    return this.sportsService.findById(id);
  }

  /**
   * 스포츠 이름으로 조회합니다.
   * @param name 스포츠 이름
   * @returns 스포츠 정보
   */
  @Query(() => Sport, {
    name: 'sportByName',
    description: '스포츠 이름으로 조회합니다.',
  })
  async getSportByName(
    @Args('name', { type: () => String, description: '스포츠 이름' })
    name: string,
  ): Promise<Sport> {
    return this.sportsService.findByName(name);
  }

  /**
   * 스포츠에 속한 팀들을 조회합니다.
   * @param parent 부모 스포츠 객체
   * @returns 팀 목록
   */
  @ResolveField(() => [Team], { description: '스포츠에 속한 팀 목록' })
  async teams(@Parent() sport: Sport): Promise<Team[]> {
    if (sport.teams) {
      return sport.teams.filter((team) => team.isActive);
    }
    return this.sportsService.getTeamsBySportId(sport.id);
  }

  /**
   * 스포츠 통계 정보를 조회합니다.
   * @param parent 부모 스포츠 객체
   * @returns 통계 정보
   */
  @ResolveField(() => Number, {
    description: '이 스포츠를 선택한 총 사용자 수',
  })
  async totalUsers(@Parent() sport: Sport): Promise<number> {
    const stats = await this.sportsService.getSportStats(sport.id);
    return stats.totalUsers;
  }

  /**
   * 활성화된 팀 수를 조회합니다.
   * @param parent 부모 스포츠 객체
   * @returns 활성화된 팀 수
   */
  @ResolveField(() => Number, { description: '활성화된 팀 수' })
  async activeTeamCount(@Parent() sport: Sport): Promise<number> {
    const stats = await this.sportsService.getSportStats(sport.id);
    return stats.activeTeams;
  }
}
