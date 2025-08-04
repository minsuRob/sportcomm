import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sport, Team } from '../../entities';

/**
 * 스포츠 서비스
 *
 * 스포츠 카테고리 관련 비즈니스 로직을 처리합니다.
 */
@Injectable()
export class SportsService {
  constructor(
    @InjectRepository(Sport)
    private readonly sportsRepository: Repository<Sport>,
    @InjectRepository(Team)
    private readonly teamsRepository: Repository<Team>,
  ) {}

  /**
   * 모든 활성화된 스포츠 목록을 조회합니다.
   * @returns 스포츠 목록 (팀 정보 포함)
   */
  async findAll(): Promise<Sport[]> {
    return this.sportsRepository.find({
      where: { isActive: true },
      relations: ['teams'],
      order: {
        sortOrder: 'ASC',
        name: 'ASC',
        teams: {
          sortOrder: 'ASC',
          name: 'ASC',
        },
      },
    });
  }

  /**
   * 특정 스포츠를 ID로 조회합니다.
   * @param id 스포츠 ID
   * @returns 스포츠 정보 (팀 정보 포함)
   */
  async findById(id: string): Promise<Sport> {
    const sport = await this.sportsRepository.findOne({
      where: { id, isActive: true },
      relations: ['teams'],
      order: {
        teams: {
          sortOrder: 'ASC',
          name: 'ASC',
        },
      },
    });

    if (!sport) {
      throw new NotFoundException('스포츠를 찾을 수 없습니다.');
    }

    return sport;
  }

  /**
   * 스포츠 이름으로 조회합니다.
   * @param name 스포츠 이름
   * @returns 스포츠 정보 (팀 정보 포함)
   */
  async findByName(name: string): Promise<Sport> {
    const sport = await this.sportsRepository.findOne({
      where: { name, isActive: true },
      relations: ['teams'],
      order: {
        teams: {
          sortOrder: 'ASC',
          name: 'ASC',
        },
      },
    });

    if (!sport) {
      throw new NotFoundException(`'${name}' 스포츠를 찾을 수 없습니다.`);
    }

    return sport;
  }

  /**
   * 특정 스포츠에 속한 팀들을 조회합니다.
   * @param sportId 스포츠 ID
   * @returns 팀 목록
   */
  async getTeamsBySportId(sportId: string): Promise<Team[]> {
    const sport = await this.findById(sportId);
    return sport.teams.filter((team) => team.isActive);
  }

  /**
   * 스포츠 통계 정보를 조회합니다.
   * @param sportId 스포츠 ID
   * @returns 통계 정보
   */
  async getSportStats(sportId: string): Promise<{
    totalTeams: number;
    activeTeams: number;
    totalUsers: number;
  }> {
    const sport = await this.findById(sportId);

    const totalTeams = sport.teams.length;
    const activeTeams = sport.teams.filter((team) => team.isActive).length;

    // 이 스포츠의 팀들을 선택한 사용자 수 계산
    const totalUsers = await this.teamsRepository
      .createQueryBuilder('team')
      .leftJoin('team.userTeams', 'userTeam')
      .where('team.sportId = :sportId', { sportId })
      .andWhere('team.isActive = :isActive', { isActive: true })
      .select('COUNT(DISTINCT userTeam.user)', 'count')
      .getRawOne()
      .then((result) => parseInt(result.count) || 0);

    return {
      totalTeams,
      activeTeams,
      totalUsers,
    };
  }
}
