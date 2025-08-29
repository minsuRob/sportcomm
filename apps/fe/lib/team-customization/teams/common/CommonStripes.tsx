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
let Rect: any = null;
try {
  if (!isWeb()) {
    const svgModule = require('react-native-svg');
    Svg = svgModule.Svg;
    Rect = svgModule.Rect;
  }
} catch (error) {
  console.warn('react-native-svg를 로드할 수 없습니다:', error);
}

/**
 * 공통 스트라이프 컴포넌트
 *
 * 팀별로 공통으로 사용되는 단순한 직사각형 스트라이프를 렌더링합니다.
 * 웹과 모바일 환경을 모두 지원하며, 각 팀별 래퍼 컴포넌트에서 기본값을 설정합니다.
 *
 * 주요 기능:
 * - 웹: CSS div로 구현
 * - 모바일: SVG Rect로 구현
 * - 완전 커스터마이징 가능 (width, height, color, opacity)
 * - position에 따른 여백 자동 설정
 * - 팀 데이터 기반 색상 오버라이드 지원
 */
export const CommonStripes: React.FC<TeamDecorationProps> = ({
  teamId,
  teamData,
  teamColors,
  width = 3,
  height = 350,
  color = '#D9D9D9',
  opacity = 0.8,
  position,
  style,
}) => {
  // 색상 우선순위: color prop > teamColors > teamData.mainColor > 기본값
  const stripeColor = color || teamColors?.repeatedStripesColor || teamData?.mainColor || '#D9D9D9';
  const resolvedStyle = resolveStyle(style);

  // 여백 설정 (position에 따라 자동 적용)
  const MARGIN_LEFT = 8;
  const MARGIN_RIGHT = 8;

  // position에 따른 추가 스타일 적용 및 여백 설정
  const positionStyle = position === 'bottom-right' ? {
    marginRight: MARGIN_RIGHT,
  } : {
    marginLeft: MARGIN_LEFT,
  };

  // 웹 환경에서는 CSS로 스트라이프 구현
  if (isWeb()) {
    return (
      <View
        style={[
          {
            width,
            height,
            backgroundColor: stripeColor,
            opacity,
            borderRadius: 1, // 약간의 모서리 둥글기
          },
          positionStyle,
          resolvedStyle,
        ]}
      />
    );
  }

  // 모바일 환경에서는 react-native-svg 사용
  if (!Svg || !Rect) {
    // fallback - 기본 View로 렌더링
    return (
      <View
        style={[
          {
            width,
            height,
            backgroundColor: stripeColor,
            opacity,
            borderRadius: 1,
          },
          positionStyle,
          resolvedStyle,
        ]}
      />
    );
  }

  return (
    <View style={[{ opacity }, positionStyle, resolvedStyle]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">
        <Rect
          x="0"
          y="0"
          width={width}
          height={height}
          fill={stripeColor}
          rx="1" // 약간의 모서리 둥글기
        />
      </Svg>
    </View>
  );
};
