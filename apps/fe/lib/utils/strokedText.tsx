import React from "react";
import { View, Text, ViewStyle, TextStyle } from "react-native";
import type { ThemedStyle } from "@/lib/theme/types";

/**
 * 테두리 효과가 있는 텍스트 렌더링 함수
 * 여러 레이어를 사용하여 텍스트에 테두리 효과를 적용합니다.
 */
export const renderStrokedText = ({
  content,
  themed,
  containerStyle,
  fontSize = 24,
  lineHeight = 32,
  numberOfLines = 4,
  borderThickness = 2, // 테두리 두께 (기본값: 2)
}: {
  content: string;
  themed: any;
  containerStyle?: ViewStyle;
  fontSize?: number;
  lineHeight?: number;
  numberOfLines?: number;
  borderThickness?: number; // 테두리 두께 파라미터
}) => {
  // 테두리 레이어를 동적으로 생성
  const generateBorderLayers = () => {
    const layers = [];
    
    // 테두리 두께에 따라 레이어 생성
    for (let i = 1; i <= borderThickness; i++) {
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
              { fontSize, lineHeight, ...direction },
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
        style={[themed($contentText), { fontSize, lineHeight }]}
        numberOfLines={numberOfLines}
      >
        {content}
      </Text>
    </View>
  );
};

// --- 스타일 정의 ---
const $titleContainer: ThemedStyle<ViewStyle> = () => ({
  position: "relative",
});

const $contentTextStroke: ThemedStyle<TextStyle> = () => ({
  position: "absolute",
  color: "black",
  fontWeight: "bold",
  textAlign: "left",
});



const $contentText: ThemedStyle<TextStyle> = () => ({
  position: "relative",
  color: "white",
  fontWeight: "bold",
  textAlign: "left",
});
