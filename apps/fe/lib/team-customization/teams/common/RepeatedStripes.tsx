import React from 'react';
import { View, ViewStyle } from 'react-native';
import { isWeb } from '@/lib/platform';
import type { TeamDecorationProps } from '../../types';
import { CommonStripes } from './CommonStripes';

// ThemedStyle을 ViewStyle로 변환하는 헬퍼 함수
const resolveStyle = (style: any): ViewStyle => {
  if (typeof style === 'function') {
    // 임시로 빈 테마 객체 전달
    return style({});
  }
  return (style as ViewStyle) || {};
};

/**
 * 반복 스트라이프 컴포넌트
 *
 * CommonStripes를 재사용하여 width만큼 지정된 간격으로 스트라이프를 반복 렌더링합니다.
 * 웹과 모바일 환경을 모두 지원하며, 각 팀별로 다양한 패턴의 스트라이프를 만들 수 있습니다.
 *
 * 주요 기능:
 * - CommonStripes 컴포넌트 재사용
 * - 자동 스트라이프 반복 (width / spacing 간격)
 * - 웹: CSS flexbox 기반 반복
 * - 모바일: SVG 기반 반복
 * - 완전 커스터마이징 가능 (width, height, color, opacity, spacing)
 * - position에 따른 여백 자동 설정
 * - 팀 데이터 기반 색상 오버라이드 지원
 */
export const RepeatedStripes: React.FC<TeamDecorationProps & {
  spacing?: number;      // 스트라이프 간격 (기본값: 10)
  stripeWidth?: number;  // 각 스트라이프의 너비 (기본값: 2)
}> = ({
  teamId,
  teamData,
  width = 100,
  height = 350,
  color = '#D9D9D9',
  opacity = 0.8,
  position,
  style,
  spacing = 10,      // 기본 간격 10px
  stripeWidth = 2,   // 기본 스트라이프 너비 2px
}) => {
  const resolvedStyle = resolveStyle(style);

  // 스트라이프 반복 설정
  const stripeCount = Math.max(1, Math.floor(width / spacing)); // 최소 1개 보장

  // 여백 설정 (position에 따라 자동 적용)
  const MARGIN_LEFT = 8;
  const MARGIN_RIGHT = 8;

  // position에 따른 추가 스타일 적용 및 여백 설정
  const positionStyle = position === 'bottom-right' ? {
    marginRight: MARGIN_RIGHT,
  } : {
    marginLeft: MARGIN_LEFT,
  };

  // 웹 환경에서는 CSS로 반복 스트라이프 구현
  if (isWeb()) {
    return (
      <View
        style={[
          {
            width,
            height,
            flexDirection: 'row',
            justifyContent: 'flex-start',
            alignItems: 'stretch',
            opacity,
          },
          positionStyle,
          resolvedStyle,
        ]}
      >
        {/* CommonStripes를 반복하여 렌더링 */}
        {Array.from({ length: stripeCount }, (_, index) => (
          <View
            key={index}
            style={{
              marginRight: index < stripeCount - 1 ? spacing - stripeWidth : 0, // 마지막 스트라이프는 오른쪽 여백 제거
            }}
          >
            <CommonStripes
              teamId={teamId}
              teamData={teamData}
              width={stripeWidth}
              height={height}
              color={color}
              opacity={opacity}
              position={position}
              style={style}
            />
          </View>
        ))}
      </View>
    );
  }

  // 모바일 환경에서는 SVG로 반복 스트라이프 구현
  return (
    <View style={[{ opacity }, positionStyle, resolvedStyle]}>
      {/* CommonStripes를 반복하여 렌더링 */}
      {Array.from({ length: stripeCount }, (_, index) => (
        <View
          key={index}
          style={{
            position: 'absolute',
            left: index * spacing,
            top: 0,
          }}
        >
          <CommonStripes
            teamId={teamId}
            teamData={teamData}
            width={stripeWidth}
            height={height}
            color={color}
            opacity={opacity}
            position={position}
            style={style}
          />
        </View>
      ))}
    </View>
  );
};
