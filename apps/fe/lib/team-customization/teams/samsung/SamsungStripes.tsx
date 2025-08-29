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
 * 삼성 라이온즈 전용 스트라이프 컴포넌트
 *
 * 삼성 팀의 단순하고 깔끔한 직사각형 스트라이프를 렌더링합니다.
 * 팀 색상과 테마에 따라 동적으로 색상이 변경됩니다.
 *
 * 설정값은 registry.ts에서 중앙 관리되며, 다음과 같은 기본값을 사용합니다:
 * - width: 3 (기본 스트라이프 너비)
 * - height: 350 (기본 스트라이프 높이)
 * - color: '#D9D9D9' (기본 회색, 팀 색상으로 오버라이드 가능)
 * - opacity: 0.8 (기본 투명도)
 * - position: 'bottom-left' 또는 'bottom-right' (registry에서 설정)
 */
export const SamsungStripes: React.FC<TeamDecorationProps> = ({
  teamId,
  teamData,
  width = 3,
  height = 350,
  color,
  opacity = 0.8,
  position,
  style,
}) => {
  // 삼성 팀 색상 사용 (우선순위: color prop > teamData.mainColor > 기본값)
  const stripeColor = color || teamData?.mainColor || '#D9D9D9';
  const resolvedStyle = resolveStyle(style);

  // 여백 설정 (registry.ts에서 관리할 수 있도록 상수로 정의)
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
