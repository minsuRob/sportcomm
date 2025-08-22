import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";

interface UniformNumberProps {
  number: string | number;
  size?: "small" | "medium" | "large";
  mainColor?: string;
  outlineColor?: string;
  style?: ThemedStyle<ViewStyle>;
}

/**
 * 유니폼 번호 컴포넌트
 *
 * 아치형 텍스트 아래에 큰 숫자를 표시하며,
 * 메인 색상과 아웃라인 색상을 지원합니다.
 */
export const UniformNumber: React.FC<UniformNumberProps> = ({
  number,
  size = "medium",
  mainColor,
  outlineColor,
  style,
}) => {
  const { themed, theme } = useAppTheme();

  // 색상 결정
  const numberMainColor = mainColor || theme.colors.text;
  const numberOutlineColor = outlineColor || theme.colors.tint;

  // 크기별 스타일 결정
  const getNumberStyle = () => {
    switch (size) {
      case "small":
        return { fontSize: 32, fontWeight: "bold" as const };
      case "large":
        return { fontSize: 48, fontWeight: "bold" as const };
      default:
        return { fontSize: 40, fontWeight: "bold" as const };
    }
  };

  const containerStyle = style ? themed(style) : themed($container);
  const numberStyle = getNumberStyle();

  return (
    <View style={[styles.container, containerStyle]}>
      <Text
        style={[
          styles.number,
          numberStyle,
          {
            color: numberMainColor,
            textShadowColor: numberOutlineColor,
            textShadowOffset: { width: 1, height: 1 },
            textShadowRadius: 0,
          },
        ]}
      >
        {number}
      </Text>
    </View>
  );
};

// 기본 스타일
const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  justifyContent: "center",
  alignItems: "center",
  marginTop: 10,
});

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  number: {
    textAlign: "center",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
});
