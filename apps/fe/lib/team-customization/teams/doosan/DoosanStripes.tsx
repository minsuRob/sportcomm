import React from 'react';
import { View, ViewStyle } from 'react-native';
import { isWeb } from '@/lib/platform';
import type { TeamDecorationProps } from '../../types';
import { getTeamColors } from '@/lib/theme/teams/teamColor';

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
 * PostActions 영역과 겹치지 않도록 위치가 조정되었습니다.
 */
export const DoosanStripes: React.FC<TeamDecorationProps> = ({
  teamId,
  teamData,
  width = 24,
  height = 160,
  color,
  opacity = 0.6,
  position,
  style,
}) => {
  // 두산 팀 색상 사용 (우선순위: color prop > teamData.decorationBorder > teamData.mainColor > 기본값)
  const stripeColor = color || teamData?.decorationBorder || teamData?.mainColor || '#1E3A8A';
  const strokeWidth = Math.max(4, Math.floor(width / 8)); // 너비에 비례한 선 굵기
  const resolvedStyle = resolveStyle(style);

  // position에 따른 추가 스타일 적용 및 여백 설정
  const positionStyle = position === 'bottom-right' ? {
    // 오른쪽 배치 시 스트라이프 방향이나 색상을 다르게 할 수 있음
    marginRight: 5,
  } : {
    marginLeft: 5,
  };

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
            // PostActions 영역과 겹치지 않도록 최대 높이 제한
            // maxHeight: height > 150 ? 150 : height,
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
    return <View style={[{ width, height: Math.min(height, 150), opacity }, resolvedStyle]} />; // fallback
  }

  return (
    <View style={[{ opacity }, positionStyle, resolvedStyle]}>
      <Svg width={width} height={Math.min(height, 150)} viewBox={`0 0 ${width} ${Math.min(height, 150)}`} fill="none">
        <Path
          d={`M4 ${Math.min(height, 150)}L4 0`}
          stroke={stripeColor}
          strokeWidth={strokeWidth}
        />
        <Path
          d={`M${Math.floor(width/2)} ${Math.min(height, 150)}L${Math.floor(width/2)} 0`}
          stroke={stripeColor}
          strokeWidth={strokeWidth}
        />
        <Path
          d={`M${width-4} ${Math.min(height, 150)}L${width-4} 0`}
          stroke={stripeColor}
          strokeWidth={strokeWidth}
        />
      </Svg>
    </View>
  );
};
