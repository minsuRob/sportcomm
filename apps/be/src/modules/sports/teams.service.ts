import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team, UserTeam, User } from '../../entities';
import { UpdateMyTeamInput } from './teams.mutation';

/**
 * 팀 서비스
 *
 * 팀 관련 비즈니스 로직과 사용자 팀 선택 기능을 처리합니다.
 */
@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly teamsRepository: Repository<Team>,
    @InjectRepository(UserTeam)
    private readonly userTeamsRepository: Repository<UserTeam>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  /**
   * 모든 활성화된 팀 목록을 조회합니다.
   * @returns 팀 목록 (스포츠 정보 포함)
   */
  async findAll(): Promise<Team[]> {
    return this.teamsRepository.find({
      where: { isActive: true },
      relations: ['sport'],
      order: {
        sport: { sortOrder: 'ASC', name: 'ASC' },
        sortOrder: 'ASC',
        name: 'ASC',
      },
    });
  }

  /**
   * 특정 팀을 ID로 조회합니다.
   * @param id 팀 ID
   * @returns 팀 정보 (스포츠 정보 포함)
   */
  async findById(id: string): Promise<Team> {
    const team = await this.teamsRepository.findOne({
      where: { id, isActive: true },
      relations: ['sport'],
    });

    if (!team) {
      throw new NotFoundException('팀을 찾을 수 없습니다.');
    }

    return team;
  }

  /**
   * 팀 코드로 조회합니다.
   * @param code 팀 코드
   * @returns 팀 정보 (스포츠 정보 포함)
   */
  async findByCode(code: string): Promise<Team> {
    const team = await this.teamsRepository.findOne({
      where: { code, isActive: true },
      relations: ['sport'],
    });

    if (!team) {
      throw new NotFoundException(`'${code}' 팀을 찾을 수 없습니다.`);
    }

    return team;
  }

  /**
   * 사용자가 선택한 팀 목록을 조회합니다.
   * @param userId 사용자 ID
   * @returns 사용자가 선택한 팀 목록
   */
  async getUserTeams(userId: string): Promise<UserTeam[]> {
    return this.userTeamsRepository.find({
      where: { user: { id: userId } },
      relations: ['team', 'team.sport', 'user'],
      order: {
        priority: 'ASC',
        createdAt: 'ASC',
      },
    });
  }

  /**
   * 사용자의 주 팀을 조회합니다 (우선순위가 0인 팀).
   * @param userId 사용자 ID
   * @returns 주 팀 정보 또는 null
   */
  async getUserPrimaryTeam(userId: string): Promise<Team | null> {
    const userTeam = await this.userTeamsRepository.findOne({
      where: { user: { id: userId }, priority: 0 },
      relations: ['team', 'team.sport'],
    });

    return userTeam?.team || null;
  }

  /**
   * 사용자가 팀을 선택합니다.
   * @param userId 사용자 ID
   * @param teamId 팀 ID
   * @param priority 우선순위 (0이 주 팀)
   * @returns 생성된 UserTeam 관계
   */
  async selectTeam(
    userId: string,
    teamId: string,
    priority: number = 0,
  ): Promise<UserTeam> {
    // 사용자 존재 확인
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // 팀 존재 확인
    const team = await this.findById(teamId);

    // 이미 선택한 팀인지 확인
    const existingUserTeam = await this.userTeamsRepository.findOne({
      where: { user: { id: userId }, team: { id: teamId } },
    });

    if (existingUserTeam) {
      throw new BadRequestException('이미 선택한 팀입니다.');
    }

    // 주 팀(priority: 0) 설정 시 기존 주 팀의 우선순위 변경
    if (priority === 0) {
      await this.userTeamsRepository.update(
        { user: { id: userId }, priority: 0 },
        { priority: 1 },
      );
    }

    // 새로운 팀 선택 관계 생성
    const userTeam = this.userTeamsRepository.create({
      user,
      team,
      priority,
      notificationEnabled: true,
    });

    return this.userTeamsRepository.save(userTeam);
  }

  /**
   * 사용자가 팀 선택을 해제합니다.
   * @param userId 사용자 ID
   * @param teamId 팀 ID
   * @returns 삭제 성공 여부
   */
  async unselectTeam(userId: string, teamId: string): Promise<boolean> {
    const userTeam = await this.userTeamsRepository.findOne({
      where: { user: { id: userId }, team: { id: teamId } },
    });

    if (!userTeam) {
      throw new NotFoundException('선택한 팀을 찾을 수 없습니다.');
    }

    await this.userTeamsRepository.remove(userTeam);

    // 주 팀을 해제한 경우, 다음 우선순위 팀을 주 팀으로 승격
    if (userTeam.priority === 0) {
      const nextPriorityTeam = await this.userTeamsRepository.findOne({
        where: { user: { id: userId } },
        order: { priority: 'ASC', createdAt: 'ASC' },
      });

      if (nextPriorityTeam) {
        nextPriorityTeam.priority = 0;
        await this.userTeamsRepository.save(nextPriorityTeam);
      }
    }

    return true;
  }

  /**
   * 사용자의 팀 선택을 모두 업데이트합니다.
   * @param userId 사용자 ID
   * @param teamIds 선택할 팀 ID 배열
   * @returns 업데이트된 UserTeam 관계 배열
   */
  async updateUserTeams(
    userId: string,
    teamsData: UpdateMyTeamInput[],
  ): Promise<UserTeam[]> {
    // 사용자 존재 확인
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // 기존 팀 선택 모두 삭제
    await this.userTeamsRepository.delete({ user: { id: userId } });

    // 새로운 팀 선택 생성
    const userTeams: UserTeam[] = [];
    for (let i = 0; i < teamsData.length; i++) {
      const {
        teamId,
        favoriteDate,
        favoritePlayerName,
        favoritePlayerNumber,
      } = teamsData[i];

      // 팀 존재 확인 및 조회
      const team = await this.findById(teamId);

      const userTeam = this.userTeamsRepository.create({
        user,
        team,
        priority: i, // 배열 순서대로 우선순위 설정
        notificationEnabled: true,
        favoriteDate: favoriteDate ? new Date(favoriteDate) : undefined,
        favoritePlayerName: favoritePlayerName || undefined,
        favoritePlayerNumber:
          typeof favoritePlayerNumber === 'number'
            ? favoritePlayerNumber
            : undefined,
      });

      const savedUserTeam = await this.userTeamsRepository.save(userTeam);
      userTeams.push(savedUserTeam);
    }

    return userTeams;
  }

  /**
   * 팀 통계 정보를 조회합니다.
   * @param teamId 팀 ID
   * @returns 통계 정보
   */
  async getTeamStats(teamId: string): Promise<{
    totalUsers: number;
    primaryUsers: number; // 주 팀으로 선택한 사용자 수
  }> {
    const team = await this.findById(teamId);

    const totalUsers = await this.userTeamsRepository.count({
      where: { teamId },
    });

    const primaryUsers = await this.userTeamsRepository.count({
      where: { teamId, priority: 0 },
    });

    return {
      totalUsers,
      primaryUsers,
    };
  }

  /**
   * 사용자가 특정 팀을 선택했는지 확인합니다.
   * @param userId 사용자 ID
   * @param teamId 팀 ID
   * @returns 선택 여부
   */
  async hasUserSelectedTeam(userId: string, teamId: string): Promise<boolean> {
    const userTeam = await this.userTeamsRepository.findOne({
      where: { user: { id: userId }, team: { id: teamId } },
    });

    return !!userTeam;
  }

  /**
   * 팀 로고 업데이트
   * @param teamId 팀 ID
   * @param logoUrl 새로운 로고 URL
   * @returns 업데이트된 팀 정보
   */
  async updateTeamLogo(teamId: string, logoUrl: string): Promise<Team> {
    const team = await this.teamsRepository.findOne({
      where: { id: teamId },
      relations: ['sport'],
    });

    if (!team) {
      throw new NotFoundException('팀을 찾을 수 없습니다.');
    }

    team.logoUrl = logoUrl;
    return await this.teamsRepository.save(team);
  }
}
