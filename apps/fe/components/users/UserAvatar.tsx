import React, { useState } from "react";
import { View, ViewStyle } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";

export interface UserAvatarProps {
  imageUrl?: string | null;
  name?: string;
  size?: number; // 지름(px)
  style?: ViewStyle;
}

/**
 * 사용자 프로필 아바타 공통 컴포넌트
 * - 이미지가 없거나 로딩 실패 시 아이콘으로 대체합니다.
 * - 원형, 테두리 및 배경 톤은 테마를 따릅니다.
 */
export default function UserAvatar({
  imageUrl,
  name,
  size = 28,
  style,
}: UserAvatarProps) {
  const { themed, theme } = useAppTheme();
  const [loadFailed, setLoadFailed] = useState(false);

  /**
   * 아바타 URL 정규화
   * - 과거 post-images 버킷 경로를 avatars 버킷 경로로 치환
   * - null/undefined 안전 처리
   */
  const normalizeAvatarUrl = (url?: string | null) =>
    url && url.includes("/post-images/")
      ? url.replace("/post-images/", "/avatars/")
      : url || undefined;

  const normalizedUrl = normalizeAvatarUrl(imageUrl);

  // 표시 가능한 유효 URL 없거나 로딩 실패 시 fallback 아이콘 사용
  const showFallback = !normalizedUrl || loadFailed;

  return (
    <View
      style={[
        themed($container),
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    >
      <View
        style={[
          themed($circle),
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      >
        {showFallback ? (
          <Ionicons
            name="person"
            size={Math.max(16, Math.floor(size * 0.6))}
            color={theme.colors.textDim}
          />
        ) : (
          <Image
            // 정규화된 URL 사용
            source={{ uri: normalizedUrl! }}
            style={{ width: size, height: size, borderRadius: size / 2 }}
            onError={() => setLoadFailed(true)}
            contentFit="cover"
            transition={150}
            accessibilityLabel={name ? `${name}의 프로필 사진` : "프로필 사진"}
          />
        )}
      </View>
    </View>
  );
}

const $container: ThemedStyle<ViewStyle> = () => ({
  justifyContent: "center",
  alignItems: "center",
});

const $circle: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.backgroundAlt,
  borderWidth: 1,
  borderColor: colors.border,
  justifyContent: "center",
  alignItems: "center",
  overflow: "hidden",
});
