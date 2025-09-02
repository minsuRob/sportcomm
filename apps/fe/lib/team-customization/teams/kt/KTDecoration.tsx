import React from 'react';
import { View, ViewStyle, DimensionValue } from 'react-native';
import { isWeb } from '@/lib/platform';
import type { TeamDecorationProps } from '../../types';

/**
 * KTDecoration
 * KT 위즈 전용(또는 공용 배너형) 하단 SVG 데코레이션 컴포넌트
 *
 * 요구사항:
 * - SSGDecoration 처럼 position='center' 로 중앙 정렬 (가로 중앙/세로 하단 또는 완전 중앙 선택 가능)
 * - 여기서는 기본적으로 'center' 가 전체 카드 중앙에 위치하도록 구현 (absolute:0 + flex center)
 * - responsive 지원: 부모 컨테이너 폭 기준으로 maxWidthPercent 만큼 축소/확대
 * - aspectRatio 유지
 * - primary/secondary 색상 override 가능
 *
 * 기본 SVG 메타:
 * - baseWidth: 347
 * - baseHeight: 89
 * - viewBox: 0 0 347 89
 *
 * 설계 포인트:
 * - center 위치: absolute fill + flex center (UniformNumber, 개선된 SSGDecoration 패턴)
 * - pointerEvents: 'none' 로 사용자 조작 방해 방지
 * - 모바일/웹 공통 API (react-native-svg / <svg>)
 */

export interface KTDecorationProps extends TeamDecorationProps {
  responsive?: boolean;
  baseWidth?: number;
  baseHeight?: number;
  maintainAspectRatio?: boolean;
  maxWidthPercent?: number | string;
  overrideColors?: {
    primary?: string;   // 첫 번째 path (기본 #B55555)
    secondary?: string; // 두 번째 path (기본 #D9D9D9, opacity 0.7)
  };
  /**
   * position:
   * - 'center' 사용 권장 (요구사항)
   * - 다른 corner 값(top-left 등)은 fallback 형태로 최소한 처리
   */
}

const DEFAULT_BASE_WIDTH = 347;
const DEFAULT_BASE_HEIGHT = 89;
const DEFAULT_VIEW_BOX = '0 0 347 89';

// react-native-svg 조건부 로드
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
  console.warn('react-native-svg 로드 실패 (KTDecoration):', e);
}

/**
 * corner offset 헬퍼 (center 제외)
 */
const getCornerOffset = (position?: KTDecorationProps['position']): ViewStyle => {
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
      return {}; // center 또는 기타 -> center 로직에서 처리
  }
};

/**
 * 퍼센트 문자열 유틸
 */
const toPercentString = (value: number | string | undefined, fallback: string): string => {
  if (value === undefined) return fallback;
  return typeof value === 'number' ? `${value}%` : value;
};

/**
 * SVG path 생성
 */
const buildPaths = (overrideColors?: KTDecorationProps['overrideColors']) => {
  const primary = overrideColors?.primary ?? '#B55555';
  const secondary = overrideColors?.secondary ?? '#D9D9D9';
  return [
    { d: 'M0 59L21.5 51L35 30L36 52.5L49.5 60L27 68.5L11.5 88.5L12.5 66L0 59Z', fill: primary, opacity: 1 },
    { d: 'M60 55L202.5 22.5L346.5 0L332 11L321 22.5L192 37L60 55Z', fill: secondary, opacity: 1.0 },
  ];
};

/**
 * KTDecoration 컴포넌트
 */
export const KTDecoration: React.FC<KTDecorationProps> = ({
  teamId,
  teamData,
  teamColors,
  position = 'center',
  opacity = 0.9,
  style,
  responsive = true,
  baseWidth = DEFAULT_BASE_WIDTH,
  baseHeight = DEFAULT_BASE_HEIGHT,
  maintainAspectRatio = true,
  maxWidthPercent = '60%', // 기본 60% 정도로 설정 (중앙 배너 느낌)
  overrideColors,
  width,  // 비반응형 corner 모드 전용
  height, // 비반응형 corner 모드 전용
  color,  // 필요 시 primary 강제 (overrideColors.primary 대체)
}) => {
  // color prop이 들어오면 primary override 우선 적용
  const mergedOverride: KTDecorationProps['overrideColors'] = {
    primary: color ?? overrideColors?.primary,
    secondary: overrideColors?.secondary,
  };

  const paths = buildPaths(mergedOverride);
  const isCenter = position === 'center';

  // style 함수 지원 (Theme 객체 미전달이므로 any 캐스팅)
  const resolvedStyle: ViewStyle =
    typeof style === 'function' ? (style({} as any) as ViewStyle) : ((style as ViewStyle) || {});

  /**
   * 웹 컨테이너 스타일
   * center: absolute fill + flex center
   * corner: offset 적용
   */
  const buildWebContainerStyle = (): ViewStyle => {
    if (isCenter) {
      return {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        opacity,
      };
    }
    return {
      position: 'absolute',
      ...getCornerOffset(position),
      pointerEvents: 'none',
      opacity,
    };
  };

  /**
   * 모바일 컨테이너 스타일
   * center: absolute overlay + flex center
   * corner: relative + responsive/고정 크기
   */
  const buildMobileContainerStyle = (): ViewStyle => {
    if (isCenter) {
      return {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        opacity,
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
   * 웹 내부 wrapper 스타일
   * center: maxWidthPercent 기반 축소
   * corner: responsive 면 100%
   */
  const buildWebInnerWrapperStyle = (): React.CSSProperties => {
    if (isCenter) {
      return {
        width: toPercentString(maxWidthPercent, '100%'),
        maxWidth: toPercentString(maxWidthPercent, '100%'),
        aspectRatio: maintainAspectRatio ? `${baseWidth} / ${baseHeight}` : undefined,
        display: 'block',
        position: 'relative',
      };
    }
    if (responsive) {
      return {
        width: '100%',
        maxWidth: toPercentString(maxWidthPercent, '100%'),
        aspectRatio: maintainAspectRatio ? `${baseWidth} / ${baseHeight}` : undefined,
        display: 'block',
        position: 'relative',
      };
    }
    return {
        width: `${width ?? baseWidth}px`,
        height: `${height ?? baseHeight}px`,
        display: 'block',
        position: 'relative',
    };
  };

  /**
   * 웹 렌더링
   */
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
              <path key={`kt-path-${i}`} d={p.d} fill={p.fill} opacity={p.opacity} />
            ))}
          </svg>
        </div>
      </View>
    );
  };

  /**
   * 모바일 렌더링
   */
  const renderMobile = () => {
    const containerStyle = buildMobileContainerStyle();

    if (!Svg || !Path) {
      return <View style={[containerStyle, resolvedStyle]} />;
    }

    const svgWrapperStyle: ViewStyle = isCenter
      ? {
          width: (responsive
            ? toPercentString(maxWidthPercent, '100%')
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
            {paths.map((p, i) => (
              <Path key={`kt-mobile-path-${i}`} d={p.d} fill={p.fill} opacity={p.opacity} />
            ))}
          </Svg>
        </View>
      </View>
    );
  };

  return isWeb() ? renderWeb() : renderMobile();
};

export default KTDecoration;

/**
 * 사용 예 (registry 추가 예정):
 * {
 *   component: KTDecoration,
 *   props: {
 *     position: 'center',
 *     responsive: true,
 *     maxWidthPercent: '55%',
 *     overrideColors: { primary: '#B55555', secondary: '#D9D9D9' }
 *   },
 *   enabled: true
 * }
 *
 * 커스터마이징 포인트:
 * - maxWidthPercent 로 배너 폭 조절
 * - overrideColors 로 색상 대체
 * - position='center' 외 corner 값도 가능 (필요 시)
 *
 * 성능 고려:
 * - 단순한 path 2개 렌더 -> 오버헤드 미미
 * - pointerEvents 비활성화로 터치/클릭 영향 제거
 */

// commit: feat(fe): KTDecoration 컴포넌트 추가 (중앙 배치 반응형 SVG)
