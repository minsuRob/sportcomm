import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { ArchedText } from "./ArchedText";
import { UniformNumber } from "./UniformNumber";

interface UniformPlaceholderProps {
  text?: string;
  number?: string | number;
  mainColor?: string;
  subColor?: string;
  outlineColor?: string;
  style?: ThemedStyle<ViewStyle>;
  containerWidth?: number; // 부모 컨테이너의 너비를 받는 prop 추가
  containerHeight?: number;
  teamColors?: any; // 팀별 커스텀 색상
}

/**
 * 유니폼 플레이스홀더 컴포넌트
 *
 * 아치형 텍스트와 번호를 결합하여 유니폼 스타일의
 * 빈 미디어 플레이스홀더를 제공합니다.
 * 각 컴포넌트는 독립적으로 위치를 계산합니다.
 */
export const UniformPlaceholder: React.FC<UniformPlaceholderProps> = ({
  text = "김택연",
  number = "63",
  mainColor,
  subColor,
  outlineColor,
  style,
  containerWidth = 300, // 기본값 300px
  containerHeight = 350,
  teamColors,
}) => {
  const { themed, theme } = useAppTheme();

  // 색상 결정
  const textColor = mainColor || theme.colors.text;
  const numberColor = subColor || theme.colors.text;
  const numberOutline = outlineColor || theme.colors.tint;

  const containerStyle = style ? themed(style) : themed($container);

  return (
    <View style={[styles.container, containerStyle]}>
      {/* 각 컴포넌트가 독립적으로 위치를 계산하는 컨테이너 */}
      <View style={[themed($unifiedContainer), { width: containerWidth, height: containerHeight }]}>
        {/* 아치형 텍스트 - 독립적으로 위치 계산 */}
        <ArchedText
          text={text}
          color={textColor}
          containerWidth={containerWidth}
          containerHeight={containerHeight}
          teamColors={teamColors}
        />

        {/* 유니폼 번호 - 독립적으로 위치 계산 */}
        <UniformNumber
          number={number}
          mainColor={numberColor}
          outlineColor={numberOutline}
          teamColors={teamColors}
          containerWidth={containerWidth}
          containerHeight={containerHeight}
        />
      </View>
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

const $unifiedContainer: ThemedStyle<ViewStyle> = () => ({
  position: "relative",
  justifyContent: "center",
  alignItems: "center",
});

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    minHeight: 120,
  },
});
