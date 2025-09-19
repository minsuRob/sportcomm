import React from "react";
import { View, ViewStyle, Platform, Text } from "react-native";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";

// 모바일에서만 react-native-svg import
let Svg: any, SvgText: any;
if (Platform.OS !== 'web') {
  try {
    const svgModule = require('react-native-svg');
    Svg = svgModule.default;
    SvgText = svgModule.Text;
  } catch (error) {
    console.warn('react-native-svg not available:', error);
  }
}

interface UniformNumberProps {
  number: string | number; // 표시할 등번호
  mainColor?: string; // 메인 색상 (전경)
  outlineColor?: string; // 외곽선 색상
  style?: ThemedStyle<ViewStyle>; // 추가 컨테이너 스타일 (테마 적용 함수)
  fontSize?: number; // 필요 시 커스텀 폰트 크기
  borderThickness?: number; // 테두리 두께 (우선순위: prop > teamColors.uniformNumberThickness > 1.0)
  teamColors?: any; // 팀별 커스텀 색상
  containerWidth?: number; // 컨테이너 너비 (PostCard에서 측정된 값)
  containerHeight?: number; // 컨테이너 높이 (PostCard에서 측정된 값)
}

/**
 * UniformNumber
 * 등번호를 PostCard 컨테이너 기준으로 완벽한 가로세로 중앙 정렬로 렌더링하는 컴포넌트
 * - PostCard에서 측정된 실제 컨테이너 크기 기준으로 중앙 정렬
 * - 숫자 크기에 관계없이 일관된 중앙 정렬
 * - 웹과 모바일 모두 지원하는 크로스 플랫폼 구현
 * - flex를 활용한 완벽한 가운데 정렬
 */
export const UniformNumber: React.FC<UniformNumberProps> = ({
  number,
  mainColor,
  outlineColor,
  style,
  fontSize = 40,
  borderThickness,
  teamColors,
  containerWidth,
  containerHeight,
}) => {
  const { themed, theme } = useAppTheme();

  // 폰트별 최적화된 테두리 두께 계산
  const getOptimizedThickness = (baseThickness: number) => {
    // SpaceGrotesk-SemiBold는 더 얇은 폰트이므로 테두리를 더 얇게 조정
    const fontMultiplier = 1.5; // 더 얇은 테두리를 위한 배율 감소
    // 폰트 사이즈에 따른 추가 조정 (큰 폰트일수록 상대적으로 테두리가 얇아 보임)
    const sizeMultiplier = fontSize > 50 ? 0.9 : fontSize > 30 ? 0.8 : 0.7;
    return Math.max(0.5, Math.round(baseThickness * fontMultiplier * sizeMultiplier * 10) / 10);
  };

  // 테두리 두께 결정 (prop > teamColors.uniformNumberThickness > 1)
  const baseThickness = borderThickness !== undefined
    ? borderThickness
    : (teamColors?.uniformNumberThickness ?? 1);

  const effectiveThickness = getOptimizedThickness(baseThickness);

  // 색상 결정 (테마 fallback)
  const numberMainColor = teamColors?.uniformNumberText || theme.colors.text || mainColor ;
  const numberOutlineColor = teamColors?.uniformNumberStroke || theme.colors.tint;

  // 컨테이너 크기 결정 (props로 전달받은 값 또는 기본값)
  const finalContainerWidth = containerWidth || 350;
  const finalContainerHeight = containerHeight || 350;

  // 컨테이너 스타일 (사용자 정의 테마 스타일 병합)
  const containerStyle = themed($outerContainer);
  const userThemedStyle = style ? themed(style) : undefined;

  // 모바일용 SVG 렌더링
  const renderMobileSVG = () => {
    if (!Svg || !SvgText) {
      // fallback: React Native Text 컴포넌트 사용
      return (
        <Text
          style={{
            fontSize,
            fontWeight: '600',
            fontFamily: 'SpaceGrotesk-SemiBold',
            color: numberMainColor,
            textAlign: 'center',
            textShadowColor: numberOutlineColor,
            textShadowOffset: { width: effectiveThickness * 0.7, height: effectiveThickness * 0.7 },
            textShadowRadius: 0,
          }}
        >
          {String(number)}
        </Text>
      );
    }

    const textX = finalContainerWidth / 2;
    const textY = finalContainerHeight / 2 + fontSize / 3;

    // SpaceGrotesk-SemiBold에 최적화된 stroke 방향 계산 (더 얇은 테두리)
    const getStrokeDirections = (thickness: number) => {
      // 더 얇은 테두리를 위해 방향 수 감소 및 offset 조정
      const baseDirections = [
        { x: -thickness * 0.8, y: 0 },      // 왼쪽 (약간 감소)
        { x: thickness * 0.8, y: 0 },       // 오른쪽 (약간 감소)
        { x: 0, y: -thickness * 0.8 },      // 위 (약간 감소)
        { x: 0, y: thickness * 0.8 },       // 아래 (약간 감소)
      ];

      // 대각선 방향도 간소화
      const diagonalDirections = [
        { x: -thickness * 0.6, y: -thickness * 0.6 }, // 왼쪽 위 (축소)
        { x: thickness * 0.6, y: -thickness * 0.6 },  // 오른쪽 위 (축소)
        { x: -thickness * 0.6, y: thickness * 0.6 },  // 왼쪽 아래 (축소)
        { x: thickness * 0.6, y: thickness * 0.6 },   // 오른쪽 아래 (축소)
      ];

      if (thickness <= 0.8) {
        // 매우 얇은 테두리: 기본 4방향만 사용
        return baseDirections;
      } else if (thickness <= 1.5) {
        // 얇은 테두리: 4방향 + 주요 대각선 2방향
        return [
          ...baseDirections,
          { x: -thickness * 0.5, y: -thickness * 0.5 }, // 왼쪽 위
          { x: thickness * 0.5, y: thickness * 0.5 },   // 오른쪽 아래
        ];
      } else {
        // 약간 두꺼운 테두리: 8방향 (기본 + 모든 대각선)
        return [...baseDirections, ...diagonalDirections];
      }
    };

    const strokeDirections = getStrokeDirections(effectiveThickness);

    return (
      <Svg height={finalContainerHeight} width={finalContainerWidth}>
        {/* 8방향 stroke 텍스트 (먼저 렌더링) */}
        {strokeDirections.map((direction, index) => (
          <SvgText
            key={`stroke-${index}`}
            fill={numberOutlineColor}
            stroke="none"
            fontSize={fontSize}
            fontWeight="400"
            fontFamily="SpaceGrotesk-SemiBold"
            x={textX + direction.x}
            y={textY + direction.y}
            textAnchor="middle"
          >
            {String(number)}
          </SvgText>
        ))}
        
        {/* 메인 텍스트 (마지막에 렌더링하여 위에 표시) */}
        <SvgText
          fill={numberMainColor}
          stroke="none"
          fontSize={fontSize}
          fontWeight="400"
          fontFamily="SpaceGrotesk-SemiBold"
          x={textX}
          y={textY}
          textAnchor="middle"
        >
          {String(number)}
        </SvgText>
      </Svg>
    );
  };

  // 웹용 HTML 렌더링
  const renderWebText = () => {
    if (Platform.OS === 'web') {
      // 웹에서는 HTML div 요소를 직접 렌더링
      return React.createElement('div', {
        style: {
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: `${fontSize}px`,
          fontWeight: '500',
          fontFamily: 'SpaceGrotesk-SemiBold',
          color: numberMainColor,
          textShadow: `${effectiveThickness * 0.7}px 0 0 ${numberOutlineColor}, ${-effectiveThickness * 0.7}px 0 0 ${numberOutlineColor}, 0 ${effectiveThickness * 0.7}px 0 ${numberOutlineColor}, 0 ${-effectiveThickness * 0.7}px 0 ${numberOutlineColor}`,
          textAlign: 'center',
          userSelect: 'none',
          pointerEvents: 'none',
        },
        children: String(number),
      });
    }

    // 웹이 아닌 경우 fallback
    return (
      <Text
        style={{
          fontSize,
          fontWeight: '500',
          fontFamily: 'SpaceGrotesk-SemiBold',
          color: numberMainColor,
          textAlign: 'center',
          textShadowColor: numberOutlineColor,
          textShadowOffset: { width: effectiveThickness * 0.7, height: effectiveThickness * 0.7 },
          textShadowRadius: 0,
        }}
      >
        {String(number)}
      </Text>
    );
  };

  return (
    <View style={[containerStyle, userThemedStyle]} pointerEvents="none">
      {Platform.OS === 'web' ? renderWebText() : renderMobileSVG()}
    </View>
  );
};

// 기본 컨테이너 스타일 (PostCard 컨테이너 기준 완벽한 가로세로 중앙 정렬)
const $outerContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1, // PostCard 컨테이너 영역 전체 활용
  left: 8, // TODO: 하드코딩 된 왼쪽 너비, 개선할수있으면 해야함.
  width: "100%", // 가로 전체 너비 사용
  justifyContent: "center", // 세로 중앙 정렬
  alignItems: "center", // 가로 중앙 정렬
  // 필요 시 배경 색상 적용 가능: backgroundColor: colors.background
});
