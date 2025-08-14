import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
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

  /**
   * 새로운 스포츠 카테고리를 생성합니다.
   * @param input 스포츠 생성 정보
   * @returns 생성된 스포츠 정보
   */
  async createSport(input: {
    name: string;
    icon: string;
    description?: string;
    defaultTeamName?: string;
  }): Promise<Sport> {
    // 중복 이름 확인
    const existingSport = await this.sportsRepository.findOne({
      where: { name: input.name },
    });

    if (existingSport) {
      throw new BadRequestException('이미 존재하는 스포츠 이름입니다.');
    }

    // 정렬 순서 계산 (마지막 순서 + 1)
    const lastSport = await this.sportsRepository.findOne({
      order: { sortOrder: 'DESC' },
    });
    const sortOrder = (lastSport?.sortOrder || 0) + 1;

    // 스포츠 생성
    const sport = this.sportsRepository.create({
      name: input.name,
      icon: input.icon,
      description: input.description,
      sortOrder,
      isActive: true,
    });

    const savedSport = await this.sportsRepository.save(sport);

    // 기본 팀 생성 (옵션)
    if (input.defaultTeamName) {
      const defaultTeam = this.teamsRepository.create({
        id: `${input.name.toUpperCase()}_DEFAULT`,
        name: input.defaultTeamName,
        code: input.name.substring(0, 3).toUpperCase(),
        color: '#000000',
        icon: input.icon,
        sport: savedSport,
        sortOrder: 1,
        isActive: true,
      });

      await this.teamsRepository.save(defaultTeam);
    }

    return this.findById(savedSport.id);
  }

  /**
   * 스포츠 정보를 업데이트합니다.
   * @param id 스포츠 ID
   * @param input 업데이트할 정보
   * @returns 업데이트된 스포츠 정보
   */
  async updateSport(
    id: string,
    input: {
      name?: string;
      icon?: string;
      description?: string;
      sortOrder?: number;
      isActive?: boolean;
    },
  ): Promise<Sport> {
    const sport = await this.findById(id);

    // 이름 중복 확인 (다른 스포츠와)
    if (input.name && input.name !== sport.name) {
      const existingSport = await this.sportsRepository.findOne({
        where: { name: input.name },
      });

      if (existingSport) {
        throw new BadRequestException('이미 존재하는 스포츠 이름입니다.');
      }
    }

    // 업데이트
    Object.assign(sport, input);
    sport.updatedAt = new Date();

    await this.sportsRepository.save(sport);
    return this.findById(id);
  }

  /**
   * 스포츠를 삭제합니다.
   * @param id 스포츠 ID
   * @returns 삭제 성공 여부
   */
  async deleteSport(id: string): Promise<boolean> {
    const sport = await this.findById(id);

    // 소속 팀이 있는지 확인
    if (sport.teams && sport.teams.length > 0) {
      throw new BadRequestException(
        '소속 팀이 있는 스포츠는 삭제할 수 없습니다. 먼저 모든 팀을 삭제해주세요.',
      );
    }

    await this.sportsRepository.remove(sport);
    return true;
  }

  /**
   * 스포츠 활성화 상태를 토글합니다.
   * @param id 스포츠 ID
   * @returns 업데이트된 스포츠 정보
   */
  async toggleSportStatus(id: string): Promise<Sport> {
    const sport = await this.findById(id);
    sport.isActive = !sport.isActive;
    sport.updatedAt = new Date();

    await this.sportsRepository.save(sport);
    return sport;
  }
}
