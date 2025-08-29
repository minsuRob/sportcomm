import { TeamCustomizationConfig, TeamCustomizationRegistryType } from './types';
import { DoosanStripes } from './teams/doosan/DoosanStripes';
import { LGStripes } from './teams/lg/LGStripes';
import { KIATigerStripes } from './teams/kia/KIATigerStripes';

/**
 * 팀 커스터마이징 레지스트리
 *
 * 각 팀별 커스터마이징 설정을 중앙에서 관리하는 시스템
 * 런타임에 동적으로 팀 커스터마이징을 등록/해제할 수 있습니다.
 */
class TeamCustomizationRegistryClass {
  private registry: TeamCustomizationRegistryType = {};
  private listeners: Set<() => void> = new Set();

  /**
   * 팀 커스터마이징 설정 등록
   */
  register(config: TeamCustomizationConfig): void {
    this.registry[config.teamId] = config;
    this.notifyListeners();
  }

  /**
   * 여러 팀 커스터마이징 설정 일괄 등록
   */
  registerMultiple(configs: TeamCustomizationConfig[]): void {
    configs.forEach(config => {
      this.registry[config.teamId] = config;
    });
    this.notifyListeners();
  }

  /**
   * 팀 커스터마이징 설정 해제
   */
  unregister(teamId: string): void {
    delete this.registry[teamId];
    this.notifyListeners();
  }

  /**
   * 팀 커스터마이징 설정 조회
   */
  get(teamId: string): TeamCustomizationConfig | null {
    return this.registry[teamId] || null;
  }

  /**
   * 모든 등록된 팀 목록 조회
   */
  getAllTeamIds(): string[] {
    return Object.keys(this.registry);
  }

  /**
   * 모든 커스터마이징 설정 조회
   */
  getAll(): TeamCustomizationRegistryType {
    return { ...this.registry };
  }

  /**
   * 팀이 커스터마이징되어 있는지 확인
   */
  hasCustomization(teamId: string): boolean {
    return teamId in this.registry;
  }

  /**
   * 특정 컴포넌트 타입이 활성화되어 있는지 확인
   */
  hasActiveDecoration(teamId: string): boolean {
    const config = this.get(teamId);
    return config?.decoration?.enabled === true;
  }

  hasActiveUniform(teamId: string): boolean {
    const config = this.get(teamId);
    return config?.uniform?.enabled === true;
  }

  hasActiveCustomComponent(teamId: string, componentKey: string): boolean {
    const config = this.get(teamId);
    return config?.customComponents?.[componentKey]?.enabled === true;
  }

  /**
   * 레지스트리 변경 리스너 등록
   */
  addListener(listener: () => void): () => void {
    this.listeners.add(listener);

    // 리스너 제거 함수 반환
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * 모든 리스너에게 변경 알림
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  /**
   * 레지스트리 초기화 (개발/테스트용)
   */
  clear(): void {
    this.registry = {};
    this.notifyListeners();
  }

  /**
   * 디버깅용 레지스트리 상태 출력
   */
  debug(): void {
    if (__DEV__) {
      console.log('TeamCustomizationRegistry State:', {
        registeredTeams: this.getAllTeamIds(),
        totalConfigs: Object.keys(this.registry).length,
        registry: this.registry
      });
    }
  }
}

// 싱글톤 인스턴스 생성
export const TeamCustomizationRegistry = new TeamCustomizationRegistryClass();

// 편의 함수들 export
export const registerTeamCustomization = (config: TeamCustomizationConfig) => {
  TeamCustomizationRegistry.register(config);
};

export const unregisterTeamCustomization = (teamId: string) => {
  TeamCustomizationRegistry.unregister(teamId);
};

export const getTeamCustomization = (teamId: string) => {
  return TeamCustomizationRegistry.get(teamId);
};

export const hasTeamCustomization = (teamId: string) => {
  return TeamCustomizationRegistry.hasCustomization(teamId);
};

// 팀별 기본 커스터마이징 설정 등록
const initializeDefaultCustomizations = () => {
  // 두산 베어스 스트라이프
  registerTeamCustomization({
    teamId: 'doosan',
    teamName: '두산',
    decoration: {
      component: DoosanStripes,
      props: {
        width: 24,
        height: 160,
        opacity: 0.6,
        position: 'bottom-left',
      },
      enabled: true,
    },
    styles: {
      decoration: ({ colors }) => ({
        position: 'absolute',
        left: 8,
        bottom: 60,
        zIndex: 1,
      }),
    },
  });

  // LG 트윈스 세로 스트라이프
  registerTeamCustomization({
    teamId: 'lg',
    teamName: 'LG',
    decoration: {
      component: LGStripes,
      props: {
        width: 32,
        height: 160,
        opacity: 0.4,
        position: 'bottom-left',
      },
      enabled: true,
    },
    styles: {
      decoration: ({ colors }) => ({
        position: 'absolute',
        left: 8,
        bottom: 60,
        zIndex: 1,
      }),
    },
  });

  // 기아 타이거즈 호랑이 스트라이프
  registerTeamCustomization({
    teamId: 'kia',
    teamName: '기아',
    decoration: {
      component: KIATigerStripes,
      props: {
        width: 32,
        height: 160,
        opacity: 0.5,
        position: 'bottom-right',
      },
      enabled: true,
    },
    styles: {
      decoration: ({ colors }) => ({
        position: 'absolute',
        right: 8,
        bottom: 60,
        zIndex: 1,
      }),
    },
  });
};

// 앱 시작 시 기본 커스터마이징 초기화
initializeDefaultCustomizations();
