/**
 * 동영상 썸네일 컴포넌트
 *
 * 동영상의 썸네일을 표시하고 재생 버튼을 오버레이로 제공하는 컴포넌트입니다.
 */

import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import OptimizedImage from "./OptimizedImage";
import { formatFileSize } from "@/lib/utils/file-utils";

interface ThumbnailData {
  size: string;
  url: string;
  width: number;
  height: number;
}

interface VideoThumbnailProps {
  /** 미디어 ID */
  mediaId: string;
  /** 사용 가능한 썸네일 목록 */
  thumbnails: ThumbnailData[];
  /** 동영상 URL */
  videoUrl: string;
  /** 동영상 길이 (초) */
  duration?: number;
  /** 파일 크기 (바이트) */
  fileSize?: number;
  /** 컨테이너 스타일 */
  style?: ViewStyle;
  /** 재생 버튼 클릭 핸들러 */
  onPlay?: () => void;
  /** 썸네일 클릭 핸들러 */
  onThumbnailPress?: () => void;
  /** 접근성 라벨 */
  accessibilityLabel?: string;
  /** 재생 버튼 표시 여부 */
  showPlayButton?: boolean;
  /** 동영상 정보 표시 여부 */
  showVideoInfo?: boolean;
}

/**
 * 초를 MM:SS 형식으로 변환
 */
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export default function VideoThumbnail({
  mediaId,
  thumbnails,
  videoUrl,
  duration,
  fileSize,
  style,
  onPlay,
  onThumbnailPress,
  accessibilityLabel,
  showPlayButton = true,
  showVideoInfo = true,
}: VideoThumbnailProps) {
  const { themed, theme } = useAppTheme();
  const [isPressed, setIsPressed] = useState(false);

  const handlePress = () => {
    if (onPlay) {
      onPlay();
    } else if (onThumbnailPress) {
      onThumbnailPress();
    }
  };

  const handlePressIn = () => setIsPressed(true);
  const handlePressOut = () => setIsPressed(false);

  return (
    <TouchableOpacity
      style={[themed($container), style]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
      accessibilityLabel={accessibilityLabel || "동영상 재생"}
      accessibilityRole="button"
    >
      {/* 썸네일 이미지 */}
      <OptimizedImage
        mediaId={mediaId}
        thumbnails={thumbnails}
        originalUrl={videoUrl}
        style={themed($thumbnail)}
        useProgressiveLoading={true}
        useLazyLoading={true}
      />

      {/* 어두운 오버레이 */}
      <View style={[themed($overlay), isPressed && themed($overlayPressed)]} />

      {/* 재생 버튼 */}
      {showPlayButton && (
        <View style={themed($playButtonContainer)}>
          <View style={themed($playButton)}>
            <Ionicons
              name="play"
              size={24}
              color="white"
              style={themed($playIcon)}
            />
          </View>
        </View>
      )}

      {/* 동영상 정보 */}
      {showVideoInfo && (
        <View style={themed($infoContainer)}>
          {/* 재생 시간 */}
          {duration && (
            <View style={themed($durationBadge)}>
              <Text style={themed($durationText)}>
                {formatDuration(duration)}
              </Text>
            </View>
          )}

          {/* 파일 크기 */}
          {fileSize && (
            <View style={themed($fileSizeBadge)}>
              <Text style={themed($fileSizeText)}>
                {formatFileSize(fileSize)}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* 동영상 아이콘 (우상단) */}
      <View style={themed($videoIconContainer)}>
        <Ionicons
          name="videocam"
          size={16}
          color="white"
          style={themed($videoIcon)}
        />
      </View>
    </TouchableOpacity>
  );
}

// --- 스타일 정의 ---

const $container: ThemedStyle<ViewStyle> = () => ({
  position: "relative",
  overflow: "hidden",
  borderRadius: 8,
});

const $thumbnail: ThemedStyle<ViewStyle> = () => ({
  width: "100%",
  height: "100%",
});

const $overlay: ThemedStyle<ViewStyle> = () => ({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0, 0, 0, 0.3)",
});

const $overlayPressed: ThemedStyle<ViewStyle> = () => ({
  backgroundColor: "rgba(0, 0, 0, 0.5)",
});

const $playButtonContainer: ThemedStyle<ViewStyle> = () => ({
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: [{ translateX: -30 }, { translateY: -30 }],
});

const $playButton: ThemedStyle<ViewStyle> = () => ({
  width: 60,
  height: 60,
  borderRadius: 30,
  backgroundColor: "rgba(255, 255, 255, 0.9)",
  justifyContent: "center",
  alignItems: "center",
  shadowColor: "#000",
  shadowOffset: {
    width: 0,
    height: 2,
  },
  shadowOpacity: 0.25,
  shadowRadius: 3.84,
  elevation: 5,
});

const $playIcon: ThemedStyle<any> = () => ({
  marginLeft: 3, // 시각적 중앙 정렬을 위한 미세 조정
  color: "#333",
});

const $infoContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  position: "absolute",
  bottom: spacing.xs,
  left: spacing.xs,
  right: spacing.xs,
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-end",
});

const $durationBadge: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  backgroundColor: "rgba(0, 0, 0, 0.7)",
  paddingHorizontal: spacing.xs,
  paddingVertical: spacing.xxxs,
  borderRadius: 4,
});

const $durationText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 12,
  fontWeight: "600",
});

const $fileSizeBadge: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  backgroundColor: "rgba(0, 0, 0, 0.7)",
  paddingHorizontal: spacing.xs,
  paddingVertical: spacing.xxxs,
  borderRadius: 4,
});

const $fileSizeText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 10,
  fontWeight: "500",
});

const $videoIconContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  position: "absolute",
  top: spacing.xs,
  right: spacing.xs,
});

const $videoIcon: ThemedStyle<any> = () => ({
  color: "white",
  textShadowColor: "rgba(0, 0, 0, 0.5)",
  textShadowOffset: { width: 1, height: 1 },
  textShadowRadius: 2,
});

/**
 * 동영상 썸네일 그리드용 컴포넌트
 */
export function VideoThumbnailGrid({
  videos,
  onVideoPress,
  numColumns = 2,
}: {
  videos: Array<{
    mediaId: string;
    thumbnails: ThumbnailData[];
    videoUrl: string;
    duration?: number;
    fileSize?: number;
  }>;
  onVideoPress: (video: any) => void;
  numColumns?: number;
}) {
  const { themed } = useAppTheme();

  return (
    <View style={themed($gridContainer)}>
      {videos.map((video, index) => (
        <View
          key={video.mediaId}
          style={[themed($gridItem), { width: `${100 / numColumns}%` }]}
        >
          <VideoThumbnail
            mediaId={video.mediaId}
            thumbnails={video.thumbnails}
            videoUrl={video.videoUrl}
            duration={video.duration}
            fileSize={video.fileSize}
            onPlay={() => onVideoPress(video)}
            style={themed($gridThumbnail)}
          />
        </View>
      ))}
    </View>
  );
}

const $gridContainer: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  flexWrap: "wrap",
});

const $gridItem: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.xs / 2,
});

const $gridThumbnail: ThemedStyle<ViewStyle> = () => ({
  aspectRatio: 16 / 9,
  minHeight: 120,
});
