import React, { useMemo } from "react";
import { View, Text, StyleSheet, ViewStyle, Platform } from "react-native";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";

interface ArchedTextProps {
  text: string;
  size?: "small" | "medium" | "large";
  color?: string;
  style?: ThemedStyle<ViewStyle>;
  containerWidth?: number; // 부모 컨테이너의 너비를 받는 prop 추가
  containerHeight?: number;
  onArchBoundsCalculated?: (bounds: { bottomY: number; centerX: number }) => void; // 아치 경계 정보 콜백
  topPosition?: number; // UniformNumber와 유사한 동적 위치 조정
}

/**
 * 아치형 텍스트 컴포넌트
 *
 * 제공된 텍스트를 아치형으로 배치하여 유니폼 스타일의 디자인을 구현합니다.
 * 텍스트 길이에 따라 동적으로 아치 반지름을 조정하며, 부모 컨테이너의 너비에 따라 위치를 동적 계산합니다.
 */
export const ArchedText: React.FC<ArchedTextProps> = ({
  text,
  size = "medium",
  color,
  style,
  containerWidth = 300, // 기본값 300px (기존 하드코딩값과 동일)
  containerHeight = 350,
  onArchBoundsCalculated,
  topPosition,
}) => {
  const { themed, theme } = useAppTheme();
  const containerRef = React.useRef<View>(null);

  // 컨테이너 중앙 좌표 동적 계산
  const centerX = containerWidth / 2;
  const centerY = (containerHeight ?? containerWidth) / 2; // 정사각형 컨테이너 가정

  // 텍스트 길이에 따른 동적 아치 계산 (글씨 겹침 방지)
  const archConfig = useMemo(() => {
    const BASE_CHARS = 3; // 김택연 3글자를 기준
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

  // 아치의 최하단 위치 계산 및 콜백 호출
  React.useEffect(() => {
    if (onArchBoundsCalculated && containerRef.current) {
      const { radius, arcAngle } = archConfig;

      // 실제 아치형 글자의 최하단 위치 계산
      // 아치의 중심에서 가장 아래쪽 글자까지의 실제 거리
      const maxAngleRad = (arcAngle / 2) * (Math.PI / 180); // 최대 각도를 라디안으로 변환
      const actualBottomOffset = Math.cos(maxAngleRad) * radius; // 실제 아래쪽 거리

      // 텍스트 높이 고려 (폰트 크기에 따른 글자 높이)
      const fontSize = size === "small" ? 20 : size === "large" ? 28 : 24;
      const textHeight = fontSize * 1.2; // 줄 높이 고려

      // 김택연 글자 최하단에서 50px 아래로 계산
      const actualBottomY = centerY - actualBottomOffset + textHeight + 50;

      onArchBoundsCalculated({
        bottomY: actualBottomY,
        centerX,
      });
    }
  }, [archConfig, centerX, centerY, onArchBoundsCalculated, size]);

  // 각 문자별 회전 각도 계산 (CSS 로직과 동일)
  const getCharRotation = (index: number) => {
    const { arcAngle, totalChars } = archConfig;

    // CSS의 calc() 로직과 동일:
    // (index * (arcAngle / (totalChars - 1))) - (arcAngle / 2)
    const anglePerChar = arcAngle / (totalChars - 1);
    const rotation = index * anglePerChar - arcAngle / 2;

    return rotation;
  };

  // 각 문자별 스타일 계산 (플랫폼별 처리)
  const getCharStyle = (index: number) => {
    const rotation = getCharRotation(index);
    const { radius } = archConfig;


    if (Platform.OS === "web") {
      // 웹에서는 test.html과 동일한 방식으로 위치 계산
      const angleRad = (rotation * Math.PI) / 180;
      const x = Math.sin(angleRad) * radius;
      const y = -Math.cos(angleRad) * radius;

      return {
        position: "absolute" as const,
        left: centerX + x, // 동적 계산된 중앙 좌표 + 각도별 x 오프셋
        top: centerY + y, // 동적 계산된 중앙 좌표 + 각도별 y 오프셋
        transform: [{ rotate: `${rotation}deg` }] as any,
      };
    } else {
      // 모바일에서는 position 기반 계산
      const angleRad = (rotation * Math.PI) / 180;
      const x = Math.sin(angleRad) * radius;
      const y = -Math.cos(angleRad) * radius;

      return {
        position: "absolute" as const,
        left: centerX + x, // 동적 계산된 중앙 좌표 + 각도별 x 오프셋
        top: centerY + y, // 동적 계산된 중앙 좌표 + 각도별 y 오프셋
      };
    }
  };

  // 크기별 텍스트 스타일 결정
  const getTextStyle = () => {
    switch (size) {
      case "small":
        return { fontSize: 20, fontWeight: "bold" as const };
      case "large":
        return { fontSize: 28, fontWeight: "bold" as const };
      default:
        return { fontSize: 24, fontWeight: "bold" as const };
    }
  };

  const containerStyle = style ? themed(style) : themed($container);
  const textColor = color || theme.colors.text;

  // UniformNumber와 동일한 중앙 정렬 방식
  const dynamicPositionStyle = React.useMemo(() => {
    if (topPosition !== undefined && containerWidth) {
      return {
        position: "absolute" as const,
        top: topPosition - 130, // UniformNumber 위 50px
        left: 0,
        right: 0,
        alignItems: "center" as const,
        justifyContent: "center" as const,
      };
    }
    return {
      position: "absolute" as const,
      top: 0,
      left: 0,
      right: 0,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    };
  }, [topPosition, containerWidth]);

  return (
    <View
      ref={containerRef}
      style={[
        styles.container,
        containerStyle,
        dynamicPositionStyle,
        { width: containerWidth, height: containerHeight }
      ]}
    >
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
  // width, height는 props로 동적 설정되므로 제거
  // position과 위치는 dynamicPositionStyle에서 처리
  justifyContent: "center",
  alignItems: "center",
});

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    // width, height는 props로 동적 설정
    // position은 dynamicPositionStyle에서 처리
  },
  char: {
    textAlign: "center",
    includeFontPadding: false,
    textAlignVertical: "center",
    position: "absolute",
  },
});
