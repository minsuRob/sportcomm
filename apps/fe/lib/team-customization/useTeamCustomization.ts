import { useMemo, useState, useEffect } from 'react';
import { TeamCustomizationRegistry } from './registry';
import type {
  UseTeamCustomizationResult,
  TeamData,
  TeamCustomizationConfig
} from './types';

/**
 * 팀 커스터마이징 훅
 *
 * 팀 ID를 기반으로 해당 팀의 커스터마이징 설정을 조회하고,
 * PostCard에서 사용할 수 있는 컴포넌트와 설정을 제공합니다.
 *
 * @param teamId - 팀 ID
 * @param teamData - 팀 데이터 (옵셔널)
 * @returns 팀 커스터마이징 결과 객체
 */
export function useTeamCustomization(
  teamId: string,
  teamData?: TeamData
): UseTeamCustomizationResult {
  const [, forceUpdate] = useState({});

  // 레지스트리 변경 시 리렌더링 트리거
  useEffect(() => {
    const unsubscribe = TeamCustomizationRegistry.addListener(() => {
      forceUpdate({});
    });

    return unsubscribe;
  }, []);

  // 팀 커스터마이징 설정 조회 (팀 이름 기반 fallback 포함)
  const teamConfig = useMemo(() => {
    // 1차: teamId로 직접 조회
    let config = TeamCustomizationRegistry.get(teamId);

    // 2차: 팀 이름으로 fallback 조회
    if (!config && teamData?.name) {
      const teamName = teamData.name.trim();

      // 팀 이름 기반 매핑 테이블
      const teamNameMapping: { [key: string]: string } = {
        '두산': 'doosan',
        '두산베어스': 'doosan',
        '두산 베어스': 'doosan',
        'Doosan': 'doosan',
        'Doosan Bears': 'doosan',
        '삼성': 'samsung',
        '삼성라이온즈': 'samsung',
        '삼성 라이온즈': 'samsung',
        'Samsung': 'samsung',
        'Samsung Lions': 'samsung'
      };

      const mappedTeamId = teamNameMapping[teamName];
      if (mappedTeamId) {
        config = TeamCustomizationRegistry.get(mappedTeamId);
      }
    }

    return config;
  }, [teamId, teamData?.name]);

  // 커스터마이징 여부 확인
  const isCustomized = useMemo(() => {
    return teamConfig !== null;
  }, [teamConfig]);

  // 장식 컴포넌트 (SVG 등) 설정
  const decorationConfig = useMemo(() => {
    if (!teamConfig?.decoration?.enabled) {
      return {
        component: null,
        props: {},
        hasDecoration: false
      };
    }

    const baseProps = {
      teamId,
      teamData,
      ...teamConfig.decoration.props
    };

    return {
      component: teamConfig.decoration.component,
      props: baseProps,
      hasDecoration: true
    };
  }, [teamConfig, teamId, teamData]);

  // 유니폼 컴포넌트 설정
  const uniformConfig = useMemo(() => {
    if (!teamConfig?.uniform?.enabled) {
      return {
        component: null,
        props: {},
        hasUniform: false
      };
    }

    const baseProps = {
      teamId,
      teamData,
      ...teamConfig.uniform.props
    };

    return {
      component: teamConfig.uniform.component,
      props: baseProps,
      hasUniform: true
    };
  }, [teamConfig, teamId, teamData]);

  // 커스텀 컴포넌트들 설정
  const customComponents = useMemo(() => {
    if (!teamConfig?.customComponents) {
      return {};
    }

    const result: { [key: string]: { component: any; props: any } } = {};

    Object.entries(teamConfig.customComponents).forEach(([key, config]) => {
      if (config.enabled) {
        result[key] = {
          component: config.component,
          props: {
            teamId,
            teamData,
            ...config.props
          }
        };
      }
    });

    return result;
  }, [teamConfig, teamId, teamData]);

  // 스타일 설정
  const styles = useMemo(() => {
    return teamConfig?.styles || {};
  }, [teamConfig]);

  // 결과 객체 구성
  const result: UseTeamCustomizationResult = useMemo(() => ({
    // 장식 컴포넌트
    DecorationComponent: decorationConfig.component,
    decorationProps: decorationConfig.props,
    hasDecoration: decorationConfig.hasDecoration,

    // 유니폼 컴포넌트
    UniformComponent: uniformConfig.component,
    uniformProps: uniformConfig.props,
    hasUniform: uniformConfig.hasUniform,

    // 커스텀 컴포넌트들
    customComponents,

    // 스타일
    styles,

    // 유틸리티
    isCustomized,
    teamConfig
  }), [
    decorationConfig,
    uniformConfig,
    customComponents,
    styles,
    isCustomized,
    teamConfig
  ]);

  return result;
}

/**
 * 팀 커스터마이징 상태 확인 훅
 *
 * 특정 팀이 커스터마이징되어 있는지 간단히 확인할 때 사용
 *
 * @param teamId - 팀 ID
 * @returns 커스터마이징 여부
 */
export function useHasTeamCustomization(teamId: string): boolean {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const unsubscribe = TeamCustomizationRegistry.addListener(() => {
      forceUpdate({});
    });

    return unsubscribe;
  }, []);

  return TeamCustomizationRegistry.hasCustomization(teamId);
}

/**
 * 특정 컴포넌트 타입이 활성화되어 있는지 확인하는 훅
 *
 * @param teamId - 팀 ID
 * @param componentType - 컴포넌트 타입 ('decoration' | 'uniform' | string)
 * @returns 컴포넌트 활성화 여부
 */
export function useHasActiveComponent(
  teamId: string,
  componentType: 'decoration' | 'uniform' | string
): boolean {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const unsubscribe = TeamCustomizationRegistry.addListener(() => {
      forceUpdate({});
    });

    return unsubscribe;
  }, []);

  switch (componentType) {
    case 'decoration':
      return TeamCustomizationRegistry.hasActiveDecoration(teamId);
    case 'uniform':
      return TeamCustomizationRegistry.hasActiveUniform(teamId);
    default:
      return TeamCustomizationRegistry.hasActiveCustomComponent(teamId, componentType);
  }
}

/**
 * 모든 등록된 팀 목록을 조회하는 훅 (개발/관리자용)
 *
 * @returns 등록된 팀 ID 배열
 */
export function useRegisteredTeams(): string[] {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const unsubscribe = TeamCustomizationRegistry.addListener(() => {
      forceUpdate({});
    });

    return unsubscribe;
  }, []);

  return TeamCustomizationRegistry.getAllTeamIds();
}
