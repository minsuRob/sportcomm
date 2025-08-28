import React, { useMemo } from "react";
import { View, Text, StyleSheet, ViewStyle, Platform } from "react-native";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";

interface ArchedTextProps {
  text: string;
  color?: string;
  style?: ThemedStyle<ViewStyle>;
}

/**
 * 아치형 텍스트 컴포넌트
 *
 * 제공된 텍스트를 아치형으로 배치하여 유니폼 스타일의 디자인을 구현합니다.
 * 텍스트 길이에 따라 동적으로 아치 반지름을 조정하며, flex 기반 유동적 레이아웃으로 렌더링합니다.
 */
export const ArchedText: React.FC<ArchedTextProps> = ({
  text,
  color,
  style,
}) => {
  const { themed, theme } = useAppTheme();

  // 아치 기본 설정 (유동적 중앙 정렬 기준)
  const ARCH_BASE_RADIUS = 100; // 기본 반지름

  // 텍스트 길이에 따른 동적 아치 계산 (글씨 겹침 방지)
  const archConfig = useMemo(() => {
    const len = text.length;

    // 1글자 예외 처리(안전장치)
    if (len <= 1) {
      return { radius: 100, arcAngle: 0, totalChars: len };
    }

    // 글자 수 클램프 (요구사항 범위 2~6)
    const clamped = Math.min(6, Math.max(2, len));

    // 반지름: 2글자 100 → 6글자 100 + 4*30 = 220
    const BASE_RADIUS = 100;
    const RADIUS_STEP = 30;
    const radius = BASE_RADIUS + (clamped - 2) * RADIUS_STEP;

    // 아치 각도: 2글자 40° → 6글자 40 + 4*9 = 76°
    const BASE_ARC = 40;
    const ARC_STEP = 9;
    const arcAngle = BASE_ARC + (clamped - 2) * ARC_STEP;

    return {
      radius,
      arcAngle,
      totalChars: len,
    };
  }, [text]);

  // 실제 아치형 텍스트의 bounding box 계산
  const archBounds = useMemo(() => {
    const { radius, arcAngle } = archConfig;
    const fontSize = 24; // 고정 폰트 크기

    // 아치의 최상단과 최하단 Y 좌표 계산
    const maxAngleRad = (arcAngle / 2) * (Math.PI / 180);
    const topY = -Math.cos(0) * radius - fontSize / 2; // 중앙 글자 상단
    const bottomY = -Math.cos(maxAngleRad) * radius + fontSize / 2; // 양끝 글자 하단

    // 실제 아치가 차지하는 높이
    const actualHeight = bottomY - topY;
    const padding = 4; // 최소 여백으로 줄임 (16 → 4)

    return {
      height: actualHeight + padding * 2,
      centerY: (actualHeight + padding * 2) / 2,
      topOffset: padding - topY, // 중앙 기준점에서 실제 렌더링 시작점까지의 오프셋
    };
  }, [archConfig]);

  // 유동적 크기 기반 최적화된 컨테이너
  const optimizedHeight = archBounds.height;
  const centerY = archBounds.centerY;



  // 각 문자별 회전 각도 계산 (CSS 로직과 동일)
  const getCharRotation = (index: number) => {
    const { arcAngle, totalChars } = archConfig;

    // totalChars가 1이면 회전 불필요 (방어 코드)
    if (totalChars <= 1) return 0;

    // (index * (arcAngle / (totalChars - 1))) - (arcAngle / 2)
    // 글자 수에 따라 arcAngle 이 동적이므로 anglePerChar 자동 보정
    const anglePerChar = arcAngle / (totalChars - 1);
    const rotation = index * anglePerChar - arcAngle / 2;

    return rotation;
  };

  // 각 문자별 스타일 계산 (유동적 중앙 기준)
  const getCharStyle = (index: number) => {
    const rotation = getCharRotation(index);
    const { radius } = archConfig;

    const angleRad = (rotation * Math.PI) / 180;
    const x = Math.sin(angleRad) * radius;
    const y = -Math.cos(angleRad) * radius;

    if (Platform.OS === "web") {
      return {
        position: "absolute" as const,
        left: "50%", // 중앙 기준
        top: centerY + y + archBounds.topOffset,
        transform: [
          { translateX: x },
          { translateY: 0 },
          { rotate: `${rotation}deg` }
        ] as any,
        marginLeft: x, // 웹에서 transform 대체
      };
    } else {
      return {
        position: "absolute" as const,
        left: "50%", // 중앙 기준
        top: centerY + y + archBounds.topOffset,
        marginLeft: x, // 중앙에서 x만큼 이동
      };
    }
  };

  // 고정 텍스트 스타일 (medium 사이즈)
  const getTextStyle = () => {
    return { fontSize: 24, fontWeight: "bold" as const };
  };

  const containerStyle = style ? themed(style) : themed($container);
  const textColor = color || theme.colors.text;

  return (
    <View
      style={[
        styles.container,
        containerStyle,
        { height: optimizedHeight }
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

// 기본 스타일 (flex 기반 유동적 레이아웃)
const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: "100%", // 부모 너비 전체 사용
  position: "relative",
  justifyContent: "center",
  alignItems: "center",
});

const styles = StyleSheet.create({
  container: {
    width: "100%", // 유동적 너비
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  char: {
    textAlign: "center",
    includeFontPadding: false,
    textAlignVertical: "center",
    position: "absolute",
  },
});
