import {
  Injectable,
  ForbiddenException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Team } from '../../entities/team.entity';
import { Sport } from '../../entities/sport.entity';
import {
  CreateTeamInput,
  UpdateTeamInput,
  TeamInfo,
  SportCategoryInfo,
} from './dto/team-management.dto';

/**
 * 팀 관리 서비스
 *
 * 팀 데이터를 관리하는 서비스입니다.
 * 데이터베이스 기반으로 구현되어 있습니다.
 */
@Injectable()
export class TeamManagementService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(Sport)
    private readonly sportRepository: Repository<Sport>,
  ) {}

  /**
   * 관리자 권한 확인
   */
  private validateAdminPermission(user: User): void {
    if (!user.isAdmin()) {
      throw new ForbiddenException('관리자 권한이 필요합니다.');
    }
  }

  /**
   * Team 엔티티를 TeamInfo DTO로 변환
   */
  private teamToTeamInfo(team: Team): TeamInfo {
    if (!team.sport) {
      throw new NotFoundException(
        `Team with id ${team.id} has no associated sport.`,
      );
    }
    return {
      id: team.id,
      name: team.name,
      // Deprecated 단일 색상 호환 (없으면 mainColor 사용)
      color: team.color ?? team.mainColor,
      mainColor: team.mainColor,
      subColor: team.subColor,
      darkMainColor: team.darkMainColor,
      darkSubColor: team.darkSubColor,
      icon: team.icon,
      sport: team.sport,
      isActive: team.isActive,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
    };
  }

  /**
   * 모든 팀 목록 조회
   */
  async getAllTeams(adminUser: User): Promise<TeamInfo[]> {
    this.validateAdminPermission(adminUser);

    const teams = await this.teamRepository.find({
      relations: ['sport'],
      order: { name: 'ASC' },
    });

    return teams.map((team) => this.teamToTeamInfo(team));
  }

  /**
   * 카테고리별 팀 목록 조회
   */
  async getTeamsByCategory(adminUser: User): Promise<SportCategoryInfo[]> {
    this.validateAdminPermission(adminUser);

    const sports = await this.sportRepository.find({
      relations: ['teams'],
      where: { isActive: true },
      order: {
        sortOrder: 'ASC',
        name: 'ASC',
        teams: { sortOrder: 'ASC', name: 'ASC' },
      },
    });

    return sports.map((sport) => ({
      id: sport.id,
      name: sport.name,
      icon: sport.icon,
      teams: sport.teams.map((team) => {
        // team 객체에 sport 정보를 수동으로 할당
        team.sport = sport;
        return this.teamToTeamInfo(team);
      }),
    }));
  }

  /**
   * 특정 팀 조회
   */
  async getTeamById(adminUser: User, teamId: string): Promise<TeamInfo> {
    this.validateAdminPermission(adminUser);

    const team = await this.teamRepository.findOne({
      where: { id: teamId },
      relations: ['sport'],
    });

    if (!team) {
      throw new NotFoundException('팀을 찾을 수 없습니다.');
    }

    return this.teamToTeamInfo(team);
  }

  /**
   * 팀 생성
   */
  async createTeam(adminUser: User, input: CreateTeamInput): Promise<TeamInfo> {
    this.validateAdminPermission(adminUser);

    // 스포츠 카테고리 찾기
    const sport = await this.sportRepository.findOne({
      where: { id: input.sportId },
    });
    if (!sport) {
      throw new NotFoundException('해당 스포츠 카테고리를 찾을 수 없습니다.');
    }

    // 중복 이름 확인 (같은 스포츠 내에서)
    const existingTeamByName = await this.teamRepository.findOne({
      where: { name: input.name, sport: { id: sport.id } },
    });
    if (existingTeamByName) {
      throw new ConflictException(
        '같은 카테고리에 이미 존재하는 팀 이름입니다.',
      );
    }

    // 정렬 순서 계산
    const lastTeam = await this.teamRepository.findOne({
      where: { sport: { id: sport.id } },
      order: { sortOrder: 'DESC' },
    });
    const sortOrder = (lastTeam?.sortOrder || 0) + 1;

    // 팀 생성
    const team = this.teamRepository.create({
      name: input.name,
      code: input.name.substring(0, 3).toUpperCase(),
      // 구(color)는 선택적. 없으면 mainColor로 초기 채움 (하위 호환)
      color: input.color ?? input.mainColor,
      mainColor: input.mainColor,
      subColor: input.subColor,
      darkMainColor: input.darkMainColor,
      darkSubColor: input.darkSubColor,
      icon: input.icon,
      sport: sport,
      sortOrder,
      isActive: true,
    });

    const savedTeam = await this.teamRepository.save(team);

    // sport 관계를 포함하여 다시 조회
    const newTeam = await this.teamRepository.findOne({
      where: { id: savedTeam.id },
      relations: ['sport'],
    });

    if (!newTeam) {
      throw new NotFoundException('생성된 팀을 찾을 수 없습니다.');
    }

    return this.teamToTeamInfo(newTeam);
  }

  /**
   * 팀 수정
   */
  async updateTeam(
    adminUser: User,
    teamId: string,
    input: UpdateTeamInput,
  ): Promise<TeamInfo> {
    this.validateAdminPermission(adminUser);

    const team = await this.teamRepository.findOne({
      where: { id: teamId },
      relations: ['sport'],
    });
    if (!team) {
      throw new NotFoundException('팀을 찾을 수 없습니다.');
    }

    // 스포츠 카테고리 변경 시 처리
    if (input.sportId && team.sport?.id !== input.sportId) {
      const newSport = await this.sportRepository.findOne({
        where: { id: input.sportId },
      });
      if (!newSport) {
        throw new NotFoundException('해당 스포츠 카테고리를 찾을 수 없습니다.');
      }
      team.sport = newSport;
    }

    // 이름 중복 확인
    if (input.name && input.name !== team.name) {
      const existingTeam = await this.teamRepository.findOne({
        where: {
          name: input.name,
          sport: { id: team.sport?.id },
          id: Not(teamId),
        },
      });
      if (existingTeam) {
        throw new ConflictException(
          '같은 카테고리에 이미 존재하는 팀 이름입니다.',
        );
      }
    }

    // 팀 정보 업데이트
    if (input.name) team.name = input.name;
    if (input.color) team.color = input.color;
    if (input.mainColor) team.mainColor = input.mainColor;
    if (input.subColor) team.subColor = input.subColor;
    if (input.darkMainColor) team.darkMainColor = input.darkMainColor;
    if (input.darkSubColor) team.darkSubColor = input.darkSubColor;
    if (input.icon) team.icon = input.icon;
    if (input.logoUrl) team.logoUrl = input.logoUrl;
    team.updatedAt = new Date();

    const savedTeam = await this.teamRepository.save(team);
    return this.teamToTeamInfo(savedTeam);
  }

  /**
   * 팀 삭제
   */
  async deleteTeam(adminUser: User, teamId: string): Promise<boolean> {
    this.validateAdminPermission(adminUser);

    const team = await this.teamRepository.findOne({
      where: { id: teamId },
    });
    if (!team) {
      throw new NotFoundException('팀을 찾을 수 없습니다.');
    }

    await this.teamRepository.remove(team);
    return true;
  }

  /**
   * 팀 활성화/비활성화
   */
  async toggleTeamStatus(adminUser: User, teamId: string): Promise<TeamInfo> {
    this.validateAdminPermission(adminUser);

    const team = await this.teamRepository.findOne({
      where: { id: teamId },
      relations: ['sport'],
    });
    if (!team) {
      throw new NotFoundException('팀을 찾을 수 없습니다.');
    }

    team.isActive = !team.isActive;
    team.updatedAt = new Date();

    const savedTeam = await this.teamRepository.save(team);
    return this.teamToTeamInfo(savedTeam);
  }

  /**
   * 프론트엔드용 팀 데이터 내보내기
   * 프론트엔드에서 사용할 수 있는 형태로 팀 데이터를 반환합니다.
   */
  async exportTeamsForFrontend(): Promise<any> {
    const sports = await this.sportRepository.find({
      relations: ['teams'],
      where: { isActive: true },
      order: {
        sortOrder: 'ASC',
        name: 'ASC',
        teams: { sortOrder: 'ASC', name: 'ASC' },
      },
    });

    return sports.map((sport) => ({
      id: sport.id,
      name: sport.name,
      icon: sport.icon,
      teams: sport.teams
        .filter((team) => team.isActive)
        .map((team) => ({
          id: team.id,
          name: team.name,
          color: team.color ?? team.mainColor, // legacy fallback
          mainColor: team.mainColor,
          subColor: team.subColor,
          darkMainColor: team.darkMainColor,
          darkSubColor: team.darkSubColor,
          icon: team.icon,
          logoUrl: team.logoUrl,
        })),
    }));
  }
}
