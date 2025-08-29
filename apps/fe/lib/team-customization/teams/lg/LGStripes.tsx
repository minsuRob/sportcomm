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
 * LG 트윈스 전용 단일 스트라이프 컴포넌트
 *
 * 단순하고 깔끔한 단일 SVG 스트라이프를 렌더링합니다.
 * registry.ts에서 width, height, color를 완전히 제어할 수 있습니다.
 *
 * registry.ts에서 설정 가능한 속성:
 * - width: 스트라이프 너비 (기본값: 3)
 * - height: 스트라이프 높이 (기본값: 350)
 * - color: 스트라이프 색상 (기본값: #D9D9D9)
 * - opacity: 투명도 (기본값: 1.0)
 * - position: 위치 ('bottom-left' | 'bottom-right')
 */
export const LGStripes: React.FC<TeamDecorationProps> = ({
  teamId,
  teamData,
  width = 8,          // registry.ts와 동일한 기본값
  height = 200,       // registry.ts와 동일한 기본값
  color = '#C41E3A',  // LG 트윈스 레드 (registry.ts와 동일)
  opacity = 0.8,      // registry.ts와 동일한 기본값
  position,
  style,
}) => {
  // 색상 우선순위: teamData.decorationBorder > teamData.subColor > color prop > 기본값
  const stripeColor = teamData?.decorationBorder || teamData?.subColor || color || '#D9D9D9';
  const resolvedStyle = resolveStyle(style);

  // 여백 설정 (DoosanStripes와 동일한 패턴)
  const MARGIN_LEFT = 5;
  const MARGIN_RIGHT = 5;

  // position에 따른 추가 스타일 적용
  const positionStyle = position === 'bottom-right' ? {
    marginRight: MARGIN_RIGHT,
  } : {
    marginLeft: MARGIN_LEFT,
  };

  // 웹 환경에서는 CSS div로 스트라이프 구현
  if (isWeb()) {
    return (
      <View
        style={[
          {
            width,
            height,
            backgroundColor: stripeColor,
            opacity,
          },
          positionStyle,
          resolvedStyle,
        ]}
      />
    );
  }

  // 모바일 환경에서는 react-native-svg 사용
  if (!Svg || !Rect) {
    // SVG 로드 실패 시 CSS fallback
    return (
      <View
        style={[
          {
            width,
            height,
            backgroundColor: stripeColor,
            opacity,
          },
          positionStyle,
          resolvedStyle,
        ]}
      />
    );
  }

  return (
    <View style={[{ opacity }, positionStyle, resolvedStyle]}>
      <Svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        fill="none"
      >
        <Rect
          width={width}
          height={height}
          fill={stripeColor}
        />
      </Svg>
    </View>
  );
};
