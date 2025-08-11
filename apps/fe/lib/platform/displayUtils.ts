/**
 * 플랫폼 및 디스플레이 정보 감지 유틸리티
 */

import { PixelRatio, Dimensions } from "react-native";
import { isWeb } from "@/lib/platform";

export interface DisplayInfo {
  isWeb: boolean;
  isHighDPI: boolean;
  pixelRatio: number;
  screenWidth: number;
  screenHeight: number;
  preferredThumbnailSize: "small" | "large" | "preview";
}

/**
 * 현재 디스플레이 정보를 가져오는 함수
 */
export const getDisplayInfo = (): DisplayInfo => {
  const pixelRatio = PixelRatio.get();
  const { width, height } = Dimensions.get("window");
  const webEnv = isWeb();
  const highDPI = pixelRatio >= 2;

  // 플랫폼별 최적화된 썸네일 크기 결정 (DB 형식에 맞춤)
  let preferredThumbnailSize: "small" | "large" | "preview";

  if (webEnv) {
    // 웹 환경: 항상 고품질 이미지 사용
    preferredThumbnailSize = "preview";
  } else {
    // 모바일 환경: 해상도에 따라 선택
    preferredThumbnailSize = highDPI ? "preview" : "large";
  }

  return {
    isWeb: webEnv,
    isHighDPI: highDPI,
    pixelRatio,
    screenWidth: width,
    screenHeight: height,
    preferredThumbnailSize,
  };
};

/**
 * 썸네일 배열에서 최적화된 URL 선택
 */
export const selectOptimizedThumbnailUrl = (
  thumbnails: Array<{ size: string; url: string }>,
  displayInfo?: DisplayInfo
): string | null => {
  if (!thumbnails || thumbnails.length === 0) {
    return null;
  }

  const info = displayInfo || getDisplayInfo();

  // 추천 크기의 썸네일 찾기 (대소문자 구분 없이)
  const preferredSize = info.preferredThumbnailSize.toUpperCase();
  const preferredThumbnail = thumbnails.find(
    (thumb) => thumb.size.toUpperCase() === preferredSize
  );

  if (preferredThumbnail) {
    return preferredThumbnail.url;
  }

  // fallback 순서: PREVIEW > LARGE > SMALL (실제 DB 데이터 형식에 맞춤)
  const fallbackOrder = ["PREVIEW", "LARGE", "SMALL"];
  for (const size of fallbackOrder) {
    const thumbnail = thumbnails.find(
      (thumb) => thumb.size.toUpperCase() === size
    );
    if (thumbnail) {
      return thumbnail.url;
    }
  }

  return null;
};

/**
 * 미디어 객체에서 최적화된 URL 추출
 */
export const getOptimizedMediaUrl = (
  media: { url: string; thumbnails?: Array<{ size: string; url: string }> },
  displayInfo?: DisplayInfo
): string => {
  const info = displayInfo || getDisplayInfo();

  // 디버깅 로그
  console.log("🖼️ getOptimizedMediaUrl:", {
    hasMedia: !!media,
    hasThumbnails: !!(media.thumbnails && media.thumbnails.length > 0),
    thumbnailCount: media.thumbnails?.length || 0,
    thumbnailSizes: media.thumbnails?.map((t) => t.size) || [],
    preferredSize: info.preferredThumbnailSize,
    isWeb: info.isWeb,
    isHighDPI: info.isHighDPI,
    originalUrl: media.url,
  });

  // 썸네일이 있으면 최적화된 썸네일 사용
  if (media.thumbnails && media.thumbnails.length > 0) {
    const optimizedUrl = selectOptimizedThumbnailUrl(media.thumbnails, info);
    if (optimizedUrl) {
      console.log("✅ 최적화된 썸네일 선택:", optimizedUrl);
      return optimizedUrl;
    }
  }

  // 썸네일이 없으면 기본 URL 사용 (이미 압축된 이미지)
  console.log("⚠️ 썸네일 없음, 기본 URL 사용:", media.url);
  return media.url;
};
