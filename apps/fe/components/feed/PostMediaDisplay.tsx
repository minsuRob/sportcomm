/**
 * 게시물 미디어 표시 컴포넌트
 *
 * WebCenteredLayout과 함께 사용하여 게시물의 미디어를
 * 최적화된 형태로 표시하는 컴포넌트입니다.
 */

import React from "react";
import { View, ViewStyle } from "react-native";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import ResponsiveMediaGrid from "../media/ResponsiveMediaGrid";
import { isWeb } from "@/lib/platform";

interface MediaItem {
  id: string;
  type: "IMAGE" | "VIDEO";
  url: string;
  thumbnails: Array<{
    size: string;
    url: string;
    width: number;
    height: number;
  }>;
  width?: number;
  height?: number;
  duration?: number;
  fileSize?: number;
}

interface PostMediaDisplayProps {
  /** 게시물 ID */
  postId: string;
  /** 미디어 목록 */
  media: MediaItem[];
  /** 미디어 클릭 핸들러 */
  onMediaPress?: (media: MediaItem, index: number) => void;
  /** 컨테이너 스타일 */
  style?: ViewStyle;
}

export default function PostMediaDisplay({
  postId,
  media,
  onMediaPress,
  style,
}: PostMediaDisplayProps) {
  const { themed } = useAppTheme();

  if (!media || media.length === 0) {
    return null;
  }

  const handleMediaPress = (mediaItem: MediaItem, index: number) => {
    // 미디어 뷰어 모달 열기 또는 상세 페이지로 이동
    onMediaPress?.(mediaItem, index);
  };

  return (
    <View style={[themed($container), style]}>
      <ResponsiveMediaGrid
        media={media}
        maxItems={4}
        onMediaPress={handleMediaPress}
        onShowMore={() => {
          // 전체 미디어 보기 모달 열기
          console.log("Show all media for post:", postId);
        }}
        useRoundedCorners={isWeb()}
        spacing={isWeb() ? 8 : 4}
      />
    </View>
  );
}

// --- 스타일 정의 ---

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginVertical: spacing.sm,
  width: "100%",
});

/**
 * 게시물 카드 내에서 사용하기 위한 컴팩트 버전
 */
export function CompactPostMediaDisplay({
  postId,
  media,
  onMediaPress,
  style,
}: PostMediaDisplayProps) {
  const { themed } = useAppTheme();

  if (!media || media.length === 0) {
    return null;
  }

  // 최대 3개까지만 표시
  const displayMedia = media.slice(0, 3);

  return (
    <View style={[themed($compactContainer), style]}>
      <ResponsiveMediaGrid
        media={displayMedia}
        maxItems={3}
        onMediaPress={onMediaPress}
        onShowMore={() => {
          console.log("Show all media for post:", postId);
        }}
        useRoundedCorners={true}
        spacing={4}
      />
    </View>
  );
}

const $compactContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.xs,
  width: "100%",
});

/**
 * 미디어 미리보기 훅
 * 게시물의 미디어 데이터를 최적화된 형태로 변환
 */
export function useOptimizedMediaData(rawMedia: any[]): MediaItem[] {
  return React.useMemo(() => {
    if (!rawMedia || !Array.isArray(rawMedia)) {
      return [];
    }

    return rawMedia
      .filter((item) => item && item.status === "COMPLETED")
      .map((item) => ({
        id: item.id,
        type: item.type,
        url: item.url,
        thumbnails: item.thumbnails || [],
        width: item.width,
        height: item.height,
        duration: item.duration,
        fileSize: item.fileSize,
      }));
  }, [rawMedia]);
}

/**
 * 미디어 표시 설정 훅
 * 플랫폼에 따른 최적화된 표시 설정 반환
 */
export function useMediaDisplaySettings() {
  return React.useMemo(() => {
    const webSettings = {
      maxItems: 4,
      useRoundedCorners: true,
      spacing: 8,
      showVideoInfo: true,
      useProgressiveLoading: true,
      useLazyLoading: true,
    };

    const mobileSettings = {
      maxItems: 4,
      useRoundedCorners: true,
      spacing: 4,
      showVideoInfo: false, // 모바일에서는 공간 절약
      useProgressiveLoading: true,
      useLazyLoading: true,
    };

    return isWeb() ? webSettings : mobileSettings;
  }, []);
}
