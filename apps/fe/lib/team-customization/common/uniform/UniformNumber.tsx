import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { renderStrokedText } from "@/lib/utils/strokedText";

interface UniformNumberProps {
  number: string | number; // 표시할 등번호
  mainColor?: string; // 메인 색상 (전경)
  outlineColor?: string; // 외곽선 색상
  style?: ThemedStyle<ViewStyle>; // 추가 컨테이너 스타일 (테마 적용 함수)
  fontSize?: number; // 필요 시 커스텀 폰트 크기
  borderThickness?: number; // 테두리 두께 (기본값: 1.0)
  teamColors?: any; // 팀별 커스텀 색상
}

/**
 * UniformNumber
 * 등번호를 350px 컨테이너 기준 완벽한 가로세로 중앙 정렬로 렌더링하는 컴포넌트
 * - 350px 고정 높이 컨테이너의 정확한 중앙에 배치
 * - 숫자 크기에 관계없이 일관된 중앙 정렬
 * - flex를 활용한 완벽한 가운데 정렬
 */
export const UniformNumber: React.FC<UniformNumberProps> = ({
  number,
  mainColor,
  outlineColor,
  style,
  fontSize = 40,
  borderThickness = 1.0,
  teamColors,
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
      {renderStrokedText({
        content: String(number),
        themed: themed,
        fontSize: fontSize,
        lineHeight: fontSize * 1.2, // 폰트 크기에 비례한 줄 높이
        numberOfLines: 1,
        borderThickness: borderThickness,
        mainColor: teamColors?.uniformNumberText || theme.colors.text,
        strokeColor: teamColors?.uniformNumberStroke || theme.colors.tint,
      })}
    </View>
  );
};

// 기본 컨테이너 스타일 (350px 컨테이너 기준 완벽한 가로세로 중앙 정렬)
const $outerContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1, // 350px 부모 영역 전체 활용
  width: "100%", // 가로 전체 너비 사용
  justifyContent: "center", // 세로 중앙 정렬
  alignItems: "center", // 가로 중앙 정렬
  // 필요 시 배경 색상 적용 가능: backgroundColor: colors.background
});

const styles = StyleSheet.create({
  number: {
    textAlign: "center",
    includeFontPadding: false, // Android 내림/올림 공백 제거
    textAlignVertical: "center",
  },
});
