import React from 'react';
import { View, ViewStyle } from 'react-native';
import { isWeb } from '@/lib/platform';
import type { TeamDecorationProps } from '../../types';

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
let svgComponents: any = {};

try {
  if (!isWeb()) {
    const svgModule = require('react-native-svg');
    Svg = svgModule.Svg;
    // 자주 사용되는 SVG 컴포넌트들을 미리 로드
    svgComponents = {
      Path: svgModule.Path,
      Circle: svgModule.Circle,
      Rect: svgModule.Rect,
      Line: svgModule.Line,
      Polygon: svgModule.Polygon,
      Ellipse: svgModule.Ellipse,
    };
  }
} catch (error) {
  console.warn('BaseSVGDecoration: react-native-svg를 로드할 수 없습니다:', error);
}

export interface BaseSVGDecorationProps extends TeamDecorationProps {
  // SVG 렌더링 함수
  renderSVG?: (props: {
    width: number;
    height: number;
    color: string;
    svgComponents: typeof svgComponents;
  }) => React.ReactElement;

  // 웹 환경에서의 CSS 대체 렌더링 함수
  renderWebFallback?: (props: {
    width: number;
    height: number;
    color: string;
  }) => React.ReactElement;

  // 기본 색상
  defaultColor?: string;
}

/**
 * 공용 SVG 기반 장식 컴포넌트
 *
 * 팀별 SVG 장식을 쉽게 만들 수 있는 기본 컴포넌트입니다.
 * 웹/모바일 환경에 따른 자동 fallback을 제공하며,
 * 커스텀 SVG 렌더링 함수를 통해 확장 가능합니다.
 */
export const BaseSVGDecoration: React.FC<BaseSVGDecorationProps> = ({
  teamId,
  teamData,
  width = 32,
  height = 32,
  color,
  opacity = 0.6,
  style,
  renderSVG,
  renderWebFallback,
  defaultColor = '#34445F',
}) => {
  // 색상 결정 (우선순위: props.color > teamData.mainColor > defaultColor)
  const finalColor = color || teamData?.mainColor || defaultColor;
  const resolvedStyle = resolveStyle(style);

  // 웹 환경에서는 CSS로 구현
  if (isWeb()) {
    if (renderWebFallback) {
      return (
        <View style={[{ width, height, opacity }, resolvedStyle]}>
          {renderWebFallback({ width, height, color: finalColor })}
        </View>
      );
    }

    // 기본 웹 fallback (단순한 사각형)
    return (
      <View
        style={[
          {
            width,
            height,
            backgroundColor: finalColor,
            opacity,
            borderRadius: 4,
          },
          resolvedStyle,
        ]}
      />
    );
  }

  // 모바일 환경에서는 react-native-svg 사용
  if (!Svg || !renderSVG) {
    // SVG를 로드할 수 없거나 렌더링 함수가 없을 때 fallback
    return (
      <View
        style={[
          {
            width,
            height,
            backgroundColor: finalColor,
            opacity,
            borderRadius: 4,
          },
          resolvedStyle,
        ]}
      />
    );
  }

  return (
    <View style={[{ opacity }, resolvedStyle]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">
        {renderSVG({ width, height, color: finalColor, svgComponents })}
      </Svg>
    </View>
  );
};

/**
 * 일반적인 패턴의 SVG 장식을 위한 헬퍼 함수들
 */

// 세로 스트라이프 패턴
export const createVerticalStripes = (
  stripeCount: number = 3,
  strokeWidth?: number
) => (props: {
  width: number;
  height: number;
  color: string;
  svgComponents: any;
}) => {
  const { width, height, color, svgComponents } = props;
  const { Path } = svgComponents;
  const finalStrokeWidth = strokeWidth || Math.max(4, Math.floor(width / 8));

  const stripes = [];
  for (let i = 0; i < stripeCount; i++) {
    const x = (width / (stripeCount + 1)) * (i + 1);
    stripes.push(
      <Path
        key={i}
        d={`M${x} ${height}L${x} 0`}
        stroke={color}
        strokeWidth={finalStrokeWidth}
      />
    );
  }

  return <>{stripes}</>;
};

// 원형 패턴
export const createCirclePattern = (
  circleCount: number = 3,
  arrangement: 'vertical' | 'horizontal' | 'grid' = 'vertical'
) => (props: {
  width: number;
  height: number;
  color: string;
  svgComponents: any;
}) => {
  const { width, height, color, svgComponents } = props;
  const { Circle } = svgComponents;

  const circles = [];
  const baseRadius = Math.min(width, height) / (circleCount + 2);

  if (arrangement === 'vertical') {
    for (let i = 0; i < circleCount; i++) {
      const y = (height / (circleCount + 1)) * (i + 1);
      const radius = baseRadius * (1 - i * 0.1); // 점점 작아지는 원
      circles.push(
        <Circle
          key={i}
          cx={width / 2}
          cy={y}
          r={radius}
          fill={color}
        />
      );
    }
  } else if (arrangement === 'horizontal') {
    for (let i = 0; i < circleCount; i++) {
      const x = (width / (circleCount + 1)) * (i + 1);
      const radius = baseRadius * (1 - i * 0.1);
      circles.push(
        <Circle
          key={i}
          cx={x}
          cy={height / 2}
          r={radius}
          fill={color}
        />
      );
    }
  }

  return <>{circles}</>;
};

// 대각선 패턴
export const createDiagonalLines = (
  lineCount: number = 3,
  direction: 'left-to-right' | 'right-to-left' = 'left-to-right',
  strokeWidth?: number
) => (props: {
  width: number;
  height: number;
  color: string;
  svgComponents: any;
}) => {
  const { width, height, color, svgComponents } = props;
  const { Path } = svgComponents;
  const finalStrokeWidth = strokeWidth || 2;

  const lines = [];
  const spacing = Math.min(width, height) / lineCount;

  for (let i = 0; i < lineCount; i++) {
    const offset = i * spacing;
    let d: string;

    if (direction === 'left-to-right') {
      d = `M${offset} 0L${offset + width} ${height}`;
    } else {
      d = `M${width - offset} 0L${-offset} ${height}`;
    }

    lines.push(
      <Path
        key={i}
        d={d}
        stroke={color}
        strokeWidth={finalStrokeWidth}
      />
    );
  }

  return <>{lines}</>;
};
