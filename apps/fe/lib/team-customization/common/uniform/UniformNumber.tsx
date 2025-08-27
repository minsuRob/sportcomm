import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";

interface UniformNumberProps {
  number: string | number; // 표시할 등번호
  mainColor?: string; // 메인 색상 (전경)
  outlineColor?: string; // 외곽선 색상
  style?: ThemedStyle<ViewStyle>; // 추가 컨테이너 스타일 (테마 적용 함수)
  fontSize?: number; // 필요 시 커스텀 폰트 크기
}

/**
 * UniformNumber
 * 350px 고정 높이 영역 중앙에 등번호를 크게 렌더링하는 컴포넌트
 * - iOS 에서 보이지 않는 문제를 해결하기 위해 절대 위치/동적 계산 제거
 * - flex 중앙 정렬만 사용
 * - topPosition, containerWidth 등 불필요한 prop 제거
 */
export const UniformNumber: React.FC<UniformNumberProps> = ({
  number,
  mainColor,
  outlineColor,
  style,
  fontSize = 40,
}) => {
  const { themed, theme } = useAppTheme();

  // 색상 결정 (테마 fallback)
  const numberMainColor = mainColor || theme.colors.text;
  const numberOutlineColor = outlineColor || theme.colors.tint;

  // 숫자 텍스트 스타일 구성 (memoization으로 불필요한 렌더 방지)
  const numberStyle = React.useMemo(
    () => ({
      fontSize,
      fontWeight: "bold" as const,
      color: numberMainColor,
      textShadowColor: numberOutlineColor,
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 0,
    }),
    [fontSize, numberMainColor, numberOutlineColor]
  );

  // 컨테이너 스타일 (사용자 정의 테마 스타일 병합)
  const containerStyle = themed($outerContainer);
  const userThemedStyle = style ? themed(style) : undefined;

  return (
    <View style={[containerStyle, userThemedStyle]} pointerEvents="none">
      <Text
        style={[styles.number, numberStyle]}
        allowFontScaling={false}
        // iOS 접근성: 스크린리더용 라벨
        accessibilityRole="text"
        accessibilityLabel={`Uniform number ${number}`}
      >
        {number}
      </Text>
    </View>
  );
};

// 기본 컨테이너 스타일 (350px 고정 높이, 중앙 정렬)
const $outerContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  height: 350,
  width: "100%",
  justifyContent: "center",
  alignItems: "center",
  // 필요 시 배경 색상 적용 가능: backgroundColor: colors.background
});

const styles = StyleSheet.create({
  number: {
    textAlign: "center",
    includeFontPadding: false, // Android 내림/올림 공백 제거
    textAlignVertical: "center",
  },
});
