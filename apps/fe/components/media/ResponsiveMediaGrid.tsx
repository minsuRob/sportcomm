/**
 * 반응형 미디어 그리드 컴포넌트
 *
 * WebCenteredLayout과 함께 사용하여 PC와 모바일에서
 * 최적화된 미디어 표시를 제공하는 컴포넌트입니다.
 */

import React, { useState, useEffect } from "react";
import { View, Dimensions, ViewStyle } from "react-native";
import { isWeb } from "@/lib/platform";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import OptimizedImage from "./OptimizedImage";
import VideoThumbnail from "./VideoThumbnail";

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

interface ResponsiveMediaGridProps {
  /** 미디어 아이템 목록 */
  media: MediaItem[];
  /** 최대 표시할 미디어 개수 */
  maxItems?: number;
  /** 미디어 클릭 핸들러 */
  onMediaPress?: (media: MediaItem, index: number) => void;
  /** 더보기 클릭 핸들러 */
  onShowMore?: () => void;
  /** 컨테이너 스타일 */
  style?: ViewStyle;
  /** 라운드 코너 사용 여부 */
  useRoundedCorners?: boolean;
  /** 간격 크기 */
  spacing?: number;
}

/**
 * 미디어 개수에 따른 레이아웃 계산
 */
function calculateLayout(
  mediaCount: number,
  containerWidth: number,
  spacing: number
) {
  const isWebEnvironment = isWeb();
  const { width: screenWidth } = Dimensions.get("window");

  // 웹에서는 더 큰 이미지, 모바일에서는 작은 이미지
  const baseSize = isWebEnvironment
    ? Math.min(containerWidth, 600)
    : Math.min(containerWidth, screenWidth - 32);

  switch (mediaCount) {
    case 1:
      // 단일 미디어: 전체 너비 사용
      return {
        layout: "single",
        items: [
          {
            width: baseSize,
            height: isWebEnvironment ? baseSize * 0.6 : baseSize * 0.75,
            aspectRatio: isWebEnvironment ? 5 / 3 : 4 / 3,
          },
        ],
      };

    case 2:
      // 2개 미디어: 나란히 배치
      const twoItemWidth = (baseSize - spacing) / 2;
      return {
        layout: "double",
        items: [
          {
            width: twoItemWidth,
            height: twoItemWidth,
            aspectRatio: 1,
          },
          {
            width: twoItemWidth,
            height: twoItemWidth,
            aspectRatio: 1,
          },
        ],
      };

    case 3:
      // 3개 미디어: 1개 큰 이미지 + 2개 작은 이미지
      const threeMainWidth = (baseSize - spacing) * 0.6;
      const threeSideWidth = (baseSize - spacing) * 0.4;
      const threeSideHeight = (threeMainWidth - spacing) / 2;

      return {
        layout: "triple",
        items: [
          {
            width: threeMainWidth,
            height: threeMainWidth,
            aspectRatio: 1,
          },
          {
            width: threeSideWidth,
            height: threeSideHeight,
            aspectRatio: threeSideWidth / threeSideHeight,
          },
          {
            width: threeSideWidth,
            height: threeSideHeight,
            aspectRatio: threeSideWidth / threeSideHeight,
          },
        ],
      };

    default:
      // 4개 이상: 2x2 그리드
      const gridItemWidth = (baseSize - spacing) / 2;
      return {
        layout: "grid",
        items: Array(Math.min(mediaCount, 4)).fill({
          width: gridItemWidth,
          height: gridItemWidth,
          aspectRatio: 1,
        }),
      };
  }
}

export default function ResponsiveMediaGrid({
  media,
  maxItems = 4,
  onMediaPress,
  onShowMore,
  style,
  useRoundedCorners = true,
  spacing = 8,
}: ResponsiveMediaGridProps) {
  const { themed } = useAppTheme();
  const [containerWidth, setContainerWidth] = useState(300);

  const displayMedia = media.slice(0, maxItems);
  const hasMore = media.length > maxItems;
  const layout = calculateLayout(displayMedia.length, containerWidth, spacing);

  const handleContainerLayout = (event: any) => {
    const { width } = event.nativeEvent.layout;
    setContainerWidth(width);
  };

  const renderMediaItem = (item: MediaItem, index: number, itemLayout: any) => {
    const itemStyle = {
      width: itemLayout.width,
      height: itemLayout.height,
      borderRadius: useRoundedCorners ? 8 : 0,
    };

    const handlePress = () => {
      onMediaPress?.(item, index);
    };

    if (item.type === "VIDEO") {
      return (
        <VideoThumbnail
          key={item.id}
          mediaId={item.id}
          thumbnails={item.thumbnails}
          videoUrl={item.url}
          duration={item.duration}
          fileSize={item.fileSize}
          style={itemStyle}
          onPlay={handlePress}
          showVideoInfo={itemLayout.width > 150}
        />
      );
    }

    return (
      <OptimizedImage
        key={item.id}
        mediaId={item.id}
        thumbnails={item.thumbnails}
        originalUrl={item.url}
        style={itemStyle}
        containerStyle={itemStyle}
        useProgressiveLoading={true}
        useLazyLoading={true}
        onLoad={() => {}}
        onError={() => {}}
      />
    );
  };

  const renderLayout = () => {
    switch (layout.layout) {
      case "single":
        return (
          <View style={themed($singleContainer)}>
            {renderMediaItem(displayMedia[0], 0, layout.items[0])}
          </View>
        );

      case "double":
        return (
          <View style={[themed($doubleContainer), { gap: spacing }]}>
            {displayMedia.map((item, index) =>
              renderMediaItem(item, index, layout.items[index])
            )}
          </View>
        );

      case "triple":
        return (
          <View style={[themed($tripleContainer), { gap: spacing }]}>
            <View style={themed($tripleMain)}>
              {renderMediaItem(displayMedia[0], 0, layout.items[0])}
            </View>
            <View style={[themed($tripleSide), { gap: spacing }]}>
              {displayMedia
                .slice(1)
                .map((item, index) =>
                  renderMediaItem(item, index + 1, layout.items[index + 1])
                )}
            </View>
          </View>
        );

      case "grid":
      default:
        return (
          <View style={[themed($gridContainer), { gap: spacing }]}>
            {displayMedia.map((item, index) => (
              <View
                key={item.id}
                style={[
                  themed($gridItem),
                  index === 3 && hasMore && themed($gridItemWithOverlay),
                ]}
              >
                {renderMediaItem(item, index, layout.items[index])}

                {/* 더보기 오버레이 (4번째 아이템에만) */}
                {index === 3 && hasMore && (
                  <View style={themed($moreOverlay)}>
                    <Text style={themed($moreText)}>
                      +{media.length - maxItems}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        );
    }
  };

  return (
    <View style={[themed($container), style]} onLayout={handleContainerLayout}>
      {renderLayout()}
    </View>
  );
}

// --- 스타일 정의 ---

const $container: ThemedStyle<ViewStyle> = () => ({
  width: "100%",
});

const $singleContainer: ThemedStyle<ViewStyle> = () => ({
  width: "100%",
  alignItems: "center",
});

const $doubleContainer: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  width: "100%",
});

const $tripleContainer: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  width: "100%",
});

const $tripleMain: ThemedStyle<ViewStyle> = () => ({
  flex: 0.6,
});

const $tripleSide: ThemedStyle<ViewStyle> = () => ({
  flex: 0.4,
  flexDirection: "column",
});

const $gridContainer: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  flexWrap: "wrap",
  width: "100%",
});

const $gridItem: ThemedStyle<ViewStyle> = () => ({
  position: "relative",
});

const $gridItemWithOverlay: ThemedStyle<ViewStyle> = () => ({
  overflow: "hidden",
});

const $moreOverlay: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0, 0, 0, 0.6)",
  justifyContent: "center",
  alignItems: "center",
  borderRadius: 8,
});

const $moreText: ThemedStyle<any> = () => ({
  color: "white",
  fontSize: 24,
  fontWeight: "bold",
});

/**
 * WebCenteredLayout과 함께 사용하기 위한 래퍼 컴포넌트
 */
export function WebOptimizedMediaGrid(props: ResponsiveMediaGridProps) {
  const { themed } = useAppTheme();

  return (
    <View style={themed($webWrapper)}>
      <ResponsiveMediaGrid {...props} />
    </View>
  );
}

const $webWrapper: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  width: "100%",
  paddingHorizontal: isWeb() ? 0 : spacing.md,
  marginBottom: spacing.sm,
});
