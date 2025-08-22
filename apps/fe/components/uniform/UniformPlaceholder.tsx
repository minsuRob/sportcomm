import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { ArchedText } from "./ArchedText";
import { UniformNumber } from "./UniformNumber";

interface UniformPlaceholderProps {
  text?: string;
  number?: string | number;
  size?: "small" | "medium" | "large";
  mainColor?: string;
  subColor?: string;
  outlineColor?: string;
  style?: ThemedStyle<ViewStyle>;
}

/**
 * 유니폼 플레이스홀더 컴포넌트
 *
 * 아치형 텍스트와 번호를 결합하여 유니폼 스타일의
 * 빈 미디어 플레이스홀더를 제공합니다.
 */
export const UniformPlaceholder: React.FC<UniformPlaceholderProps> = ({
  text = "김택연",
  number = "63",
  size = "medium",
  mainColor,
  subColor,
  outlineColor,
  style,
}) => {
  const { themed, theme } = useAppTheme();

  // 색상 결정
  const textColor = mainColor || theme.colors.text;
  const numberColor = subColor || theme.colors.text;
  const numberOutline = outlineColor || theme.colors.tint;

  const containerStyle = style ? themed(style) : themed($container);

  return (
    <View style={[styles.container, containerStyle]}>
      {/* 아치형 텍스트 */}
      <ArchedText
        text={text}
        size={size}
        color={textColor}
        style={$archedTextContainer}
      />

      {/* 유니폼 번호 */}
      <UniformNumber
        number={number}
        size={size}
        mainColor={numberColor}
        outlineColor={numberOutline}
        style={$numberContainer}
      />
    </View>
  );
};

// 기본 스타일
const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: "100%",
  height: "100%",
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: colors.background,
  borderRadius: 8,
  padding: 16,
});

const $archedTextContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
});

const $numberContainer: ThemedStyle<ViewStyle> = () => ({
  justifyContent: "center",
  alignItems: "center",
  marginTop: 8,
});

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    minHeight: 120,
  },
});
