import React from "react";
import { View, Text, ViewStyle, TextStyle } from "react-native";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";

export interface StrokedTextProps {
  content: string;
  fontSize?: number;
  lineHeight?: number;
  numberOfLines?: number;
  borderThickness?: number;
  mainColor?: string;
  strokeColor?: string;
  teamColors?: {
    uniformText?: string;
    uniformStroke?: string;
  };
  containerStyle?: ViewStyle;
}

/**
 * 테두리 효과가 있는 텍스트 컴포넌트
 * 여러 레이어를 사용하여 텍스트에 테두리 효과를 적용합니다.
 */
export function StrokedText({
  content,
  fontSize = 24,
  lineHeight = 32,
  numberOfLines = 4,
  borderThickness = 2,
  mainColor,
  strokeColor,
  teamColors,
  containerStyle,
}: StrokedTextProps) {
  const { themed } = useAppTheme();

  // 우선순위: 직접 전달된 색상 > 팀 색상 > 기본 색상
  const finalMainColor = mainColor || teamColors?.uniformText || "white";
  const finalStrokeColor = strokeColor || teamColors?.uniformStroke || "black";

  // 테두리 레이어를 동적으로 생성
  const generateBorderLayers = () => {
    const layers = [];

    // 테두리 두께에 따라 레이어 생성
    for (let i = 0.1; i <= borderThickness; i += 0.1) {
      // 8방향 테두리 레이어 생성
      const directions = [
        { left: -i, top: -i },   // 왼쪽 위
        { left: i, top: -i },    // 오른쪽 위
        { left: -i, top: i },    // 왼쪽 아래
        { left: i, top: i },     // 오른쪽 아래
        { left: -i, top: 0 },    // 왼쪽
        { left: i, top: 0 },     // 오른쪽
        { left: 0, top: -i },    // 위
        { left: 0, top: i },     // 아래
      ];

      directions.forEach((direction, index) => {
        layers.push(
          <Text
            key={`border-${i}-${index}`}
            style={[
              themed($contentTextStroke),
              {
                fontSize,
                lineHeight,
                color: finalStrokeColor,
                left: direction.left,
                top: direction.top,
              },
            ]}
            numberOfLines={numberOfLines}
          >
            {content}
          </Text>
        );
      });
    }

    return layers;
  };

  return (
    <View style={[themed($titleContainer), containerStyle]}>
      {/* 동적으로 생성된 테두리 레이어들 */}
      {generateBorderLayers()}

      {/* 메인 텍스트 */}
      <Text
        style={[
          themed($contentText),
          { fontSize, lineHeight, color: finalMainColor }
        ]}
        numberOfLines={numberOfLines}
      >
        {content}
      </Text>
    </View>
  );
}

// 기본 export도 제공
export default StrokedText;

// --- 스타일 정의 ---
const $titleContainer: ThemedStyle<ViewStyle> = () => ({
  position: "relative",
});

const $contentTextStroke: ThemedStyle<TextStyle> = () => ({
  position: "absolute",
  fontWeight: "bold",
  textAlign: "left",
});

const $contentText: ThemedStyle<TextStyle> = () => ({
  position: "relative",
  fontWeight: "bold",
  textAlign: "left",
});
