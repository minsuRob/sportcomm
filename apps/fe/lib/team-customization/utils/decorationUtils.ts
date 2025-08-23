import type { TeamCustomizationConfig, DecorationItem } from '../types';

/**
 * 팀 커스터마이징 설정에서 decoration 배열을 추출하는 유틸리티 함수
 *
 * 단일 decoration과 다중 decoration을 모두 지원하며,
 * 기존 코드와의 호환성을 유지합니다.
 */
export function getDecorations(config: TeamCustomizationConfig | null): DecorationItem[] {
  if (!config?.decoration) {
    return [];
  }

  // 배열인 경우 (다중 decoration)
  if (Array.isArray(config.decoration)) {
    return config.decoration.filter(item => item.enabled);
  }

  // 단일 객체인 경우 (기존 방식 호환)
  if (config.decoration.enabled) {
    return [config.decoration];
  }

  return [];
}

/**
 * decoration이 활성화되어 있는지 확인하는 함수
 */
export function hasActiveDecorations(config: TeamCustomizationConfig | null): boolean {
  const decorations = getDecorations(config);
  return decorations.length > 0;
}

/**
 * 특정 position의 decoration이 있는지 확인하는 함수
 */
export function hasDecorationAtPosition(
  config: TeamCustomizationConfig | null,
  position: string
): boolean {
  const decorations = getDecorations(config);
  return decorations.some(decoration =>
    decoration.props?.position === position
  );
}

/**
 * position별로 decoration을 그룹화하는 함수
 */
export function groupDecorationsByPosition(
  config: TeamCustomizationConfig | null
): Record<string, DecorationItem[]> {
  const decorations = getDecorations(config);
  const grouped: Record<string, DecorationItem[]> = {};

  decorations.forEach(decoration => {
    const position = decoration.props?.position || 'bottom-left';
    if (!grouped[position]) {
      grouped[position] = [];
    }
    grouped[position].push(decoration);
  });

  return grouped;
}

/**
 * 팀별 decoration 개수를 반환하는 함수 (디버깅/모니터링용)
 */
export function getDecorationCount(config: TeamCustomizationConfig | null): number {
  return getDecorations(config).length;
}

/**
 * decoration의 기본 props를 병합하는 함수
 */
export function mergeDecorationProps(
  baseProps: any,
  decorationProps?: any
): any {
  return {
    width: 24,
    height: 120,
    opacity: 0.6,
    position: 'bottom-left',
    ...baseProps,
    ...decorationProps,
  };
}
