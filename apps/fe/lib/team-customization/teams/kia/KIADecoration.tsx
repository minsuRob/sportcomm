import React from 'react';
import { View, ViewStyle, DimensionValue } from 'react-native';
import { isWeb } from '@/lib/platform';
import type { TeamDecorationProps } from '../../types';

// SVG 경로 데이터 타입 정의
interface SVGPathData {
  d: string;
  fill: string;
  opacity?: number;
}

// ThemedStyle을 ViewStyle로 변환하는 헬퍼 함수
const resolveStyle = (style: any): ViewStyle => {
  if (typeof style === 'function') {
    // 임시로 빈 테마 객체 전달
    return style({});
  }
  return (style as ViewStyle) || {};
};

// react-native-svg는 조건부로 import (웹에서 문제 발생 방지)
let Svg: any = null;
let Path: any = null;
try {
  if (!isWeb()) {
    const svgModule = require('react-native-svg');
    Svg = svgModule.Svg;
    Path = svgModule.Path;
  }
} catch (error) {
  console.warn('react-native-svg를 로드할 수 없습니다:', error);
}

/**
 * KIADecoration
 * - 부모 컨테이너의 가로 폭에 맞춰 자동으로 리사이징되는 반응형 SVG 장식 컴포넌트
 * - 기본 디자인 해상도(baseWidth x baseHeight)를 기준으로 aspectRatio를 고정하고,
 *   외부 부모 너비 변화에 따라 비율 유지한 채로 축소/확대
 * - width/height를 직접 지정하고 싶다면 responsive=false 로 설정
 *
 * 반응형 전략:
 * 1. responsive=true (기본값)
 *    - 바깥 컨테이너: width: '100%', aspectRatio = baseWidth / baseHeight
 *    - 내부 SVG: width/height 100% 로 채움 + viewBox = "0 0 baseWidth baseHeight"
 *    - 결과: 부모 컨테이너 너비가 변해도 SVG가 잘리지 않고 전체가 비례적으로 축소/확대
 *
 * 2. responsive=false
 *    - 기존 방식: 고정 width, height 사용
 *    - 호환성 보장용
 *
 * 3. 색상 커스터마이징
 *    - SVG 경로별로 색상 변경 가능
 *    - 팀 색상에 따른 동적 색상 적용
 */

// KIADecoration 전용 props 인터페이스
interface KIADecorationProps extends TeamDecorationProps {
  svgPaths?: SVGPathData[];
  svgViewBox?: string;
  svgWidth?: number;          // (비반응형 모드 전용) 실제 렌더링 width
  svgHeight?: number;         // (비반응형 모드 전용) 실제 렌더링 height
  baseWidth?: number;         // 디자인 기준 너비 (반응형 계산 용)
  baseHeight?: number;        // 디자인 기준 높이 (반응형 계산 용)
  responsive?: boolean;       // true: 부모 폭 100% + aspectRatio 유지
  maintainAspectRatio?: boolean; // false 면 stretch
  maxWidthPercent?: number | string; // 반응형일 때 최대 폭 (기본 '100%')
}

// 기본 KIA V자형 SVG 경로 데이터 (동적 색상 적용을 위해 fill을 함수로 변경)
const createKIASvgPaths = (svgDecorationColor: string): SVGPathData[] => [
  { d: 'M1 0L251 103.361V235H1V0Z', fill: '#F00316' },
  { d: 'M0.705518 0.999784L251.333 72.4019L251.294 108.092L0.705518 0.999784Z', fill: svgDecorationColor },
  { d: 'M500 0L250 103.361V235H500V0Z', fill: '#F00316' },
  { d: 'M500.294 -0.000215532L249.667 71.4019L249.706 107.092L500.294 -0.000215532Z', fill: svgDecorationColor },
];

/**
 * KIA 타이거즈 전용 V자형 데코레이션 컴포넌트
 */
export const KIADecoration: React.FC<KIADecorationProps> = ({
  teamId,
  teamData,
  teamColors,
  // width / height: 비반응형일 때 사용할 크기 (기존 호환)
  width = 501,
  height = 235,
  color,
  opacity = 0.9,
  position,
  style,
  svgPaths,
  svgViewBox = '0 0 501 235',
  svgWidth,
  svgHeight,
  baseWidth = 501,       // 디자인 기준 해상도
  baseHeight = 235,      // 디자인 기준 해상도
  responsive = true,     // 기본적으로 반응형 활성화
  maintainAspectRatio = true,
  maxWidthPercent = '100%',
}) => {
  // SVG 데코레이션 색상 (CommonStripes와 동일한 방식)
  const svgDecorationColor = teamColors?.decorationBorder|| color  || teamData?.mainColor || '#24242E';
  
  // SVG 경로 데이터 생성 (동적 색상 적용)
  const dynamicSvgPaths = svgPaths || createKIASvgPaths(svgDecorationColor);
  
  const resolvedStyle = resolveStyle(style);

  // position에 따른 추가 스타일 적용
  const positionStyle = position === 'bottom-right' ? {
    marginRight: 0,
  } : {
    marginLeft: 0,
  };

  // SVG 경로 색상 처리 (동적 색상이 이미 적용된 경로 사용)
  const processedSvgPaths = dynamicSvgPaths;

  // 웹 환경에서 SVG 렌더링 (뷰포트 기준 크기 계산)
  if (isWeb()) {
    const webContainerStyle: ViewStyle = responsive
      ? {
          width: '100%' as DimensionValue,
          height: 'auto' as DimensionValue,
          opacity,
          position: 'relative',
          minWidth: 0,
        }
      : {
          width: (svgWidth || width) as DimensionValue,
          height: (svgHeight || height) as DimensionValue,
          opacity,
          position: 'relative',
        };

    return (
      <View
        style={[
          {
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            height: 'auto',
            opacity,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            alignItems: 'flex-start',
          },
          resolvedStyle,
        ]}
      >
        <svg
          width="100%"
          height="auto"
          viewBox={svgViewBox}
          fill="none"
          style={{
            display: 'block',
            width: '100%',
            height: 'auto',
            maxWidth: '100%',
            aspectRatio: `${baseWidth} / ${baseHeight}`,
          }}
          preserveAspectRatio={maintainAspectRatio ? "xMidYMid meet" : "none"}
        >
          {processedSvgPaths.map((pathData, index) => (
            <path
              key={`kia-path-${index}`}
              d={pathData.d}
              fill={pathData.fill}
              opacity={pathData.opacity || 1}
            />
          ))}
        </svg>
      </View>
    );
  }

  // 모바일용 반응형 모드일 때의 컨테이너 스타일
  const containerStyle: ViewStyle = responsive
    ? {
        width: (typeof maxWidthPercent === 'string' ? maxWidthPercent : `${maxWidthPercent}%`) as DimensionValue,
        aspectRatio: baseWidth / baseHeight,
        opacity,
        position: 'relative',
        minWidth: 0,
      }
    : {
        width: (svgWidth || width) as DimensionValue,
        height: (svgHeight || height) as DimensionValue,
        opacity,
        position: 'relative',
      };

  // SVG 크기 결정 (모바일용)
  const finalSvgWidth: DimensionValue = responsive ? '100%' : (svgWidth || width);
  const finalSvgHeight: DimensionValue = responsive ? '100%' : (svgHeight || height);

  // 모바일 환경에서 react-native-svg 사용
  if (!Svg || !Path) {
    // SVG 라이브러리가 없을 때 fallback 뷰
    return (
      <View
        style={[
          containerStyle,
          positionStyle,
          resolvedStyle,
          { backgroundColor: 'transparent' }
        ]}
      />
    );
  }

  return (
    <View style={[containerStyle, positionStyle, resolvedStyle]}>
      <Svg
        width={finalSvgWidth}
        height={finalSvgHeight}
        viewBox={svgViewBox}
        fill="none"
        preserveAspectRatio={maintainAspectRatio ? "xMidYMid meet" : "none"}
      >
        {processedSvgPaths.map((pathData, index) => (
          <Path
            key={`kia-mobile-path-${index}`}
            d={pathData.d}
            fill={pathData.fill}
            opacity={pathData.opacity || 1}
          />
        ))}
      </Svg>
    </View>
  );
};

// 기존 KIATigerStripes 호환성을 위한 alias (deprecated)
export const KIATigerStripes = KIADecoration;

// 커밋 메시지: feat(kia): KIADecoration 반응형 V자형 SVG 데코레이션 컴포넌트 구현
