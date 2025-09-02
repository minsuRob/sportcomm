import React from 'react';
import { View, ViewStyle, DimensionValue } from 'react-native';
import { isWeb } from '@/lib/platform';
import type { TeamDecorationProps } from '../../types';

/**
 * LotteDecoration
 * 롯데 자이언츠 전용 (또는 유사 스타일) 커스텀 SVG 데코레이션 컴포넌트
 *
 * 요구사항:
 * - position: 'top-left' (사용자 요청: left-top) 고정 배치
 * - SSGDecoration과 유사한 반응형(aspectRatio 유지) 패턴
 * - 주어진 3개의 path (기본 녹색 톤 + 0.7 opacity) 렌더링
 * - overrideColors 를 통해 단일 color 또는 개별 path 색상 커스터마이징 지원
 * - 웹/모바일 동시 지원 (react-native-svg 조건부 로드)
 * - pointerEvents: 'none' 으로 상호작용 차단 (장식 목적)
 *
 * 기본 전략:
 * 1. responsive = true:
 *    - width: maxWidthPercent (%)
 *    - aspectRatio: baseWidth / baseHeight
 * 2. responsive = false:
 *    - width / height (혹은 props.width / props.height) 고정 값 사용
 * 3. style prop (ThemedStyle 함수 or 객체) 지원
 *
 * 추가 참고:
 * - center 정렬은 요구되지 않아 구현하지 않음
 * - 다른 corner 위치가 필요해지면 SSGDecoration 로직 재활용 가능
 */

export interface LotteDecorationProps extends TeamDecorationProps {
  responsive?: boolean;               // 반응형 여부
  baseWidth?: number;                 // 디자인 기준 width
  baseHeight?: number;                // 디자인 기준 height
  maintainAspectRatio?: boolean;      // 종횡비 유지 여부
  maxWidthPercent?: number | string;  // 반응형일 때 최대 폭 (기본 '55%')
  overrideColors?: {
    path1?: string;
    path2?: string;
    path3?: string;
    all?: string;                     // all 제공 시 세 path 동일 색상 (개별 path* 우선 순위 높음)
  };
}

const DEFAULT_BASE_WIDTH = 253;
const DEFAULT_BASE_HEIGHT = 142;
const DEFAULT_VIEW_BOX = '0 0 253 142';

// react-native-svg 조건부 로드 (웹 번들 안정성)
let Svg: any = null;
let Path: any = null;
try {
  if (!isWeb()) {
    const svgModule = require('react-native-svg');
    Svg = svgModule.Svg;
    Path = svgModule.Path;
  }
} catch (e) {
  // eslint-disable-next-line no-console
  console.warn('react-native-svg 로드 실패 (LotteDecoration):', e);
}

/**
 * path 데이터 구성
 * 단일 all 색상 -> path1/2/3 개별 overrideColors 우선
 */
const buildPaths = (overrideColors?: LotteDecorationProps['overrideColors']) => {
  const baseFill = '#349234';
  const p1 = overrideColors?.path1 || overrideColors?.all || baseFill;
  const p2 = overrideColors?.path2 || overrideColors?.all || baseFill;
  const p3 = overrideColors?.path3 || overrideColors?.all || baseFill;

  return [
    {
      d: 'M0.0917311 83.0001L71.5916 42.4998L76.5917 28.4998L90.0916 32.9998L147.092 1.49979L178.092 1.49979L114.592 36.4998C114.592 36.4998 106.994 39.1368 102.092 38.4998C97.1892 37.8628 90.0916 32.9998 90.0916 32.9998C90.0916 32.9998 88.5453 42.8946 86.5916 46.4998C84.638 50.105 79.9999 54.6728 79.9999 54.6728L0.0917966 101L0.0917311 83.0001Z',
      fill: p1,
    },
    {
      d: 'M0.091918 124.5L146.284 42.1268L151.284 28.1268L164.784 32.6268L221.784 1.1268L252.784 1.1268L189.284 36.1268C189.284 36.1268 181.686 38.7638 176.784 38.1268C171.881 37.4898 164.784 32.6268 164.784 32.6268C164.784 32.6268 163.237 42.5216 161.284 46.1268C159.33 49.732 154.692 54.2998 154.692 54.2998L0.0917965 142L0.091918 124.5Z',
      fill: p2,
    },
    {
      d: 'M0.111572 36.542C0.111572 36.542 63.9006 0.828183 73.4938 0.91312C83.0869 0.998056 90.0854 8.43183 90.0854 8.43183L0.111547 58.0001L0.111572 36.542Z',
      fill: p3,
    },
  ];
};

/**
 * 퍼센트 문자열 헬퍼
 */
const toPercentString = (val: number | string | undefined, fallback: string): string => {
  if (val === undefined) return fallback;
  return typeof val === 'number' ? `${val}%` : val;
};

/**
 * LotteDecoration 컴포넌트
 */
export const LotteDecoration: React.FC<LotteDecorationProps> = ({
  teamId,
  teamData,
  teamColors,
  position = 'bottom-left',
  responsive = true,
  baseWidth = DEFAULT_BASE_WIDTH,
  baseHeight = DEFAULT_BASE_HEIGHT,
  maintainAspectRatio = true,
  maxWidthPercent = '55%',
  overrideColors,
  // 비반응형 모드 width/height (필요 시)
  width,
  height,
  opacity = 0.9,
  color,       // 단일 primary 대체 (all 로 반영)
  style,
}) => {
  // 모든 path의 색상을 svgDecorationColor로 통일합니다.
  const svgDecorationColor = teamColors?.decorationBorder || color || '#24242E';

  // overrideColors의 모든 path 색상을 svgDecorationColor로 지정
  const mergedOverride: LotteDecorationProps['overrideColors'] = {
    all: svgDecorationColor,
    path1: svgDecorationColor,
    path2: svgDecorationColor,
    path3: svgDecorationColor,
  };

  const paths = buildPaths(mergedOverride);

  // style (ThemedStyle 지원)
  const resolvedStyle: ViewStyle =
    typeof style === 'function' ? (style({} as any) as ViewStyle) : ((style as ViewStyle) || {});

  /**
   * 웹 컨테이너:
   * - top-left 고정 absolute
   * - responsive 시 내부 wrapper 에서 aspectRatio 유지
   */
  const buildWebContainerStyle = (): ViewStyle => ({
    position: 'absolute',
    top: 0,
    left: 0,
    opacity,
    pointerEvents: 'none',
  });

  const buildWebInnerWrapperStyle = (): React.CSSProperties => {
    if (responsive) {
      return {
        width: toPercentString(maxWidthPercent, '55%'),
        maxWidth: toPercentString(maxWidthPercent, '55%'),
        display: 'block',
        position: 'relative',
        aspectRatio: maintainAspectRatio ? `${baseWidth} / ${baseHeight}` : undefined,
      };
    }
    return {
      width: `${width ?? baseWidth}px`,
      height: `${height ?? baseHeight}px`,
      display: 'block',
      position: 'relative',
    };
  };

  const renderWeb = () => {
    const containerStyle = buildWebContainerStyle();
    return (
      <View style={[containerStyle, resolvedStyle]}>
        <div style={buildWebInnerWrapperStyle()}>
          <svg
            width="100%"
            height="100%"
            viewBox={DEFAULT_VIEW_BOX}
            fill="none"
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              maxWidth: '100%',
              objectFit: maintainAspectRatio ? 'contain' : 'fill',
              pointerEvents: 'none',
            }}
            preserveAspectRatio={maintainAspectRatio ? 'xMidYMid meet' : 'none'}
          >
            {paths.map((p, i) => (
              <path key={`lotte-path-${i}`} d={p.d} fill={p.fill} opacity={p.opacity} />
            ))}
          </svg>
        </div>
      </View>
    );
  };

  /**
   * 모바일 컨테이너:
   * - parent(TeamDecorationRenderer)가 absolute를 가질 수 있으므로 relative 로 두어 레이아웃 안정
   * - position top-left 구현은 상위에서 absolute 관리 (여기서는 style 병합을 통한 위치 조정 가능)
   */
  const buildMobileContainerStyle = (): ViewStyle => {
    if (responsive) {
      return {
        position: 'relative',
        opacity,
        pointerEvents: 'none',
        width: toPercentString(maxWidthPercent, '55%') as DimensionValue,
        aspectRatio: baseWidth / baseHeight,
      };
    }
    return {
      position: 'relative',
      opacity,
      pointerEvents: 'none',
      width: (width ?? baseWidth) as DimensionValue,
      height: (height ?? baseHeight) as DimensionValue,
    };
  };

  const renderMobile = () => {
    const containerStyle = buildMobileContainerStyle();

    if (!Svg || !Path) {
      // svg 모듈 로드 실패 시 빈 컨테이너
      return <View style={[containerStyle, resolvedStyle]} />;
    }

    return (
      <View style={[containerStyle, resolvedStyle]}>
        <Svg
          width="100%"
            height="100%"
            viewBox={DEFAULT_VIEW_BOX}
            fill="none"
            preserveAspectRatio={maintainAspectRatio ? 'xMidYMid meet' : 'none'}
        >
          {paths.map((p, i) => (
            <Path key={`lotte-mobile-path-${i}`} d={p.d} fill={p.fill} opacity={p.opacity} />
          ))}
        </Svg>
      </View>
    );
  };

  return isWeb() ? renderWeb() : renderMobile();
};

export default LotteDecoration;

/**
 * 사용 예 (registry 추가 시):
 * {
 *   component: LotteDecoration,
 *   props: {
 *     responsive: true,
 *     position: 'top-left',
 *     maxWidthPercent: '50%',
 *     overrideColors: { all: '#2E7D32' }
 *   },
 *   enabled: true
 * }
 *
 * 확장 아이디어:
 * - position 변형 지원 (top-right 등) 필요 시 switch 분기 추가
 * - teamColors 기반 동적 색상 자동화
 */
// commit: feat(fe): LotteDecoration 컴포넌트 추가 (top-left 반응형 SVG 데코)
