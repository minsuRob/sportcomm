import {
  Injectable,
  ForbiddenException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { User } from '../../entities/user.entity';
import {
  CreateTeamInput,
  UpdateTeamInput,
  TeamInfo,
  SportCategoryInfo,
  TeamCategory,
} from './dto/team-management.dto';

/**
 * 팀 관리 서비스
 *
 * 팀 데이터를 관리하는 서비스입니다.
 * 현재는 메모리 기반으로 구현되어 있으며, 필요시 데이터베이스로 확장 가능합니다.
 */
@Injectable()
export class TeamManagementService {
  // 메모리 기반 팀 데이터 저장소
  private teams: Map<string, TeamInfo> = new Map();

  constructor() {
    // 초기 팀 데이터 로드
    this.initializeDefaultTeams();
  }

  /**
   * 관리자 권한 확인
   */
  private validateAdminPermission(user: User): void {
    if (!user.isAdmin()) {
      throw new ForbiddenException('관리자 권한이 필요합니다.');
    }
  }

  /**
   * 기본 팀 데이터 초기화
   */
  private initializeDefaultTeams(): void {
    const defaultTeams = [
      // 축구팀
      {
        id: 'TOTTENHAM',
        name: '토트넘',
        color: '#132257',
        icon: '⚽',
        category: TeamCategory.SOCCER,
      },
      {
        id: 'NEWCASTLE',
        name: '뉴캐슬',
        color: '#241F20',
        icon: '⚽',
        category: TeamCategory.SOCCER,
      },
      {
        id: 'ATLETICO_MADRID',
        name: '아틀레티코',
        color: '#CE2029',
        icon: '⚽',
        category: TeamCategory.SOCCER,
      },
      {
        id: 'MANCHESTER_CITY',
        name: '맨시티',
        color: '#6CABDD',
        icon: '⚽',
        category: TeamCategory.SOCCER,
      },
      {
        id: 'LIVERPOOL',
        name: '리버풀',
        color: '#C8102E',
        icon: '⚽',
        category: TeamCategory.SOCCER,
      },
      // 야구팀
      {
        id: 'DOOSAN_BEARS',
        name: '두산',
        color: '#131230',
        icon: '⚾',
        category: TeamCategory.BASEBALL,
      },
      {
        id: 'HANWHA_EAGLES',
        name: '한화',
        color: '#FF6600',
        icon: '⚾',
        category: TeamCategory.BASEBALL,
      },
      {
        id: 'LG_TWINS',
        name: 'LG',
        color: '#C30452',
        icon: '⚾',
        category: TeamCategory.BASEBALL,
      },
      {
        id: 'SAMSUNG_LIONS',
        name: '삼성',
        color: '#074CA1',
        icon: '⚾',
        category: TeamCategory.BASEBALL,
      },
      {
        id: 'KIA_TIGERS',
        name: 'KIA',
        color: '#EA0029',
        icon: '⚾',
        category: TeamCategory.BASEBALL,
      },
      // e스포츠팀
      {
        id: 'T1',
        name: 'T1',
        color: '#E2012D',
        icon: '🎮',
        category: TeamCategory.ESPORTS,
      },
      {
        id: 'GENG',
        name: 'Gen.G',
        color: '#AA8B56',
        icon: '🎮',
        category: TeamCategory.ESPORTS,
      },
      {
        id: 'DRX',
        name: 'DRX',
        color: '#2E5BFF',
        icon: '🎮',
        category: TeamCategory.ESPORTS,
      },
      {
        id: 'KT_ROLSTER',
        name: 'KT',
        color: '#D4002A',
        icon: '🎮',
        category: TeamCategory.ESPORTS,
      },
      {
        id: 'DAMWON_KIA',
        name: '담원',
        color: '#004B9F',
        icon: '🎮',
        category: TeamCategory.ESPORTS,
      },
    ];

    const now = new Date();
    defaultTeams.forEach((teamData) => {
      const team: TeamInfo = {
        ...teamData,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };
      this.teams.set(team.id, team);
    });
  }

  /**
   * 모든 팀 목록 조회
   */
  async getAllTeams(adminUser: User): Promise<TeamInfo[]> {
    this.validateAdminPermission(adminUser);
    return Array.from(this.teams.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  /**
   * 카테고리별 팀 목록 조회
   */
  async getTeamsByCategory(adminUser: User): Promise<SportCategoryInfo[]> {
    this.validateAdminPermission(adminUser);

    const categoryMap = new Map<TeamCategory, TeamInfo[]>();

    // 팀들을 카테고리별로 그룹화
    Array.from(this.teams.values()).forEach((team) => {
      if (!categoryMap.has(team.category)) {
        categoryMap.set(team.category, []);
      }
      categoryMap.get(team.category)!.push(team);
    });

    // 카테고리 정보 생성
    const categories: SportCategoryInfo[] = [];

    categoryMap.forEach((teams, category) => {
      const categoryInfo = this.getCategoryInfo(category);
      categories.push({
        id: category,
        name: categoryInfo.name,
        icon: categoryInfo.icon,
        teams: teams.sort((a, b) => a.name.localeCompare(b.name)),
      });
    });

    return categories.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * 특정 팀 조회
   */
  async getTeamById(adminUser: User, teamId: string): Promise<TeamInfo> {
    this.validateAdminPermission(adminUser);

    const team = this.teams.get(teamId);
    if (!team) {
      throw new NotFoundException('팀을 찾을 수 없습니다.');
    }

    return team;
  }

  /**
   * 팀 생성
   */
  async createTeam(adminUser: User, input: CreateTeamInput): Promise<TeamInfo> {
    this.validateAdminPermission(adminUser);

    // 중복 ID 확인
    if (this.teams.has(input.id)) {
      throw new ConflictException('이미 존재하는 팀 ID입니다.');
    }

    // 중복 이름 확인
    const existingTeam = Array.from(this.teams.values()).find(
      (team) => team.name === input.name && team.category === input.category,
    );
    if (existingTeam) {
      throw new ConflictException(
        '같은 카테고리에 이미 존재하는 팀 이름입니다.',
      );
    }

    const now = new Date();
    const team: TeamInfo = {
      ...input,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    this.teams.set(team.id, team);
    return team;
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

    const team = this.teams.get(teamId);
    if (!team) {
      throw new NotFoundException('팀을 찾을 수 없습니다.');
    }

    // 이름 중복 확인 (다른 팀과 중복되는지)
    if (input.name && input.name !== team.name) {
      const existingTeam = Array.from(this.teams.values()).find(
        (t) =>
          t.id !== teamId &&
          t.name === input.name &&
          t.category === (input.category || team.category),
      );
      if (existingTeam) {
        throw new ConflictException(
          '같은 카테고리에 이미 존재하는 팀 이름입니다.',
        );
      }
    }

    // 팀 정보 업데이트
    const updatedTeam: TeamInfo = {
      ...team,
      ...input,
      updatedAt: new Date(),
    };

    this.teams.set(teamId, updatedTeam);
    return updatedTeam;
  }

  /**
   * 팀 삭제
   */
  async deleteTeam(adminUser: User, teamId: string): Promise<boolean> {
    this.validateAdminPermission(adminUser);

    const team = this.teams.get(teamId);
    if (!team) {
      throw new NotFoundException('팀을 찾을 수 없습니다.');
    }

    this.teams.delete(teamId);
    return true;
  }

  /**
   * 팀 활성화/비활성화
   */
  async toggleTeamStatus(adminUser: User, teamId: string): Promise<TeamInfo> {
    this.validateAdminPermission(adminUser);

    const team = this.teams.get(teamId);
    if (!team) {
      throw new NotFoundException('팀을 찾을 수 없습니다.');
    }

    const updatedTeam: TeamInfo = {
      ...team,
      isActive: !team.isActive,
      updatedAt: new Date(),
    };

    this.teams.set(teamId, updatedTeam);
    return updatedTeam;
  }

  /**
   * 카테고리 정보 반환
   */
  private getCategoryInfo(category: TeamCategory): {
    name: string;
    icon: string;
  } {
    const categoryInfoMap = {
      [TeamCategory.SOCCER]: { name: '축구', icon: '⚽' },
      [TeamCategory.BASEBALL]: { name: '야구', icon: '⚾' },
      [TeamCategory.ESPORTS]: { name: 'e스포츠', icon: '🎮' },
      [TeamCategory.BASKETBALL]: { name: '농구', icon: '🏀' },
      [TeamCategory.VOLLEYBALL]: { name: '배구', icon: '🏐' },
    };

    return categoryInfoMap[category] || { name: '기타', icon: '🏆' };
  }

  /**
   * 프론트엔드용 팀 데이터 내보내기
   * 프론트엔드에서 사용할 수 있는 형태로 팀 데이터를 반환합니다.
   */
  async exportTeamsForFrontend(): Promise<any> {
    const categories = await this.getTeamsByCategory({
      isAdmin: () => true,
    } as User);

    return categories.map((category) => ({
      id: category.id.toLowerCase(),
      name: category.name,
      icon: category.icon,
      teams: category.teams.map((team) => ({
        id: team.id,
        name: team.name,
        color: team.color,
        icon: team.icon,
      })),
    }));
  }
}
