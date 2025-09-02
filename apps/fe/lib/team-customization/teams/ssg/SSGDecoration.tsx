import React from 'react';
import { View, ViewStyle, DimensionValue } from 'react-native';
import { isWeb } from '@/lib/platform';
import type { TeamDecorationProps } from '../../types';

/**
 * SSGDecoration
 * SSG 랜더스 전용 커스텀 SVG 데코레이션 컴포넌트.
 * KIADecoration 패턴을 참고하여 반응형(aspectRatio 유지) SVG를 렌더링합니다.
 *
 * 특징:
 * - responsive=true 일 때 부모 컨테이너 가로폭을 100% 채우고 세로는 비율 유지
 * - 제공된 3개의 path를 그대로 렌더 (primary / secondary / accent 색상 오버라이드 가능)
 * - 웹/모바일(react-native-svg) 모두 지원
 * - position(bottom-left, bottom-right 등) 처리
 */
export interface SSGDecorationProps extends TeamDecorationProps {
  responsive?: boolean;                // 반응형 여부
  baseWidth?: number;                  // 디자인 기준 width
  baseHeight?: number;                 // 디자인 기준 height
  maintainAspectRatio?: boolean;       // aspectRatio 유지 여부
  maxWidthPercent?: number | string;   // responsive 모드 최대 너비
  overrideColors?: {                   // path 색상 오버라이드
    primary?: string;
    secondary?: string;
    accent?: string;
  };
}

// 기본 SVG 메타
const DEFAULT_BASE_WIDTH = 369;
const DEFAULT_BASE_HEIGHT = 166;
const DEFAULT_VIEW_BOX = '0 0 369 166';

// react-native-svg 조건부 로드 (웹에서 번들 안전성 확보)
let Svg: any = null;
let Path: any = null;
try {
  if (!isWeb()) {
    const svgModule = require('react-native-svg');
    Svg = svgModule.Svg;
    Path = svgModule.Path;
  }
} catch (e) {
  // 로드 실패 시 경고 (개발 환경 디버깅 용)
  // eslint-disable-next-line no-console
  console.warn('react-native-svg 로드 실패 (SSGDecoration):', e);
}

/**
 * position별 추가 스타일 (컨테이너 offset)
 */
const getPositionOffset = (position?: SSGDecorationProps['position']): ViewStyle => {
  switch (position) {
    case 'top-left':
      return { top: 0, left: 0 };
    case 'top-right':
      return { top: 0, right: 0 };
    case 'bottom-right':
      return { bottom: 0, right: 0 };
    case 'bottom-left':
    default:
      return { bottom: 0, left: 0 };
  }
};

/**
 * SSG 전용 SVG path 정의 (기본 색)
 * overrideColors로 개별 색상 재정의 가능
 */
const buildPaths = (overrideColors?: SSGDecorationProps['overrideColors']) => {
  const primary = overrideColors?.primary ?? '#CE142C';   // 빨강
  const secondary = overrideColors?.secondary ?? '#FDBB2E'; // 노랑
  const accent = overrideColors?.accent ?? '#00483A';     // 녹색 포인트
  return [
    { d: 'M32 3L65 0L35.5 117L303.5 93L316.5 86.5L331 55.5L337.5 84.5L368.5 93L335.5 106L318.5 142.5L314 110.5L0 165.5L40 12L32 3Z', fill: primary },
    { d: 'M29.5 129L305.5 97L318.5 91L329.5 68.5L334 89.5L354.5 93.5L332.5 104.5L320.5 127L317.5 106L305.5 103L37 139.5L29.5 129Z', fill: secondary },
    { d: 'M312.5 98.5L322 93L327 84L330 93L339 96L330 100.5L323.5 112L321.5 101.5L312.5 98.5Z', fill: accent },
  ];
};

/**
 * SSGDecoration 컴포넌트 구현
 */
export const SSGDecoration: React.FC<SSGDecorationProps> = ({
  teamId,
  teamData,
  teamColors,
  width, // 비반응형 모드에서만 사용
  height, // 비반응형 모드에서만 사용
  color, // 사용자가 단일 컬러를 강제로 지정하고 싶을 때 (현재 paths는 개별 색이라 전체 tint 용도로만 활용 가능)
  opacity = 0.9,
  position = 'bottom-left',
  style,
  responsive = true,
  baseWidth = DEFAULT_BASE_WIDTH,
  baseHeight = DEFAULT_BASE_HEIGHT,
  maintainAspectRatio = true,
  maxWidthPercent = '100%',
  overrideColors,
}) => {
  // color prop이 들어온 경우: primary만 우선 덮어쓰는 전략(요구사항에 따라 커스터마이즈 가능)
  const mergedOverride = color
    ? { primary: color, secondary: overrideColors?.secondary, accent: overrideColors?.accent }
    : overrideColors;

  const paths = buildPaths(mergedOverride);

  // position offset (웹 전용으로 사용, 모바일은 부모 컨테이너 사용)
  const positionOffset = getPositionOffset(position);

  // 스타일 해석 (ThemedStyle 또는 객체)
  const resolvedStyle: ViewStyle =
    typeof style === 'function' ? (style({}) as ViewStyle) : ((style as ViewStyle) || {});

  // 공통 컨테이너 스타일
  // 모바일에서는 부모(TeamDecorationRenderer)도 absolute이므로 중첩 absolute 시 width 계산이 0이 되는 문제 발생.
  // 따라서 모바일은 relative로 두고 부모가 위치를 담당하도록 함.
  const baseContainer: ViewStyle = isWeb()
    ? {
        position: 'absolute',
        ...positionOffset,
        opacity,
      }
    : {
        position: 'relative',
        opacity,
        width: (responsive
          ? (typeof maxWidthPercent === 'string'
              ? maxWidthPercent
              : `${maxWidthPercent}%`)
          : (width ?? baseWidth)) as DimensionValue,
        // aspectRatio를 통해 높이 결정 (responsive일 때)
        ...(responsive
          ? { aspectRatio: baseWidth / baseHeight }
          : { height: (height ?? baseHeight) as DimensionValue }),
      };

  if (isWeb()) {
    // 웹: 반응형 처리 (부모 카드 영역에 따라 크기 조정)
    const webInnerWrapper: ViewStyle = responsive
      ? {
          width: '100%',
          height: 'auto',
          minWidth: 0,
        }
      : {
          width: (width ?? baseWidth) as DimensionValue,
          height: (height ?? baseHeight) as DimensionValue,
        };

    return (
      <View
        style={[
          baseContainer,
          // bottom-right 시 오른쪽 정렬을 위해 width:auto
          position === 'bottom-right' ? { width: 'auto', left: undefined } : {},
          resolvedStyle,
        ]}
      >
        <div
          style={{
            ...webInnerWrapper,
            display: 'block',
            position: 'relative',
            aspectRatio: maintainAspectRatio ? `${baseWidth} / ${baseHeight}` : undefined,
            maxWidth: typeof maxWidthPercent === 'string' ? maxWidthPercent : `${maxWidthPercent}%`,
          }}
        >
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
            }}
            preserveAspectRatio={maintainAspectRatio ? 'xMidYMid meet' : 'none'}
          >
            {paths.map((p, idx) => (
              <path key={`ssg-path-${idx}`} d={p.d} fill={p.fill} />
            ))}
          </svg>
        </div>
      </View>
    );
  }

  // 모바일 (react-native-svg)
  // react-native-svg 로드 실패 시 placeholder
  if (!Svg || !Path) {
    return <View style={[baseContainer, resolvedStyle]} />;
  }

  return (
    <View style={[baseContainer, resolvedStyle]}>
      <Svg
        width="100%"
        height="100%"
        viewBox={DEFAULT_VIEW_BOX}
        fill="none"
        preserveAspectRatio={maintainAspectRatio ? 'xMidYMid meet' : 'none'}
      >
        {paths.map((p, idx) => (
          <Path key={`ssg-mobile-path-${idx}`} d={p.d} fill={p.fill} />
        ))}
      </Svg>
    </View>
  );
};

export default SSGDecoration;

/**
 * 사용 예 (registry):
 * {
 *   component: SSGDecoration,
 *   props: {
 *     responsive: true,
 *     position: 'bottom-left',
 *     overrideColors: { primary: '#CE142C' }
 *   },
 *   enabled: true
 * }
 *
 * 커밋 메시지 예시: feat(fe): SSGDecoration 컴포넌트 추가 (반응형 SVG 데코)
 */
