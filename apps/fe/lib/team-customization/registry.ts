import { TeamCustomizationConfig, TeamCustomizationRegistryType } from './types';
import { DoosanStripes } from './teams/doosan/DoosanStripes';
import { LGStripes } from './teams/lg/LGStripes';
import { KIATigerStripes } from './teams/kia/KIATigerStripes';
import { SamsungStripes } from './teams/samsung/SamsungStripes';

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
    if (!config?.decoration) return false;

    // decoration이 배열인 경우
    if (Array.isArray(config.decoration)) {
      return config.decoration.some(d => d.enabled === true);
    }

    // decoration이 단일 객체인 경우
    return config.decoration.enabled === true;
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

// 팀별 커스터마이징 설정 함수들 (확장 가능한 구조)
// 새로운 팀 추가 시: create[TeamName]Customization 함수를 만들고 initializeDefaultCustomizations에 추가
const createDoosanCustomization = (): TeamCustomizationConfig => ({
  teamId: 'doosan',
  teamName: '두산',
  decoration: [
    {
      component: DoosanStripes,
      props: {
        width: 24,
        height: 150,
        opacity: 0.9,
        position: 'bottom-left' as const,
      },
      enabled: true,
    },
    {
      component: DoosanStripes,
      props: {
        width: 24,
        height: 150,
        opacity: 0.9,
        position: 'bottom-right' as const,
      },
      enabled: true,
    },
  ],
  styles: {
    decoration: ({ colors }) => ({
      position: 'absolute',
      left: 8,
      bottom: 60,
      zIndex: 1,
    }),
    decorationRight: ({ colors }) => ({
      position: 'absolute',
      right: 8,
      bottom: 60,
      zIndex: 1,
    }),
  },
});

const createLGCustomization = (): TeamCustomizationConfig => ({
  teamId: 'lg',
  teamName: 'LG',
  decoration: [
    {
      component: LGStripes,
      props: {
        width: 8,         // 단일 stripe 너비 (더 넓게)
        height: 200,      // 단일 stripe 높이 (적당한 높이)
        color: '#C41E3A', // LG 트윈스 레드 색상
        opacity: 0.8,     // 적당한 투명도
        position: 'bottom-left' as const,
      },
      enabled: true,
    },
    {
      component: LGStripes,
      props: {
        width: 8,         // 단일 stripe 너비 (더 넓게)
        height: 200,      // 단일 stripe 높이 (적당한 높이)
        color: '#C41E3A', // LG 트윈스 레드 색상
        opacity: 0.8,     // 적당한 투명도
        position: 'bottom-right' as const,
      },
      enabled: true,
    },
  ],
  styles: {
    decoration: ({ colors }) => ({
      position: 'absolute',
      left: 8,
      bottom: 60,
      zIndex: 1,
    }),
    decorationRight: ({ colors }) => ({
      position: 'absolute',
      right: 8,
      bottom: 60,
      zIndex: 1,
    }),
  },
});

const createKIACustomization = (): TeamCustomizationConfig => ({
  teamId: 'kia',
  teamName: '기아',
  decoration: {
    component: KIATigerStripes,
    props: {
      width: 32,
      height: 160,
      opacity: 0.5,
      position: 'bottom-right' as const,
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

const createSamsungCustomization = (): TeamCustomizationConfig => ({
  teamId: 'samsung',
  teamName: '삼성',
  decoration: [
    {
      component: SamsungStripes,
      props: {
        width: 3,
        height: 350,
        color: '#003DA5', // 삼성 라이온즈 블루
        opacity: 0.8,
        position: 'bottom-left' as const,
      },
      enabled: true,
    },
    {
      component: SamsungStripes,
      props: {
        width: 3,
        height: 350,
        color: '#003DA5', // 삼성 라이온즈 블루
        opacity: 0.8,
        position: 'bottom-right' as const,
      },
      enabled: true,
    },
  ],
  styles: {
    decoration: ({ colors }) => ({
      position: 'absolute',
      left: 8,
      bottom: 60,
      zIndex: 1,
    }),
    decorationRight: ({ colors }) => ({
      position: 'absolute',
      right: 8,
      bottom: 60,
      zIndex: 1,
    }),
  },
});

// 팀별 기본 커스터마이징 설정 등록
const initializeDefaultCustomizations = () => {
  // 두산 베어스 스트라이프 (양쪽 배치)
  registerTeamCustomization(createDoosanCustomization());

  // LG 트윈스 세로 스트라이프
  registerTeamCustomization(createLGCustomization());

  // 기아 타이거즈 호랑이 스트라이프
  registerTeamCustomization(createKIACustomization());

  // 삼성 라이온즈 스트라이프 (양쪽 배치)
  registerTeamCustomization(createSamsungCustomization());
};

// 앱 시작 시 기본 커스터마이징 초기화
initializeDefaultCustomizations();

/**
 * 새로운 팀 커스터마이징 추가 방법:
 *
 * 1. 팀별 컴포넌트 파일 생성 (예: teams/samsung/SamsungCircles.tsx)
 * 2. create[TeamName]Customization 함수 생성 (위 참고)
 * 3. initializeDefaultCustomizations()에 함수 호출 추가
 * 4. 필요한 경우 import 추가
 *
 * 예시:
 * import { SamsungStripes } from './teams/samsung/SamsungStripes';
 * const createSamsungCustomization = (): TeamCustomizationConfig => ({ ... });
 * registerTeamCustomization(createSamsungCustomization());
 */
