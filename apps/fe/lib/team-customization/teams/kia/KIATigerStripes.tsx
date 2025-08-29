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
 * 기아 타이거즈 전용 호랑이 스트라이프 컴포넌트
 *
 * 기아 타이거즈의 시그니처 디자인인 호랑이 무늬 스트라이프를 렌더링합니다.
 * 사선 패턴으로 호랑이의 줄무늬를 모방하며, 팀 색상과 테마에 따라 동적으로 색상이 변경됩니다.
 * 두산의 세로 스트라이프와 다르게 각도가 있는 호랑이 무늬를 구현합니다.
 */
export const KIATigerStripes: React.FC<TeamDecorationProps> = ({
  teamId,
  teamData,
  width = 32,
  height = 160,
  color,
  opacity = 0.5,
  position,
  style,
}) => {
  // 기아 팀 색상 사용 (우선순위: color prop > teamData.decorationBorder > teamData.mainColor > 기본값)
  const stripeColor = color || teamData?.decorationBorder || teamData?.mainColor || '#EA0029';
  const strokeWidth = Math.max(2, Math.floor(width / 12)); // 너비에 비례한 선 굵기
  const resolvedStyle = resolveStyle(style);

  // position에 따른 추가 스타일 적용
  const positionStyle = position === 'bottom-right' ? {
    marginRight: 5,
  } : {
    marginLeft: 5,
  };

  // 호랑이 무늬 각도 (약 20도 기울어진 사선)
  const angle = 20;
  const stripeSpacing = 8; // 스트라이프 간격

  // 웹 환경에서는 CSS로 호랑이 무늬 구현
  if (isWeb()) {
    return (
      <View
        style={[
          {
            width,
            height,
            opacity,
            overflow: 'hidden',
            position: 'relative',
          },
          positionStyle,
          resolvedStyle,
        ]}
      >
        {/* 호랑이 무늬를 CSS로 구현 */}
        <View
          style={{
            position: 'absolute',
            top: -20,
            left: -10,
            right: -10,
            bottom: -20,
            background: `repeating-linear-gradient(
              ${angle}deg,
              transparent,
              transparent ${stripeSpacing - strokeWidth}px,
              ${stripeColor} ${stripeSpacing - strokeWidth}px,
              ${stripeColor} ${stripeSpacing}px
            )`,
          }}
        />
      </View>
    );
  }

  // 모바일 환경에서는 react-native-svg 사용
  if (!Svg || !Path) {
    return <View style={[{ width, height: Math.min(height, 150), opacity }, resolvedStyle]} />; // fallback
  }

  const actualHeight = Math.min(height, 150);

  // 사선 스트라이프 계산
  const angleRad = (angle * Math.PI) / 180;
  const stripeCount = Math.ceil((width + actualHeight) / stripeSpacing);

  return (
    <View style={[{ opacity }, positionStyle, resolvedStyle]}>
      <Svg width={width} height={actualHeight} viewBox={`0 0 ${width} ${actualHeight}`} fill="none">
        {Array.from({ length: stripeCount }, (_, index) => {
          // 사선 스트라이프 시작점과 끝점 계산
          const offset = index * stripeSpacing - actualHeight;
          const x1 = offset;
          const y1 = 0;
          const x2 = offset + actualHeight * Math.tan(angleRad);
          const y2 = actualHeight;

          // 스트라이프가 영역 내에 있는지 확인
          if (x2 < 0 || x1 > width) return null;

          return (
            <Path
              key={index}
              d={`M${Math.max(0, x1)} ${x1 < 0 ? -x1 / Math.tan(angleRad) : y1}L${Math.min(width, x2)} ${x2 > width ? actualHeight - (x2 - width) / Math.tan(angleRad) : y2}`}
              stroke={stripeColor}
              strokeWidth={strokeWidth}
              opacity={0.7}
              strokeLinecap="round"
            />
          );
        })}
      </Svg>
    </View>
  );
};
