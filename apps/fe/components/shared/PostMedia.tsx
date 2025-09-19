import React, { useState } from "react";
import {
  View,
  Image,
  ScrollView,
  TouchableOpacity,
  Text,
  ViewStyle,
  ImageStyle,
  TextStyle,
  Modal,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { isWeb } from "@/lib/platform";
/* 상위(PostDetailContent 등)에서 thumbnailUrl 해석을 끝내고 내려주므로
   여기서는 최적화 URL 생성 로직을 의존하지 않는다 (표시 전용 컴포넌트). */

// expo-video는 조건부로 import (웹에서 문제 발생 방지)
let Video: any = null;
try {
  if (!isWeb()) {
    Video = require("expo-video").Video;
  }
} catch (error) {
  console.warn("expo-video를 로드할 수 없습니다:", error);
}

/**
 * Media 인터페이스
 * - thumbnailUrl: 비디오의 썸네일 지원 (이미지에도 존재할 수 있음)
 */
export interface Media {
  id: string;
  url: string;
  type: "IMAGE" | "VIDEO" | "image" | "video";
  thumbnailUrl?: string;
}

interface PostMediaProps {
  media: Media[];
  onPress?: () => void;
  variant?: "feed" | "detail";
}

/**
 * PostMedia
 * - 이미지와 비디오를 통합 처리
 * - 최대 4개(이미지+비디오 혼합) 그리드 지원
 * - 비디오는 상위에서 전달된 thumbnailUrl(또는 fallback url)을 그대로 사용 (이 컴포넌트는 표현 전용)
 */
export default function PostMedia({
  media,
  onPress,
  variant = "feed",
}: PostMediaProps) {
  const { themed, theme } = useAppTheme();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // 이미지 자세히 보기 모달 상태
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);

  // 동영상 자세히 보기 모달 상태
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Media | null>(null);

  /**
   * 유효 미디어 (image 또는 video) - 최대 4개만 표시
   */
  const unifiedMedia = media
    .filter(
      (m) =>
        m &&
        (m.type === "image" ||
          m.type === "IMAGE" ||
          m.type === "video" ||
          m.type === "VIDEO"),
    )
    .slice(0, 4);

  if (unifiedMedia.length === 0) return null;

  /**
   * URL 변환 (localhost 등 환경별 처리 필요 시 확장)
   */
  const transformUrl = (url: string) => {
    if (typeof url !== "string") return "";
    if (url.startsWith("http://localhost:3000")) {
      return url.replace("http://localhost:3000", "http://localhost:3000");
    }
    return url;
  };

  // (썸네일 해석 로직은 상위 컨테이너로 이동됨: 여기서는 순수 표시만 담당)

  /**
   * 실제 표시용 URL
   * - 비디오는 getVideoThumbnailUrl() 사용
   * - 이미지는 thumbnailUrl 우선, 없으면 원본
   */
  const getDisplayUrl = (item: Media) =>
    transformUrl(item.thumbnailUrl || item.url);

  /**
   * 미디어 클릭 핸들러
   */
  const handleMediaPress = (item: Media) => {
    if (item.type === "image" || item.type === "IMAGE") {
      // 이미지 모달 표시
      setSelectedMedia(item);
      setImageModalVisible(true);
    } else if (item.type === "video" || item.type === "VIDEO") {
      // 동영상 모달 표시
      setSelectedVideo(item);
      setVideoModalVisible(true);
    }
  };

  /**
   * 모달 닫기 핸들러들
   */
  const handleCloseImageModal = () => {
    setImageModalVisible(false);
    setSelectedMedia(null);
  };

  const handleCloseVideoModal = () => {
    setVideoModalVisible(false);
    setSelectedVideo(null);
  };

  /**
   * Feed 변형: 첫 번째 항목만 (이미지/비디오 구분 없이)
   */
  const renderFeed = () => {
    const first = unifiedMedia[0];
    return (
      <TouchableOpacity
        style={themed($singleWrapper)}
        onPress={() => handleMediaPress(first)}
        activeOpacity={0.9}
      >
        <Image
          source={{ uri: getDisplayUrl(first) }}
          style={themed($feedSingleImage)}
          resizeMode="cover"
        />
        {(first.type === "video" || first.type === "VIDEO") && (
          <View style={themed($playOverlay)}>
            <Ionicons name="play" size={32} color="white" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  /**
   * Detail 변형: 개수별 레이아웃
   * 1개: 단일 큰 이미지
   * 2개: 2열
   * 3~4개: 2x2 그리드
   * 4개 초과 시 (slice로 4개 제한) +N 표시는 지금 요구사항엔 없음 -> 필요 시 확장
   */
  const renderDetail = () => {
    const count = unifiedMedia.length;

    if (count === 1) {
      const item = unifiedMedia[0];
      return (
        <TouchableOpacity
          style={themed($singleWrapper)}
          onPress={() => handleMediaPress(item)}
          activeOpacity={0.9}
        >
          <Image
            source={{ uri: getDisplayUrl(item) }}
            style={themed($detailSingle)}
            resizeMode="cover"
          />
          {(item.type === "video" || item.type === "VIDEO") && (
            <View style={themed($playOverlay)}>
              <Ionicons name="play" size={40} color="white" />
            </View>
          )}
        </TouchableOpacity>
      );
    }

    if (count === 2) {
      return (
        <View style={themed($row)}>
          {unifiedMedia.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={themed($halfItemWrapper)}
              onPress={() => handleMediaPress(item)}
              activeOpacity={0.9}
            >
              <Image
                source={{ uri: getDisplayUrl(item) }}
                style={themed($halfItemImage)}
                resizeMode="cover"
              />
              {(item.type === "video" || item.type === "VIDEO") && (
                <View style={themed($playOverlaySmall)}>
                  <Ionicons name="play" size={28} color="white" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    // 3개 이상 - 가로 스크롤 가능한 썸네일 리스트
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={themed($detailMediaScrollView)}
        contentContainerStyle={themed($detailMediaScrollContent)}
      >
        {unifiedMedia.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            style={themed($scrollItemWrapper)}
            onPress={() => handleMediaPress(item)}
            activeOpacity={0.9}
          >
            <Image
              source={{ uri: getDisplayUrl(item) }}
              style={[
                themed($detailMediaImageScroll),
                index === unifiedMedia.length - 1 && { marginRight: 0 },
              ]}
              resizeMode="cover"
            />
            {(item.type === "video" || item.type === "VIDEO") && (
              <View style={themed($playOverlayTiny)}>
                <Ionicons name="play" size={24} color="white" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const content = variant === "feed" ? renderFeed() : renderDetail();

  return (
    <View style={themed($container)}>
      {content}

      {/* 이미지 자세히 보기 모달 */}
      <Modal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseImageModal}
      >
        <TouchableOpacity
          style={themed($modalOverlay)}
          activeOpacity={1}
          onPress={handleCloseImageModal}
        >
          <View style={themed($modalContent)}>
            {/* 닫기 버튼 */}
            <TouchableOpacity
              style={themed($closeButton)}
              onPress={handleCloseImageModal}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>

            {/* 확대된 이미지 */}
            {selectedMedia && (
              <Image
                source={{ uri: getDisplayUrl(selectedMedia) }}
                style={[
                  themed($modalImage),
                  {
                    width: Math.min(screenWidth * 0.9, screenHeight * 0.7),
                    height: Math.min(screenWidth * 0.9, screenHeight * 0.7),
                  },
                ]}
                resizeMode="contain"
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 동영상 자세히 보기 모달 */}
      <Modal
        visible={videoModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseVideoModal}
      >
        <TouchableOpacity
          style={themed($modalOverlay)}
          activeOpacity={1}
          onPress={handleCloseVideoModal}
        >
          <View style={themed($modalContent)}>
            {/* 닫기 버튼 */}
            <TouchableOpacity
              style={themed($closeButton)}
              onPress={handleCloseVideoModal}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>

            {/* 동영상 플레이어 */}
            {selectedVideo && (
              <View style={themed($videoModalContainer)}>
                {isWeb() ? (
                  // 웹 환경: HTML5 video 플레이어
                  <video
                    src={selectedVideo.url}
                    controls
                    autoPlay
                    style={{
                      width: "100%",
                      height: "100%",
                      maxWidth: Math.min(screenWidth * 0.9, 800),
                      maxHeight: Math.min(screenHeight * 0.8, 600),
                      borderRadius: 12,
                    }}
                  />
                ) : Video ? (
                  // 모바일 환경: expo-video 전체화면 플레이어
                  <Video
                    source={{ uri: selectedVideo.url }}
                    style={{
                      width: Math.min(screenWidth * 0.9, screenHeight * 0.7),
                      height: Math.min(screenWidth * 0.9, screenHeight * 0.7),
                      borderRadius: 12,
                    }}
                    useNativeControls
                    resizeMode="contain"
                    isLooping={false}
                    isMuted={false}
                    shouldPlay={true}
                    presentationStyle="fullscreen"
                  />
                ) : (
                  // 폴백: 비디오를 재생할 수 없음
                  <View style={themed($videoFallback)}>
                    <Ionicons name="videocam" size={48} color="white" />
                    <Text style={themed($videoFallbackText)}>
                      동영상을 재생할 수 없습니다
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

/* ================= 스타일 정의 ================= */

const $container: ThemedStyle<ViewStyle> = () => ({
  position: "relative",
  width: "100%",
});

/* Feed 단일 */
const $singleWrapper: ThemedStyle<ViewStyle> = () => ({
  position: "relative",
  width: "100%",
});

const $feedSingleImage: ThemedStyle<ImageStyle> = ({ colors }) => ({
  width: "100%",
  height: 200,
  backgroundColor: colors.separator,
  borderRadius: 12,
});

/* Detail - Single */
const $detailSingle: ThemedStyle<ImageStyle> = ({ colors }) => ({
  width: "100%",
  height: 300,
  borderRadius: 12,
  backgroundColor: colors.separator,
});

/* 2개 레이아웃 */
const $row: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.xs,
});

const $halfItemWrapper: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  position: "relative",
  borderRadius: 12,
  overflow: "hidden",
  backgroundColor: colors.separator,
});

const $halfItemImage: ThemedStyle<ImageStyle> = () => ({
  width: "100%",
  height: 200,
});

/* 2x2 그리드 (3~4) */
const $gridWrapper: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "space-between",
  gap: spacing.xs,
});

const $gridItem: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: "48.5%", // 두 칼럼 균등
  aspectRatio: 1,
  position: "relative",
  borderRadius: 12,
  overflow: "hidden",
  backgroundColor: colors.separator,
});

const $gridItemImage: ThemedStyle<ImageStyle> = () => ({
  width: "100%",
  height: "100%",
});

/* 3개 이상 스크롤 레이아웃 스타일 */
const $detailMediaScrollView: ThemedStyle<ViewStyle> = () => ({
  height: 250,
});

const $detailMediaScrollContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingRight: spacing.md,
});

const $scrollItemWrapper: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  position: "relative",
  marginRight: spacing.sm,
  borderRadius: 12,
  overflow: "hidden",
  backgroundColor: colors.separator,
});

const $detailMediaImageScroll: ThemedStyle<ImageStyle> = () => ({
  width: 200,
  height: 250,
  borderRadius: 12,
});

/* 오버레이 공통 */
const $playOverlayBase = (size: number): ViewStyle => ({
  position: "absolute",
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "rgba(0,0,0,0.35)",
  borderRadius: size / 2,
});

const $playOverlay: ThemedStyle<ViewStyle> = () => ({
  ...$playOverlayBase(80),
  width: 80,
  height: 80,
  top: "50%",
  left: "50%",
  marginLeft: -40,
  marginTop: -40,
});

const $playOverlaySmall: ThemedStyle<ViewStyle> = () => ({
  ...$playOverlayBase(56),
  width: 56,
  height: 56,
  top: "50%",
  left: "50%",
  marginLeft: -28,
  marginTop: -28,
});

const $playOverlayTiny: ThemedStyle<ViewStyle> = () => ({
  ...$playOverlayBase(48),
  width: 48,
  height: 48,
  top: "50%",
  left: "50%",
  marginLeft: -24,
  marginTop: -24,
});

/* (추후 확장) +N 표시 오버레이 */
const $moreOverlay: ThemedStyle<ViewStyle> = () => ({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0,0,0,0.55)",
  justifyContent: "center",
  alignItems: "center",
});

const $moreText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 22,
  fontWeight: "700",
});

/* 모달 스타일 */
const $modalOverlay: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  backgroundColor: "rgba(0, 0, 0, 0.8)",
  justifyContent: "center",
  alignItems: "center",
});

const $modalContent: ThemedStyle<ViewStyle> = () => ({
  position: "relative",
  justifyContent: "center",
  alignItems: "center",
});

const $modalImage: ThemedStyle<ImageStyle> = () => ({
  borderRadius: 12,
});

const $closeButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  position: "absolute",
  top: -spacing.xl,
  right: -spacing.sm,
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: "rgba(0, 0, 0, 0.6)",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 10,
});

/* 동영상 모달 스타일 */
const $videoModalContainer: ThemedStyle<ViewStyle> = () => ({
  justifyContent: "center",
  alignItems: "center",
});

const $videoFallback: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 300,
  height: 200,
  backgroundColor: colors.backgroundDim,
  borderRadius: 12,
  justifyContent: "center",
  alignItems: "center",
});

const $videoFallbackText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  fontSize: 16,
  marginTop: 12,
  textAlign: "center",
});
