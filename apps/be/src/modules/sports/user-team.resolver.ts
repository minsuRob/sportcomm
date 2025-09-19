import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserTeam } from '../../entities/user-team.entity';

/**
 * UserTeam 관련 파생(계산) 필드 리졸버
 * - 팀별 등록 순번(teamRegistrationOrder)을 계산하여 제공합니다.
 */
@Resolver(() => UserTeam)
export class UserTeamResolver {
  constructor(
    @InjectRepository(UserTeam)
    private readonly userTeamRepository: Repository<UserTeam>,
  ) {}

  /**
   * 팀별 등록 순번을 반환합니다.
   * - 정의: 동일한 teamId에 대해 createdAt(동일 시 id 오름차순) 기준으로 몇 번째 등록인지(1부터 시작)
   * - 저장 컬럼이 아닌 계산 필드로, 질의 시 카운트합니다.
   */
  @ResolveField(() => Number, {
    name: 'teamRegistrationOrder',
    description:
      '동일 팀 내에서 이 UserTeam이 몇 번째로 등록되었는지 (1부터 시작)',
  })
  async resolveTeamRegistrationOrder(@Parent() userTeam: UserTeam): Promise<number> {
    // 필수 키가 비어있다면 보강 조회 (일부 호출 경로에서 선택 컬럼만 로드될 수 있음)
    const teamId = userTeam.teamId;
    const createdAt = userTeam.createdAt;
    const id = userTeam.id;

    if (!teamId || !createdAt || !id) {
      const fresh = await this.userTeamRepository.findOne({
        where: { id: userTeam.id },
        select: ['id', 'teamId', 'createdAt'],
      });
      if (!fresh) return 0;
      // 재할당
      userTeam = fresh as UserTeam;
    }

    // 동일 팀에서 이 레코드보다 먼저(또는 같은 시각에 id가 작거나 같은) 생성된 개수
    // createdAt 동시간대 tie-breaker를 id 오름차순으로 처리
    const count = await this.userTeamRepository
      .createQueryBuilder('ut')
      .where('ut.teamId = :teamId', { teamId: userTeam.teamId })
      .andWhere(
        '(ut.createdAt < :createdAt OR (ut.createdAt = :createdAt AND ut.id <= :id))',
        { createdAt: userTeam.createdAt, id: userTeam.id },
      )
      .getCount();

    // 사람에게 보여줄 순번이므로 1부터 시작 (count는 0부터 시작하므로 +1)
    return count + 1;
  }
}


