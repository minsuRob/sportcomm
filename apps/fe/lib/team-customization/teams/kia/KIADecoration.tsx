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

// 기본 KIA V자형 SVG 경로 데이터
const defaultKIASvgPaths: SVGPathData[] = [
  { d: 'M1.0896 0.499512L258.809 106.5V241.5H1.0896V0.499512Z', fill: '#F00316' },
  { d: 'M0.206759 0.999781L258.833 72.4019L258.793 108.092L0.206759 0.999781Z', fill: '#211F24' },
  { d: 'M513.91 0.499512L256.191 106.5V241.5H513.91V0.499512Z', fill: '#F00316' },
  { d: 'M514.793 -0.000218729L256.167 71.4019L256.207 107.092L514.793 -0.000218729Z', fill: '#211F24' },
];

/**
 * KIA 타이거즈 전용 V자형 데코레이션 컴포넌트
 */
export const KIADecoration: React.FC<KIADecorationProps> = ({
  teamId,
  teamData,
  // width / height: 비반응형일 때 사용할 크기 (기존 호환)
  width = 535,
  height = 242,
  color,
  opacity = 0.5,
  position,
  style,
  svgPaths = defaultKIASvgPaths,
  svgViewBox = '0 0 515 242',
  svgWidth,
  svgHeight,
  baseWidth = 515,       // 디자인 기준 해상도
  baseHeight = 242,      // 디자인 기준 해상도
  responsive = true,     // 기본적으로 반응형 활성화
  maintainAspectRatio = true,
  maxWidthPercent = '100%',
}) => {
  // 팀 색상 (덮어쓰기 로직 확장 가능)
  const decorationColor =
    color ||
    teamData?.decorationBorder ||
    teamData?.mainColor ||
    '#EA0029'; // KIA 기본 빨간색

  const resolvedStyle = resolveStyle(style);

  // position에 따른 추가 스타일 적용
  const positionStyle = position === 'bottom-right' ? {
    marginRight: 5,
  } : {
    marginLeft: 5,
  };

  // SVG 경로 색상 처리 (필요 시 팀 색상으로 커스터마이징)
  const processedSvgPaths = svgPaths.map((p) => ({
    ...p,
    // 필요 시 색상 커스터마이징:
    // fill: p.fill === '#F00316' ? decorationColor : p.fill,
  }));

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
