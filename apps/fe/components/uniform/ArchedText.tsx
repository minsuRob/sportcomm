import React, { useMemo } from "react";
import { View, Text, StyleSheet, ViewStyle, Platform } from "react-native";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";

interface ArchedTextProps {
  text: string;
  size?: "small" | "medium" | "large";
  color?: string;
  style?: ThemedStyle<ViewStyle>;
}

/**
 * 아치형 텍스트 컴포넌트
 *
 * 제공된 텍스트를 아치형으로 배치하여 유니폼 스타일의 디자인을 구현합니다.
 * 텍스트 길이에 따라 동적으로 아치 반지름을 조정합니다.
 */
export const ArchedText: React.FC<ArchedTextProps> = ({
  text,
  size = "medium",
  color,
  style,
}) => {
  const { themed, theme } = useAppTheme();

  // 텍스트 길이에 따른 동적 아치 계산 (글씨 겹침 방지)
  const archConfig = useMemo(() => {
    const BASE_CHARS = 3; // 김택연 3글자를 기준
    const BASE_RADIUS = size === "small" ? 120 : size === "large" ? 180 : 150;
    const BASE_RADIUS = size === "small" ? 80 : size === "large" ? 120 : 100;
    const RADIUS_PER_CHAR = size === "small" ? 30 : size === "large" ? 45 : 35;

    const extraChars = text.length - BASE_CHARS;
    const dynamicRadius = BASE_RADIUS + extraChars * RADIUS_PER_CHAR;

    // 아치 각도 계산 (더 넓은 아치로 글씨 분산)
    const arcAngle = 60; // 45도에서 60도로 증가하여 더 넓은 아치

    if (__DEV__) {
      console.log(
        `Arch config: radius=${dynamicRadius}, arcAngle=${arcAngle}, chars=${text.length}`
      );
    }

    return {
      radius: dynamicRadius,
      arcAngle,
      totalChars: text.length,
    };
  }, [text, size]);

  // 각 문자별 회전 각도 계산 (CSS 로직과 동일)
  const getCharRotation = (index: number) => {
    const { arcAngle, totalChars } = archConfig;

    // CSS의 calc() 로직과 동일:
    // (index * (arcAngle / (totalChars - 1))) - (arcAngle / 2)
    const anglePerChar = arcAngle / (totalChars - 1);
    const rotation = index * anglePerChar - arcAngle / 2;

    if (__DEV__) {
      console.log(
        `Char ${index} rotation: ${rotation}° (anglePerChar: ${anglePerChar}, arcAngle: ${arcAngle})`
      );
    }

    return rotation;
  };

  // 각 문자별 스타일 계산 (플랫폼별 처리)
  const getCharStyle = (index: number) => {
    const rotation = getCharRotation(index);
    const { radius } = archConfig;

    // 디버깅 로그
    if (__DEV__) {
      console.log(
        `Char ${index}: rotation=${rotation}°, radius=${radius}, platform=${Platform.OS}`
      );
    }

    if (Platform.OS === "web") {
      // 웹에서는 test.html과 동일한 방식으로 위치 계산
      const angleRad = (rotation * Math.PI) / 180;
      const x = Math.sin(angleRad) * radius;
      const y = -Math.cos(angleRad) * radius;

      return {
        position: "absolute" as const,
        left: 150 + x, // 컨테이너 중앙 (400/2) + 각도별 x 오프셋
        top: 150 + y, // 컨테이너 중앙 (400/2) + 각도별 y 오프셋
        transform: [{ rotate: `${rotation}deg` }] as any,
      };
    } else {
      // 모바일에서는 position 기반 계산
      const angleRad = (rotation * Math.PI) / 180;
      const x = Math.sin(angleRad) * radius;
      const y = -Math.cos(angleRad) * radius;

      return {
        position: "absolute" as const,
        left: 150 + x, // 컨테이너 중앙 (300/2) + 각도별 x 오프셋
        top: 150 + y, // 컨테이너 중앙 (300/2) + 각도별 y 오프셋
      };
    }
  };

  // 크기별 텍스트 스타일 결정
  const getTextStyle = () => {
    switch (size) {
      case "small":
        return { fontSize: 16, fontWeight: "bold" as const };
        return { fontSize: 20, fontWeight: "bold" as const };
      case "large":
        return { fontSize: 24, fontWeight: "bold" as const };
        return { fontSize: 28, fontWeight: "bold" as const };
      default:
        return { fontSize: 20, fontWeight: "bold" as const };
        return { fontSize: 24, fontWeight: "bold" as const };
    }
  };

  const containerStyle = style ? themed(style) : themed($container);
  const textColor = color || theme.colors.text;

  return (
    <View style={[styles.container, containerStyle]}>
      {text.split("").map((char, index) => (
        <Text
          key={`${char}-${index}`}
          style={[
            styles.char,
            getTextStyle(),
            getCharStyle(index),
            { color: textColor },
            // 웹에서 transform이 작동하지 않을 경우를 위한 CSS 스타일
            Platform.OS === "web" &&
              ({
                transform: `rotate(${getCharRotation(index)}deg)`,
              } as any),
          ]}
        >
          {char}
        </Text>
      ))}
    </View>
  );
};

// 기본 스타일
const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 300, // 반지름 증가에 맞춰 너비 확장
  height: 300, // 반지름 증가에 맞춰 높이 확장
  justifyContent: "center",
  alignItems: "center",
  position: "relative",
});

const styles = StyleSheet.create({
  container: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    width: 300,
    height: 300,
  },
  char: {
    textAlign: "center",
    includeFontPadding: false,
    textAlignVertical: "center",
    position: "absolute",
  },
});
