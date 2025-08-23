/**
 * 팀 커스터마이징 공용 장식 컴포넌트
 *
 * SVG 기반 장식 컴포넌트들과 패턴 생성 헬퍼 함수들을 제공합니다.
 * 팀별 커스터마이징에서 공통으로 사용할 수 있는 장식 요소들입니다.
 */

export {
  BaseSVGDecoration,
  createVerticalStripes,
  createCirclePattern,
  createDiagonalLines
} from './BaseSVGDecoration';

export type { BaseSVGDecorationProps } from './BaseSVGDecoration';
