import React from "react";
import {
  View,
  Image,
  ScrollView,
  TouchableOpacity,
  Text,
  ViewStyle,
  ImageStyle,
  TextStyle,
} from "react-native";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
export interface Media {
  id: string;
  url: string;
  type: "IMAGE" | "VIDEO" | "image" | "video"; // 서버와 클라이언트 타입 모두 지원
}

interface PostMediaProps {
  media: Media[];
  onPress?: () => void;
  variant?: "feed" | "detail";
}

/**
 * 게시물 미디어 공통 컴포넌트
 * 피드와 상세 페이지에서 다른 레이아웃으로 미디어를 표시
 */
export default function PostMedia({
  media,
  onPress,
  variant = "feed",
}: PostMediaProps) {
  const { themed } = useAppTheme();

  const imageMedia = media.filter(
    (item) => item.type === "image" || item.type === "IMAGE",
  );
  const imageCount = imageMedia.length;

  if (imageCount === 0) {
    console.log("이미지가 없어서 null 반환");
    return null;
  }

  // URL 변환 함수 (localhost를 환경변수 URL로 변경)
  const transformImageUrl = (url: string) => {
    if (url.startsWith("http://localhost:3000")) {
      const apiUrl = "http://localhost:3000";
      return url.replace("http://localhost:3000", apiUrl);
    }
    return url;
  };

  /**
   * 피드용 미디어 그리드 렌더링 (더보기 표시 포함)
   */
  const renderFeedMediaGrid = () => {
    if (imageCount === 1) {
      return (
        <Image
          source={{ uri: transformImageUrl(imageMedia[0].url) }}
          style={themed($feedMediaImage)}
          resizeMode="cover"
        />
      );
    }

    if (imageCount === 2) {
      return (
        <View style={themed($feedMediaGrid)}>
          <Image
            source={{ uri: transformImageUrl(imageMedia[0].url) }}
            style={themed($feedMediaImageHalf)}
            resizeMode="cover"
          />
          <Image
            source={{ uri: transformImageUrl(imageMedia[1].url) }}
            style={themed($feedMediaImageHalf)}
            resizeMode="cover"
          />
        </View>
      );
    }

    if (imageCount === 3) {
      return (
        <View style={themed($feedMediaGrid)}>
          <Image
            source={{ uri: transformImageUrl(imageMedia[0].url) }}
            style={themed($feedMediaImageHalf)}
            resizeMode="cover"
          />
          <View style={themed($feedMediaRightColumn)}>
            <Image
              source={{ uri: transformImageUrl(imageMedia[1].url) }}
              style={themed($feedMediaImageQuarter)}
              resizeMode="cover"
            />
            <Image
              source={{ uri: transformImageUrl(imageMedia[2].url) }}
              style={themed($feedMediaImageQuarter)}
              resizeMode="cover"
            />
          </View>
        </View>
      );
    }

    // 4개 이상 이미지 - 2x2 그리드 + 더보기 표시
    return (
      <View style={themed($feedMediaGrid)}>
        <View style={themed($feedMediaRow)}>
          <Image
            source={{ uri: transformImageUrl(imageMedia[0].url) }}
            style={themed($feedMediaImageQuarter)}
            resizeMode="cover"
          />
          <Image
            source={{ uri: transformImageUrl(imageMedia[1].url) }}
            style={themed($feedMediaImageQuarter)}
            resizeMode="cover"
          />
        </View>
        <View style={themed($feedMediaRow)}>
          <Image
            source={{ uri: transformImageUrl(imageMedia[2].url) }}
            style={themed($feedMediaImageQuarter)}
            resizeMode="cover"
          />
          <View style={themed($feedMediaImageQuarter)}>
            <Image
              source={{ uri: transformImageUrl(imageMedia[3].url) }}
              style={themed($feedMediaImageQuarter)}
              resizeMode="cover"
            />
            {imageCount > 4 && (
              <View style={themed($moreImagesOverlay)}>
                <Text style={themed($moreImagesText)}>+{imageCount - 4}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  /**
   * 상세 페이지용 미디어 렌더링 (스크롤 가능)
   */
  const renderDetailMedia = () => {
    if (imageCount === 1) {
      return (
        <Image
          source={{ uri: transformImageUrl(imageMedia[0].url) }}
          style={themed($detailMediaImage)}
          resizeMode="cover"
        />
      );
    }

    if (imageCount === 2) {
      return (
        <View style={themed($detailMediaGrid)}>
          {imageMedia.map((item) => (
            <Image
              key={item.id}
              source={{ uri: transformImageUrl(item.url) }}
              style={themed($detailMediaImageHalf)}
              resizeMode="cover"
            />
          ))}
        </View>
      );
    }

    // 3개 이상 - 스크롤 가능한 그리드
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={themed($detailMediaScrollView)}
        contentContainerStyle={themed($detailMediaScrollContent)}
      >
        {imageMedia.map((item, index) => (
          <Image
            key={item.id}
            source={{ uri: transformImageUrl(item.url) }}
            style={[
              themed($detailMediaImageScroll),
              index === imageMedia.length - 1 && { marginRight: 0 },
            ]}
            resizeMode="cover"
          />
        ))}
      </ScrollView>
    );
  };

  const MediaContent =
    variant === "feed" ? renderFeedMediaGrid() : renderDetailMedia();

  return onPress ? (
    <TouchableOpacity
      style={themed($container)}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {MediaContent}
    </TouchableOpacity>
  ) : (
    <View style={themed($container)}>{MediaContent}</View>
  );
}

// --- 스타일 정의 ---
const $container: ThemedStyle<ViewStyle> = () => ({
  position: "relative",
});

// 피드용 스타일
const $feedMediaImage: ThemedStyle<ImageStyle> = ({ colors }) => ({
  width: "100%",
  height: 224,
  borderRadius: 8,
  backgroundColor: colors.separator,
});

const $feedMediaGrid: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  height: 224,
  gap: 2,
});

const $feedMediaImageHalf: ThemedStyle<ImageStyle> = ({ colors }) => ({
  flex: 1,
  height: "100%",
  borderRadius: 8,
  backgroundColor: colors.separator,
});

const $feedMediaRightColumn: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  gap: 2,
});

const $feedMediaImageQuarter: ThemedStyle<ImageStyle> = ({ colors }) => ({
  flex: 1,
  borderRadius: 8,
  backgroundColor: colors.separator,
});

const $feedMediaRow: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  flexDirection: "row",
  gap: 2,
});

const $moreImagesOverlay: ThemedStyle<ViewStyle> = () => ({
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

const $moreImagesText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 18,
  fontWeight: "bold",
});

// 상세 페이지용 스타일
const $detailMediaImage: ThemedStyle<ImageStyle> = ({ spacing }) => ({
  width: "100%",
  height: 300,
  borderRadius: 12,
  marginBottom: spacing.sm,
});

const $detailMediaGrid: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.xs,
});

const $detailMediaImageHalf: ThemedStyle<ImageStyle> = () => ({
  flex: 1,
  height: 200,
  borderRadius: 12,
});

const $detailMediaScrollView: ThemedStyle<ViewStyle> = () => ({
  height: 250,
});

const $detailMediaScrollContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingRight: spacing.md,
});

const $detailMediaImageScroll: ThemedStyle<ImageStyle> = ({ spacing }) => ({
  width: 200,
  height: 250,
  borderRadius: 12,
  marginRight: spacing.sm,
});
