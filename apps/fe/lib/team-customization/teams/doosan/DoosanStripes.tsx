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
 * 두산 베어스 전용 스트라이프 컴포넌트
 *
 * 두산 팀의 시그니처 디자인인 세로 스트라이프를 렌더링합니다.
 * 팀 색상과 테마에 따라 동적으로 색상이 변경됩니다.
 */
export const DoosanStripes: React.FC<TeamDecorationProps> = ({
  teamId,
  teamData,
  width = 24,
  height = 120,
  color,
  opacity = 0.6,
  position,
  style,
}) => {
  // 두산 팀 색상 사용 (teamData에서 가져오거나 기본값 사용)
  const stripeColor = color || teamData?.mainColor || '#34445F';
  const strokeWidth = Math.max(4, Math.floor(width / 8)); // 너비에 비례한 선 굵기
  const resolvedStyle = resolveStyle(style);

  // position에 따른 추가 스타일 적용
  const positionStyle = position === 'bottom-right' ? {
    // 오른쪽 배치 시 스트라이프 방향이나 색상을 다르게 할 수 있음
  } : {};

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
        <View
          style={{
            width: strokeWidth,
            backgroundColor: stripeColor,
            borderRadius: strokeWidth / 2
          }}
        />
        <View
          style={{
            width: strokeWidth,
            backgroundColor: stripeColor,
            borderRadius: strokeWidth / 2
          }}
        />
        <View
          style={{
            width: strokeWidth,
            backgroundColor: stripeColor,
            borderRadius: strokeWidth / 2
          }}
        />
      </View>
    );
  }

  // 모바일 환경에서는 react-native-svg 사용
  if (!Svg || !Path) {
    return <View style={[{ width, height, opacity }, resolvedStyle]} />; // fallback
  }

  return (
    <View style={[{ opacity }, positionStyle, resolvedStyle]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">
        <Path
          d={`M4 ${height}L4 0`}
          stroke={stripeColor}
          strokeWidth={strokeWidth}
        />
        <Path
          d={`M${Math.floor(width/2)} ${height}L${Math.floor(width/2)} 0`}
          stroke={stripeColor}
          strokeWidth={strokeWidth}
        />
        <Path
          d={`M${width-4} ${height}L${width-4} 0`}
          stroke={stripeColor}
          strokeWidth={strokeWidth}
        />
      </Svg>
    </View>
  );
};
