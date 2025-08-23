import React from 'react';
import { View, ViewStyle } from 'react-native';
import { UniformPlaceholder } from '@/components/uniform/UniformPlaceholder';
import { isWeb } from '@/lib/platform';
import type { TeamCustomizationConfig, TeamDecorationProps, TeamUniformProps } from '../../types';

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
let Circle: any = null;
let Path: any = null;
try {
  if (!isWeb()) {
    const svgModule = require('react-native-svg');
    Svg = svgModule.Svg;
    Circle = svgModule.Circle;
    Path = svgModule.Path;
  }
} catch (error) {
  console.warn('react-native-svg를 로드할 수 없습니다:', error);
}

/**
 * 삼성 라이온즈 전용 원형 장식 컴포넌트
 *
 * 삼성 팀의 시그니처 디자인인 원형 패턴을 렌더링합니다.
 */
export const SamsungCircles: React.FC<TeamDecorationProps> = ({
  teamId,
  teamData,
  width = 32,
  height = 32,
  color,
  opacity = 0.5,
  style,
}) => {
  // 삼성 팀 색상 사용 (라이온즈 블루)
  const circleColor = color || teamData?.mainColor || '#003DA5';
  const resolvedStyle = resolveStyle(style);

  // 웹 환경에서는 CSS로 원형 패턴 구현
  if (isWeb()) {
    const circleSize = Math.min(width, height) / 3;

    return (
      <View
        style={[
          {
            width,
            height,
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            opacity,
          },
          resolvedStyle,
        ]}
      >
        <View
          style={{
            width: circleSize,
            height: circleSize,
            borderRadius: circleSize / 2,
            backgroundColor: circleColor,
            margin: 2,
          }}
        />
        <View
          style={{
            width: circleSize * 0.7,
            height: circleSize * 0.7,
            borderRadius: circleSize * 0.35,
            backgroundColor: circleColor,
            margin: 2,
          }}
        />
        <View
          style={{
            width: circleSize * 0.5,
            height: circleSize * 0.5,
            borderRadius: circleSize * 0.25,
            backgroundColor: circleColor,
            margin: 2,
          }}
        />
      </View>
    );
  }

  // 모바일 환경에서는 react-native-svg 사용
  if (!Svg || !Circle) {
    return (
      <View
        style={[
          { width, height, opacity },
          resolvedStyle,
        ]}
      />
    );
  }

  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = Math.min(width, height) / 3;

  return (
    <View style={[{ opacity }, resolvedStyle]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">
        <Circle
          cx={centerX}
          cy={centerY - maxRadius * 0.5}
          r={maxRadius}
          fill={circleColor}
        />
        <Circle
          cx={centerX - maxRadius * 0.8}
          cy={centerY + maxRadius * 0.3}
          r={maxRadius * 0.7}
          fill={circleColor}
        />
        <Circle
          cx={centerX + maxRadius * 0.8}
          cy={centerY + maxRadius * 0.3}
          r={maxRadius * 0.5}
          fill={circleColor}
        />
      </Svg>
    </View>
  );
};

/**
 * 삼성 라이온즈 전용 유니폼 플레이스홀더 컴포넌트
 *
 * 삼성 팀의 시그니처 색상과 스타일을 적용한 유니폼을 렌더링합니다.
 */
export const SamsungUniform: React.FC<TeamUniformProps> = ({
  teamId,
  teamData,
  text,
  number,
  mainColor,
  subColor,
  outlineColor,
  containerWidth = 300,
  containerHeight = 350,
  style,
}) => {
  // 삼성 팀 기본 설정
  const defaultText = text || teamData?.name || '삼성라이온즈';
  const defaultNumber = number || '7';
  const resolvedStyle = resolveStyle(style);

  // 삼성 팀 색상 설정 (라이온즈 블루 베이스)
  const samsungMainColor = mainColor || teamData?.mainColor || '#003DA5'; // 라이온즈 블루
  const samsungSubColor = subColor || teamData?.subColor || '#ffffff'; // 화이트
  const samsungOutlineColor = outlineColor || teamData?.darkMainColor || '#002866'; // 더 어두운 블루

  // 삼성 라이온즈 특별 번호 매핑 (유명 선수들)
  const getSamsungPlayerInfo = (num: string | number) => {
    const playerMap: { [key: string]: string } = {
      '7': '이재현',
      '10': '김헌곤',
      '23': '구자욱',
      '27': '강민호',
      '32': '디아즈',
      '44': '김동엽',
      '51': '원태인',
    };

    return playerMap[String(num)] || defaultText;
  };

  const playerName = typeof defaultNumber === 'string' || typeof defaultNumber === 'number'
    ? getSamsungPlayerInfo(defaultNumber)
    : defaultText;

  return (
    <UniformPlaceholder
      text={playerName}
      number={defaultNumber}
      mainColor={samsungMainColor}
      subColor={samsungSubColor}
      outlineColor={samsungOutlineColor}
      containerWidth={containerWidth}
      containerHeight={containerHeight}
      style={resolvedStyle as any}
    />
  );
};

/**
 * 삼성 라이온즈 팀 커스터마이징 설정
 *
 * 삼성 라이온즈 팀의 고유한 디자인 요소들을 정의합니다.
 * - 원형 패턴 장식 (팀 시그니처)
 * - 커스텀 유니폼 플레이스홀더
 * - 팀 색상 및 스타일 설정
 */
export const samsungCustomization: TeamCustomizationConfig = {
  teamId: 'samsung',
  teamName: '삼성 라이온즈',

  // 장식 요소 (원형 패턴)
  decoration: {
    component: SamsungCircles,
    props: {
      width: 32,
      height: 32,
      opacity: 0.5,
      position: 'bottom-right' as const,
    },
    enabled: true,
  },

  // 유니폼 플레이스홀더
  uniform: {
    component: SamsungUniform,
    props: {
      text: '구자욱',
      number: '23',
      containerWidth: 300,
      containerHeight: 350,
    },
    enabled: true,
  },

  // 팀별 스타일 오버라이드
  styles: {
    decoration: () => ({
      position: 'absolute',
      bottom: 16,
      right: 16,
      zIndex: 10,
    }),
    uniform: () => ({
      // 유니폼 관련 스타일 오버라이드
    }),
    postCard: () => ({
      // PostCard 전체 스타일 오버라이드 (필요시)
    }),
  },
};

// 삼성 팀 설정을 기본 export
export default samsungCustomization;
