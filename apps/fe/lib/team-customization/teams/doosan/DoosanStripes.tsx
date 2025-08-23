import React from 'react';
import { View } from 'react-native';
import { isWeb } from '@/lib/platform';
import type { TeamDecorationProps } from '../../types';

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
  style,
}) => {
  // 두산 팀 색상 사용 (teamData에서 가져오거나 기본값 사용)
  const stripeColor = color || teamData?.mainColor || '#34445F';
  const strokeWidth = Math.max(4, Math.floor(width / 8)); // 너비에 비례한 선 굵기

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
          style
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
    return (
      <View
        style={[
          { width, height, opacity },
          style
        ]}
      />
    );
  }

  // SVG 좌표 계산 (동적 크기에 맞춤)
  const leftX = Math.floor(width * 0.125); // width의 1/8 지점
  const centerX = Math.floor(width * 0.5); // width의 중앙
  const rightX = Math.floor(width * 0.875); // width의 7/8 지점

  return (
    <View style={[{ opacity }, style]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">
        <Path
          d={`M${leftX} ${height}L${leftX} 0`}
          stroke={stripeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <Path
          d={`M${centerX} ${height}L${centerX} 0`}
          stroke={stripeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <Path
          d={`M${rightX} ${height}L${rightX} 0`}
          stroke={stripeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
};
