import React from "react";
import { View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";

interface SafeAreaWrapperProps {
  children: React.ReactNode;
  edges?: ("top" | "bottom" | "left" | "right")[];
  style?: ViewStyle;
  backgroundColor?: string;
}

/**
 * SafeAreaWrapper 컴포넌트
 *
 * 안전 영역(Safe Area)을 고려한 래퍼 컴포넌트입니다.
 * 노치, 상태바, 홈 인디케이터 등을 피해서 콘텐츠를 배치합니다.
 *
 * @param children - 래핑할 자식 컴포넌트들
 * @param edges - 적용할 안전 영역 가장자리 (기본값: ["top", "bottom"])
 * @param style - 추가 스타일
 * @param backgroundColor - 배경색 (테마 색상 오버라이드)
 */
export default function SafeAreaWrapper({
  children,
  edges = ["top", "bottom"],
  style,
  backgroundColor,
}: SafeAreaWrapperProps) {
  const { themed } = useAppTheme();
  const insets = useSafeAreaInsets();

  // 선택된 가장자리에 대해서만 패딩 적용
  const paddingStyle = {
    paddingTop: edges.includes("top") ? insets.top : 0,
    paddingBottom: edges.includes("bottom") ? insets.bottom : 0,
    paddingLeft: edges.includes("left") ? insets.left : 0,
    paddingRight: edges.includes("right") ? insets.right : 0,
  };

  return (
    <View
      style={[
        themed($container),
        paddingStyle,
        backgroundColor && { backgroundColor },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// --- 스타일 정의 ---
const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
});
