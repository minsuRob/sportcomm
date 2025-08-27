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
}: {
  content: string;
  themed: any;
  containerStyle?: ViewStyle;
  fontSize?: number;
  lineHeight?: number;
  numberOfLines?: number;
}) => {
  return (
    <View style={[themed($titleContainer), containerStyle]}>
      {/* 테두리 효과를 위한 여러 레이어 */}
      <Text
        style={[
          themed($contentTextStroke),
          { fontSize, lineHeight, left: -1, top: -1 },
        ]}
        numberOfLines={numberOfLines}
      >
        {content}
      </Text>
      <Text
        style={[
          themed($contentTextStroke2),
          { fontSize, lineHeight, left: 1, top: -1 },
        ]}
        numberOfLines={numberOfLines}
      >
        {content}
      </Text>
      <Text
        style={[
          themed($contentTextStroke3),
          { fontSize, lineHeight, left: -1, top: 1 },
        ]}
        numberOfLines={numberOfLines}
      >
        {content}
      </Text>
      <Text
        style={[
          themed($contentTextStroke4),
          { fontSize, lineHeight, left: 1, top: 1 },
        ]}
        numberOfLines={numberOfLines}
      >
        {content}
      </Text>
      <Text
        style={[
          themed($contentTextStroke5),
          { fontSize, lineHeight, left: -2, top: 0 },
        ]}
        numberOfLines={numberOfLines}
      >
        {content}
      </Text>
      <Text
        style={[
          themed($contentTextStroke6),
          { fontSize, lineHeight, left: 2, top: 0 },
        ]}
        numberOfLines={numberOfLines}
      >
        {content}
      </Text>
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

const $contentTextStroke2: ThemedStyle<TextStyle> = () => ({
  position: "absolute",
  color: "black",
  fontWeight: "bold",
  textAlign: "left",
});

const $contentTextStroke3: ThemedStyle<TextStyle> = () => ({
  position: "absolute",
  color: "black",
  fontWeight: "bold",
  textAlign: "left",
});

const $contentTextStroke4: ThemedStyle<TextStyle> = () => ({
  position: "absolute",
  color: "black",
  fontWeight: "bold",
  textAlign: "left",
});

const $contentTextStroke5: ThemedStyle<TextStyle> = () => ({
  position: "absolute",
  color: "black",
  fontWeight: "bold",
  textAlign: "left",
});

const $contentTextStroke6: ThemedStyle<TextStyle> = () => ({
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
