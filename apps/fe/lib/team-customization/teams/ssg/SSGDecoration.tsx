import React from 'react';
import { View, ViewStyle, DimensionValue, Platform } from 'react-native';
import { isWeb } from '@/lib/platform';
import type { TeamDecorationProps } from '../../types';

/**
 * SSGDecoration
 * SSG 랜더스 전용 커스텀 SVG 데코레이션 컴포넌트.
 *
 * 개선 사항 (본 수정):
 * 1. position="center" 지원 (웹/모바일 공통)
 * 2. 웹에서 중앙 정렬이 되지 않던 문제 해결
 *    - absolute + flex 중앙 정렬 (UniformNumber 컴포넌트와 유사 패턴)
 *    - center 모드일 때 부모 영역을 꽉 채우는 full overlay 컨테이너 위에서 정렬
 * 3. 기존 corner (top-left, top-right, bottom-left, bottom-right) 동작 유지
 * 4. responsive 모드에서 center 위치일 때 width = maxWidthPercent, aspectRatio 유지하며 shrink
 *
 * 접근 방식:
 * - center 위치만 예외적으로 전체 overlay View (absolute: 0) 를 사용하고 flex center
 * - corner 위치는 기존 로직(오프셋 지정) 유지
 * - 웹에서는 내부 <div> 및 <svg> 반응형 렌더링 유지
 * - 모바일에서는 react-native-svg (동일 API) 유지
 */

export interface SSGDecorationProps extends TeamDecorationProps {
  responsive?: boolean;                // 반응형 여부
  baseWidth?: number;                  // 디자인 기준 width
  baseHeight?: number;                 // 디자인 기준 height
  maintainAspectRatio?: boolean;       // aspectRatio 유지 여부
  maxWidthPercent?: number | string;   // responsive 모드 최대 너비 (예: '50%' 또는 60)
  overrideColors?: {                   // path 색상 오버라이드
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  // position: TeamDecorationProps 에 정의 (여기서는 'center' 도 허용한다는 주석만 명시)
  // 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
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
  // eslint-disable-next-line no-console
  console.warn('react-native-svg 로드 실패 (SSGDecoration):', e);
}

/**
 * position별 corner offset 스타일
 * center 는 별도 처리하므로 여기서 제외
 */
const getCornerOffset = (position?: SSGDecorationProps['position']): ViewStyle => {
  switch (position) {
    case 'top-left':
      return { top: 0, left: 0 };
    case 'top-right':
      return { top: 0, right: 0 };
    case 'bottom-right':
      return { bottom: 0, right: 0 };
    case 'bottom-left':
      return { bottom: 0, left: 0 };
    default:
      return {}; // center 또는 알 수 없는 값 -> center 로직에서 별도로 처리
  }
};

/**
 * SSG 전용 SVG path 정의 (기본 색)
 * overrideColors 로 개별 색상 재정의 가능
 */
const buildPaths = (overrideColors?: SSGDecorationProps['overrideColors']) => {
  const primary = overrideColors?.primary ?? '#CE142C';      // 빨강
  const secondary = overrideColors?.secondary ?? '#FDBB2E';   // 노랑
  const accent = overrideColors?.accent ?? '#00483A';         // 녹색 포인트
  return [
    { d: 'M32 3L65 0L35.5 117L303.5 93L316.5 86.5L331 55.5L337.5 84.5L368.5 93L335.5 106L318.5 142.5L314 110.5L0 165.5L40 12L32 3Z', fill: primary },
    { d: 'M29.5 129L305.5 97L318.5 91L329.5 68.5L334 89.5L354.5 93.5L332.5 104.5L320.5 127L317.5 106L305.5 103L37 139.5L29.5 129Z', fill: secondary },
    { d: 'M312.5 98.5L322 93L327 84L330 93L339 96L330 100.5L323.5 112L321.5 101.5L312.5 98.5Z', fill: accent },
  ];
};

/**
 * 퍼센트 문자열 변환 유틸
 */
const toPercentString = (value: number | string | undefined, fallback: string): string => {
  if (value === undefined) return fallback;
  return typeof value === 'number' ? `${value}%` : value;
};

/**
 * SSGDecoration 컴포넌트
 */
export const SSGDecoration: React.FC<SSGDecorationProps> = ({
  teamId,
  teamData,
  teamColors,
  width,                    // 비반응형 corner 모드에서 특정 크기 강제할 때 사용
  height,
  color,                    // 단일 primary override 용도
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
  // primary color 강제 시 override 병합
  const mergedOverride = color
    ? { primary: color, secondary: overrideColors?.secondary, accent: overrideColors?.accent }
    : overrideColors;

  const paths = buildPaths(mergedOverride);

  const isCenter = position === 'center';

  // style 해석 (ThemedStyle 지원)
  const resolvedStyle: ViewStyle =
    // Themed style 함수가 Theme 객체를 기대하므로 임시로 any 캐스팅하여 타입 오류 회피
    typeof style === 'function' ? (style({} as any) as ViewStyle) : ((style as ViewStyle) || {});

  /**
   * 웹 컨테이너 스타일 계산
   * center: 전체 overlay + flex center
   * corner: 기존 offset 방식
   */
  const buildWebContainerStyle = (): ViewStyle => {
    if (isCenter) {
      return {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        // RN Web 에서 flex 정렬
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity,
        pointerEvents: 'none', // 클릭 방지 (장식)
      };
    }
    // corner 모드
    return {
      position: 'absolute',
      ...getCornerOffset(position),
      opacity,
      pointerEvents: 'none',
    };
  };

  /**
   * 모바일 컨테이너 스타일 계산
   * center: absolute overlay + flex center (웹과 동등)
   * corner: 기존 relative 로 두고 부모 absolute (중첩 absolute로 width 0 문제 회피)
   */
  const buildMobileContainerStyle = (): ViewStyle => {
    if (isCenter) {
      return {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        opacity,
        pointerEvents: 'none',
      };
    }
    // corner
    return {
      position: 'relative',
      opacity,
      pointerEvents: 'none',
      width: (responsive
        ? toPercentString(maxWidthPercent, '100%')
        : (width ?? baseWidth)) as DimensionValue,
      ...(responsive
        ? { aspectRatio: baseWidth / baseHeight }
        : { height: (height ?? baseHeight) as DimensionValue }),
    };
  };

  /**
   * 내부 wrapper (웹) 스타일
   * center: width = maxWidthPercent 로 제한, aspectRatio 유지
   * corner: responsive 모드면 100% (부모 위치에 따라)
   */
  const buildWebInnerWrapperStyle = (): React.CSSProperties => {
    if (isCenter) {
      return {
        width: toPercentString(maxWidthPercent, '100%'),
        position: 'relative',
        display: 'block',
        aspectRatio: maintainAspectRatio ? `${baseWidth} / ${baseHeight}` : undefined,
        maxWidth: toPercentString(maxWidthPercent, '100%'),
      };
    }
    // corner
    if (responsive) {
      return {
        width: '100%',
        position: 'relative',
        display: 'block',
        aspectRatio: maintainAspectRatio ? `${baseWidth} / ${baseHeight}` : undefined,
        maxWidth: toPercentString(maxWidthPercent, '100%'),
      };
    }
    return {
      width: `${width ?? baseWidth}px`,
      height: `${height ?? baseHeight}px`,
      position: 'relative',
      display: 'block',
    };
  };

  /**
   * 실제 SVG 요소 (웹)
   */
  const renderWeb = () => {
    const containerStyle = buildWebContainerStyle();

    return (
      <View style={[containerStyle, resolvedStyle]}>
        <div
          style={buildWebInnerWrapperStyle()}
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
              pointerEvents: 'none',
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
  };

  /**
   * 모바일 렌더링 (react-native-svg)
   */
  const renderMobile = () => {
    const containerStyle = buildMobileContainerStyle();

    // react-native-svg 로드 실패 시 fallback (빈 View)
    if (!Svg || !Path) {
      return <View style={[containerStyle, resolvedStyle]} />;
    }

    // center 모드에서 responsive 강제로 가정 (width 제한)
    const svgWrapperStyle: ViewStyle = isCenter
      ? {
          width: (responsive
            ? (toPercentString(maxWidthPercent, '100%'))
            : (width ?? baseWidth)) as DimensionValue,
          aspectRatio: baseWidth / baseHeight,
        }
      : {};

    return (
      <View style={[containerStyle, resolvedStyle]}>
        <View style={svgWrapperStyle}>
          <Svg
            width="100%"
            height="100%"
            viewBox={DEFAULT_VIEW_BOX}
            fill="none"
            preserveAspectRatio={maintainAspectRatio ? 'xMidYMid meet' : 'none'}
          >
            {paths.map((p: any, idx: number) => (
              <Path key={`ssg-mobile-path-${idx}`} d={p.d} fill={p.fill} />
            ))}
          </Svg>
        </View>
      </View>
    );
  };

  // 플랫폼 분기
  return isWeb() ? renderWeb() : renderMobile();
};

export default SSGDecoration;

/**
 * 사용 예 (registry):
 * {
 *   component: SSGDecoration,
 *   props: {
 *     responsive: true,
 *     position: 'center',
 *     maxWidthPercent: '50%',
 *     overrideColors: { primary: '#CE142C' }
 *   },
 *   enabled: true
 * }
 *
 * 중앙 정렬 전략 요약:
 * - center: 부모 데코레이션 레이어 내 전체 overlay(View absolute 0) 후 flex center
 * - corner: 기존 offset 방식 그대로
 *
 * UniformNumber 와 일관된 중앙 정렬 패턴 (flex 기반)
 */

// commit: fix(fe): SSGDecoration 웹 중앙 정렬 및 center 위치 responsive 레이아웃 구현
