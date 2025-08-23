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
  mainColor,
  subColor,
  outlineColor,
  style,
  containerWidth = 300, // 기본값 300px
  containerHeight = 350,
}) => {
  const { themed, theme } = useAppTheme();
  const [numberTopPosition, setNumberTopPosition] = React.useState<number | undefined>(undefined);

  // 색상 결정
  const textColor = mainColor || theme.colors.text;
  const numberColor = subColor || theme.colors.text;
  const numberOutline = outlineColor || theme.colors.tint;

  const containerStyle = style ? themed(style) : themed($container);

  // ArchedText의 경계 정보를 받아 UniformNumber 위치 조정
  const handleArchBoundsCalculated = React.useCallback((bounds: { bottomY: number; centerX: number }) => {
    setNumberTopPosition(bounds.bottomY);
  }, []);

  return (
    <View style={[styles.container, containerStyle]}>
      {/* 통합 컨테이너 - 아치형 텍스트와 번호가 같은 영역에 위치 */}
      <View style={[themed($unifiedContainer), { width: containerWidth, height: containerHeight }]}>
        {/* 아치형 텍스트 */}
        <ArchedText
          text={text}
          color={textColor}
          containerWidth={containerWidth} // containerWidth prop 전달
          containerHeight={containerHeight} // containerHeight prop 전달
          onArchBoundsCalculated={handleArchBoundsCalculated} // 위치 정보 콜백 전달
          topPosition={numberTopPosition} // 동적 위치 전달

        />

        {/* 유니폼 번호 - 같은 컨테이너 내에서 절대 위치 */}
        <UniformNumber
          number={number}
          mainColor={numberColor}
          outlineColor={numberOutline}
          topPosition={numberTopPosition} // 동적 위치 전달
          containerWidth={containerWidth} // 중앙 정렬을 위한 너비 전달
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
