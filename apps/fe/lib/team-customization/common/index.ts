/**
 * 팀 커스터마이징 공용 컴포넌트 모음
 *
 * 모든 팀에서 공통으로 사용할 수 있는 컴포넌트들을 제공합니다.
 * 팀별 커스터마이징이 없는 경우에도 기본 컴포넌트로 사용 가능합니다.
 */

// 유니폼 관련 컴포넌트들
export {
  UniformPlaceholder,
  ArchedText,
  UniformNumber
} from './uniform';

// 장식 컴포넌트들
export {
  BaseSVGDecoration,
  createVerticalStripes,
  createCirclePattern,
  createDiagonalLines
} from './decorations';

export type { BaseSVGDecorationProps } from './decorations';

// 향후 확장 가능한 공용 컴포넌트들
// export { DefaultBadge } from './badges';
// export { TeamLogo } from './logos';
