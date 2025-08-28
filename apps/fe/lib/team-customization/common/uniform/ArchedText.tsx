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

    // 반지름: 2글자 140 → 6글자 140 + 4*40 = 300 (글자 간격 확보용)
    const BASE_RADIUS = 140;
    const RADIUS_STEP = 40;
    const radius = BASE_RADIUS + (clamped - 2) * RADIUS_STEP;

    // 아치 각도: 2글자 40° → 6글자 40 + 4*9 = 76° (자연스러운 아치 유지)
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

  // 각 문자별 스타일 계산 (absolute position 기반 아치형)
  const getCharStyle = (index: number) => {
    const rotation = getCharRotation(index);
    const { radius } = archConfig;

    const angleRad = (rotation * Math.PI) / 180;
    const x = Math.sin(angleRad) * radius;
    const y = -Math.cos(angleRad) * radius;

    // 글자 간격 추가 확보를 위한 x좌표 오프셋 계산
    const { totalChars } = archConfig;
    const centerIndex = (totalChars - 1) / 2; // 중앙 글자 index
    const offsetFromCenter = index - centerIndex; // 중앙에서의 거리
    const additionalSpacing = offsetFromCenter * 50; // 10px씩 추가 간격

    // 컨테이너 중앙 기준 계산 (영역 내 배치)
    const centerX = optimizedHeight / 2;
    const centerY = optimizedHeight / 2;

    // 아치를 컨테이너 크기에 맞게 스케일링 (글자 간격 보장)
    const scale = Math.max(0.3, optimizedHeight / (radius * 3)); // 최소 스케일 0.3 보장
    const scaledX = (x + additionalSpacing) * scale; // 추가 간격 포함한 x좌표
    const scaledY = y * scale;

    if (Platform.OS === "web") {
      return {
        position: "absolute" as const,
        left: centerX + scaledX ,
        top: centerY + scaledY,
        transform: [{ rotate: `${rotation}deg` }] as any,
      };
    } else {
      return {
        position: "absolute" as const,
        left: centerX + scaledX,
        top: centerY + scaledY,
        transform: [{ rotate: `${rotation}deg` }] as any,
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
        {
          height: optimizedHeight,
          width: optimizedHeight, // 정사각형 컨테이너로 설정
        }
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

// 기본 스타일 (정상적인 아치형 배치)
const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: "relative",
  justifyContent: "center",
  alignItems: "center",
  alignSelf: "center", // 자체 중앙 정렬
});

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  char: {
    textAlign: "center",
    includeFontPadding: false, // Android 내림/올림 공백 제거
    textAlignVertical: "center",
    position: "absolute",
  },
});
