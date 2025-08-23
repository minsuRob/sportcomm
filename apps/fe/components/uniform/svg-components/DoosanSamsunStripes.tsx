import React from 'react';
import { View } from 'react-native';
import { isWeb } from '@/lib/platform';

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

interface DoosanSamsunStripesProps {
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
}

/**
 * 두산 삼성 스트라이프 SVG 컴포넌트
 *
 * PostCard 왼쪽 하단에 배치되는 장식용 스트라이프
 */
export const DoosanSamsunStripes: React.FC<DoosanSamsunStripesProps> = ({
  width = 32,
  height = 152,
  color = "#34445F",
  strokeWidth = 8,
}) => {
  // 웹 환경에서는 CSS로 스트라이프 구현
  if (isWeb()) {
    return (
      <View
        style={{
          width,
          height,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'stretch',
        }}
      >
        <View style={{ width: strokeWidth, backgroundColor: color }} />
        <View style={{ width: strokeWidth, backgroundColor: color }} />
        <View style={{ width: strokeWidth, backgroundColor: color }} />
      </View>
    );
  }

  // 모바일 환경에서는 react-native-svg 사용
  if (!Svg || !Path) {
    return <View style={{ width, height }} />; // fallback
  }

  return (
    <Svg width={width} height={height} viewBox="0 0 32 152" fill="none">
      <Path
        d="M28 152L28 0"
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Path
        d="M16 152L16 0"
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Path
        d="M4 152L4 0"
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
};
