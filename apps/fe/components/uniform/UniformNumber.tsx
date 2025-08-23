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
  topPosition?: number; // 동적 위치 조정을 위한 prop 추가
  containerWidth?: number; // 중앙 정렬을 위한 컨테이너 너비
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
  topPosition,
  containerWidth,
}) => {
  const { themed, theme } = useAppTheme();
  const numberRef = React.useRef<View>(null);

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

  // 동적 위치 스타일 계산
  const dynamicPositionStyle = React.useMemo(() => {
    if (topPosition !== undefined) {
      return {
        position: "absolute" as const,
        top: topPosition,
        left: containerWidth ? containerWidth / 2 - 20 : 0, // 중앙에서 약간 왼쪽으로 조정
        width: 40, // 숫자 컨테이너 너비 고정
        alignItems: "center" as const,
      };
    }
    return {};
  }, [topPosition, containerWidth]);

  return (
    <View
      ref={numberRef}
      style={[
        styles.container,
        containerStyle,
        dynamicPositionStyle
      ]}
    >
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
  // marginTop 제거 - 동적 위치 조정으로 대체
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
