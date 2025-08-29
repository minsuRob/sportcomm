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
 * LG 트윈스 전용 세로 스트라이프 컴포넌트
 *
 * LG 트윈스의 시그니처 디자인인 세로 스트라이프를 렌더링합니다.
 * 유니폼의 핀스트라이프 패턴을 모방하여 여러 개의 얇은 세로선을 그립니다.
 * 팀 색상과 테마에 따라 동적으로 색상이 변경됩니다.
 */
export const LGStripes: React.FC<TeamDecorationProps> = ({
  teamId,
  teamData,
  width = 32,
  height = 160,
  color,
  opacity = 0.4,
  position,
  style,
}) => {
  // LG 팀 색상 사용 (우선순위: color prop > teamData.decorationBorder > teamData.subColor > 기본값)
  const stripeColor = color || teamData?.decorationBorder || teamData?.subColor || '#000000';
  const stripeWidth = 1; // 얇은 스트라이프
  const stripeSpacing = 4; // 스트라이프 간격
  const resolvedStyle = resolveStyle(style);

  // position에 따른 추가 스타일 적용
  const positionStyle = position === 'bottom-right' ? {
    marginRight: 5,
  } : {
    marginLeft: 5,
  };

  // 스트라이프 개수 계산 (너비에 따라 동적으로)
  const stripeCount = Math.floor(width / stripeSpacing);

  // 웹 환경에서는 CSS로 스트라이프 구현
  if (isWeb()) {
    return (
      <View
        style={[
          {
            width,
            height,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'stretch',
            opacity,
          },
          positionStyle,
          resolvedStyle,
        ]}
      >
        {Array.from({ length: stripeCount }, (_, index) => (
          <View
            key={index}
            style={{
              width: stripeWidth,
              backgroundColor: stripeColor,
              height: '100%',
            }}
          />
        ))}
      </View>
    );
  }

  // 모바일 환경에서는 react-native-svg 사용
  if (!Svg || !Path) {
    return <View style={[{ width, height: Math.min(height, 150), opacity }, resolvedStyle]} />; // fallback
  }

  const actualHeight = Math.min(height, 150);

  return (
    <View style={[{ opacity }, positionStyle, resolvedStyle]}>
      <Svg width={width} height={actualHeight} viewBox={`0 0 ${width} ${actualHeight}`} fill="none">
        {Array.from({ length: stripeCount }, (_, index) => {
          const x = index * stripeSpacing + (stripeSpacing - stripeWidth) / 2;
          return (
            <Path
              key={index}
              d={`M${x} 0L${x} ${actualHeight}`}
              stroke={stripeColor}
              strokeWidth={stripeWidth}
              opacity={0.8}
            />
          );
        })}
      </Svg>
    </View>
  );
};
