import React, { useState } from "react";
import { View, Text, ViewStyle, TextStyle } from "react-native";
import { Image } from "expo-image";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";

interface TeamLogoProps {
  logoUrl?: string;
  fallbackIcon?: string;
  teamName: string;
  size?: number;
  style?: ViewStyle;
}

/**
 * 팀 로고 컴포넌트
 * webp 이미지를 표시하고, 로딩 실패 시 fallback 아이콘을 표시합니다.
 */
export default function TeamLogo({
  logoUrl,
  fallbackIcon = "🏆",
  teamName,
  size = 32,
  style,
}: TeamLogoProps) {
  const { themed } = useAppTheme();
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // 이미지 URL이 없거나 로딩 실패한 경우 fallback 아이콘 표시
  if (!logoUrl || imageError) {
    return (
      <View style={[themed($container), { width: size, height: size }, style]}>
        <Text style={[themed($fallbackIcon), { fontSize: size * 0.7 }]}>
          {fallbackIcon}
        </Text>
      </View>
    );
  }

  return (
    <View style={[themed($container), { width: size, height: size }, style]}>
      {imageLoading && (
        <View style={themed($loadingContainer)}>
          <Text style={[themed($fallbackIcon), { fontSize: size * 0.7 }]}>
            {fallbackIcon}
          </Text>
        </View>
      )}
      <Image
        source={{ uri: logoUrl }}
        style={[
          themed($image),
          {
            width: size,
            height: size,
            opacity: imageLoading ? 0 : 1,
          },
        ]}
        onLoad={() => setImageLoading(false)}
        onError={() => {
          setImageError(true);
          setImageLoading(false);
        }}
        contentFit="contain"
        transition={200}
        accessibilityLabel={`${teamName} 로고`}
      />
    </View>
  );
}

// --- 스타일 정의 ---
const $container: ThemedStyle<ViewStyle> = () => ({
  justifyContent: "center",
  alignItems: "center",
  position: "relative",
});

const $image: ThemedStyle<ViewStyle> = () => ({
  position: "absolute",
});

const $loadingContainer: ThemedStyle<ViewStyle> = () => ({
  justifyContent: "center",
  alignItems: "center",
  position: "absolute",
  width: "100%",
  height: "100%",
});

const $fallbackIcon: ThemedStyle<TextStyle> = () => ({
  textAlign: "center",
});
