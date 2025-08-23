import { ComponentType } from 'react';
import { ViewStyle } from 'react-native';
import { ThemedStyle } from '@/lib/theme/types';

/**
 * 팀 커스터마이징 컴포넌트 타입들
 */

// 기본 커스터마이징 컴포넌트 Props
export interface BaseCustomizationProps {
  teamId: string;
  teamData?: any;
  style?: ThemedStyle<ViewStyle>;
}

// SVG 장식 컴포넌트 Props
export interface TeamDecorationProps extends BaseCustomizationProps {
  width?: number;
  height?: number;
  color?: string;
  opacity?: number;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

// 유니폼 플레이스홀더 커스터마이징 Props
export interface TeamUniformProps extends BaseCustomizationProps {
  text?: string;
  number?: string | number;
  mainColor?: string;
  subColor?: string;
  outlineColor?: string;
  containerWidth?: number;
  containerHeight?: number;
}

// 팀 커스터마이징 설정
export interface TeamCustomizationConfig {
  teamId: string;
  teamName: string;

  // 장식 요소 설정
  decoration?: {
    component: ComponentType<TeamDecorationProps>;
    props?: Partial<TeamDecorationProps>;
    enabled: boolean;
  };

  // 유니폼 플레이스홀더 설정
  uniform?: {
    component: ComponentType<TeamUniformProps>;
    props?: Partial<TeamUniformProps>;
    enabled: boolean;
  };

  // 추가 커스텀 컴포넌트들
  customComponents?: {
    [key: string]: {
      component: ComponentType<any>;
      props?: any;
      enabled: boolean;
    };
  };

  // 팀별 스타일 오버라이드
  styles?: {
    postCard?: ThemedStyle<ViewStyle>;
    decoration?: ThemedStyle<ViewStyle>;
    uniform?: ThemedStyle<ViewStyle>;
  };
}

// 커스터마이징 레지스트리 타입
export interface TeamCustomizationRegistryType {
  [teamId: string]: TeamCustomizationConfig;
}

// 커스터마이징 훅 반환 타입
export interface UseTeamCustomizationResult {
  // 장식 컴포넌트 (SVG 등)
  DecorationComponent: ComponentType<TeamDecorationProps> | null;
  decorationProps: Partial<TeamDecorationProps>;
  hasDecoration: boolean;

  // 유니폼 컴포넌트
  UniformComponent: ComponentType<TeamUniformProps> | null;
  uniformProps: Partial<TeamUniformProps>;
  hasUniform: boolean;

  // 커스텀 컴포넌트들
  customComponents: {
    [key: string]: {
      component: ComponentType<any>;
      props: any;
    };
  };

  // 스타일
  styles: {
    postCard?: ThemedStyle<ViewStyle>;
    decoration?: ThemedStyle<ViewStyle>;
    uniform?: ThemedStyle<ViewStyle>;
  };

  // 유틸리티
  isCustomized: boolean;
  teamConfig: TeamCustomizationConfig | null;
}

// 팀 데이터 타입 (PostCard에서 전달받는 데이터)
export interface TeamData {
  id: string;
  name: string;
  mainColor?: string;
  subColor?: string;
  darkMainColor?: string;
  darkSubColor?: string;
  sport?: {
    id: string;
    name: string;
    icon?: string;
  };
}

// 포지션 타입
export type DecorationPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

// 커스터마이징 컴포넌트 등록 함수 타입
export type RegisterTeamCustomization = (config: TeamCustomizationConfig) => void;

// 커스터마이징 해제 함수 타입
export type UnregisterTeamCustomization = (teamId: string) => void;
