/**
 * 팀 커스터마이징 시스템 메인 엔트리 포인트
 *
 * 이 파일은 팀별 커스터마이징 시스템의 모든 기능을 중앙에서 관리하고 export합니다.
 * 다른 컴포넌트에서는 이 파일을 통해 팀 커스터마이징 기능을 사용할 수 있습니다.
 */

// 타입 정의
export type {
  BaseCustomizationProps,
  TeamDecorationProps,
  TeamUniformProps,
  TeamCustomizationConfig,
  TeamCustomizationRegistryType,
  UseTeamCustomizationResult,
  TeamData,
  DecorationPosition,
  RegisterTeamCustomization,
  UnregisterTeamCustomization
} from './types';

// 레지스트리 시스템
export {
  TeamCustomizationRegistry,
  registerTeamCustomization,
  unregisterTeamCustomization,
  getTeamCustomization,
  hasTeamCustomization
} from './registry';

// 공용 컴포넌트들 (팀 커스터마이징이 없는 경우에도 사용 가능)
export {
  UniformPlaceholder,
  ArchedText,
  UniformNumber,
  BaseSVGDecoration,
  createVerticalStripes,
  createCirclePattern,
  createDiagonalLines
} from './common';

export type { BaseSVGDecorationProps } from './common';

// 훅들
export {
  useTeamCustomization,
  useHasTeamCustomization,
  useHasActiveComponent,
  useRegisteredTeams
} from './useTeamCustomization';

// 팀별 컴포넌트들 (개별 사용을 위한 export)
export { DoosanStripes } from './teams/doosan/DoosanStripes';
export { DoosanUniform } from './teams/doosan/DoosanUniform';
export { LGStripes } from './teams/lg/LGStripes';
export { SamsungStripes } from './teams/samsung/SamsungStripes';

// 커스터마이징 시스템 컴포넌트들
export { TeamDecorationRenderer } from './components';
export type { TeamDecorationRendererProps } from './components';

// 유틸리티 함수들
export {
  getDecorations,
  hasActiveDecorations,
  hasDecorationAtPosition,
  groupDecorationsByPosition,
  getDecorationCount,
  mergeDecorationProps
} from './utils/decorationUtils';

// 편의 함수: 모든 팀 커스터마이징 설정을 자동으로 등록
export function initializeTeamCustomizations(): void {
  // registry.ts에서 자동으로 초기화되므로 별도 작업 불필요
  // 모든 팀 설정은 registry.ts의 initializeDefaultCustomizations()에서 관리됨


}

// 기본 사용법 예시 (JSDoc으로 문서화)
/**
 * @example
 * ```tsx
 * import { useTeamCustomization, initializeTeamCustomizations } from '@/lib/team-customization';
 *
 * // 앱 시작 시 초기화
 * initializeTeamCustomizations();
 *
 * // 컴포넌트에서 사용
 * function MyComponent({ teamId, teamData }) {
 *   const {
 *     DecorationComponent,
 *     decorationProps,
 *     hasDecoration,
 *     UniformComponent,
 *     uniformProps,
 *     hasUniform
 *   } = useTeamCustomization(teamId, teamData);
 *
 *   return (
 *     <View>
 *       {hasDecoration && DecorationComponent && (
 *         <DecorationComponent {...decorationProps} />
 *       )}
 *       {hasUniform && UniformComponent && (
 *         <UniformComponent {...uniformProps} />
 *       )}
 *     </View>
 *   );
 * }
 * ```
 */

// 팀 ID 상수들 (타입 안전성을 위해)
export const TEAM_IDS = {
  DOOSAN: 'doosan',
  SAMSUNG: 'samsung',
  // 새로운 팀 추가 시 여기에 추가
} as const;

export type TeamId = typeof TEAM_IDS[keyof typeof TEAM_IDS];
