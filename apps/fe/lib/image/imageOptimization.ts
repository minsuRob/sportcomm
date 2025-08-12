/**
 * 이미지 최적화 및 크기 계산 유틸리티
 *
 * PostCard, StorySection 등에서 공통으로 사용되는 이미지 처리 로직을 제공합니다.
 */

import { useState, useEffect } from "react";
import { Image, useWindowDimensions } from "react-native";
import normalizeUrl from "normalize-url";

// --- 상수 정의 ---
export const IMAGE_CONSTANTS = {
  MIN_HEIGHT: 200, // 최소 이미지 높이 (정사각형 이미지 고려)
  MAX_HEIGHT: 500, // 최대 이미지 높이
  DEFAULT_ASPECT_RATIO: 16 / 9, // 기본 가로세로 비율
  SQUARE_ASPECT_RATIO: 1, // 정사각형 비율
  PORTRAIT_ASPECT_RATIO: 9 / 16, // 세로형 비율
  LANDSCAPE_ASPECT_RATIO: 16 / 9, // 가로형 비율
  MAX_HEIGHT_RATIO: 0.6, // 화면 대비 최대 높이 비율
  STORY_ASPECT_RATIO: 16 / 9, // 스토리 이미지 비율
  // 모바일/웹별 최적화 설정
  MOBILE: {
    MIN_HEIGHT: 200,
    MAX_HEIGHT: 400,
    MAX_HEIGHT_RATIO: 0.5,
  },
  WEB: {
    MIN_HEIGHT: 250,
    MAX_HEIGHT: 500,
    MAX_HEIGHT_RATIO: 0.6,
  },
} as const;

// --- 타입 정의 ---
export interface ImageDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

export interface ImageOptimizationOptions {
  minHeight?: number;
  maxHeightRatio?: number;
  defaultAspectRatio?: number;
}

export interface UseImageDimensionsResult {
  imageAspectRatio: number | null;
  imageHeight: number | null;
  imageLoading: boolean;
  error: string | null;
}

// --- 유틸리티 함수 ---

/**
 * 이미지 URL에서 크기 정보를 가져오는 함수
 * @param imageUrl 이미지 URL
 * @returns Promise<ImageDimensions>
 */
export const getImageDimensions = (
  imageUrl: string,
): Promise<ImageDimensions> => {
  return new Promise((resolve, reject) => {
    Image.getSize(
      imageUrl,
      (width, height) => {
        if (width > 0 && height > 0) {
          resolve({
            width,
            height,
            aspectRatio: width / height,
          });
        } else {
          reject(new Error("Invalid image dimensions"));
        }
      },
      (error) => {
        reject(error);
      },
    );
  });
};

/**
 * 이미지 타입을 감지하는 함수
 * @param aspectRatio 이미지 비율
 * @returns 이미지 타입 (square, portrait, landscape)
 */
export const detectImageType = (
  aspectRatio: number,
): "square" | "portrait" | "landscape" => {
  if (Math.abs(aspectRatio - 1) < 0.1) {
    return "square"; // 정사각형 (0.9 ~ 1.1 범위)
  } else if (aspectRatio < 1) {
    return "portrait"; // 세로형
  } else {
    return "landscape"; // 가로형
  }
};

/**
 * 환경별 최적화된 이미지 크기를 계산하는 함수
 * @param originalDimensions 원본 이미지 크기
 * @param screenDimensions 화면 크기
 * @param isWeb 웹 환경 여부
 * @param options 최적화 옵션
 * @returns 최적화된 이미지 크기
 */
export const calculateOptimizedImageSize = (
  originalDimensions: ImageDimensions,
  screenDimensions: { width: number; height: number },
  isWeb: boolean = false,
  options: ImageOptimizationOptions = {},
): ImageDimensions => {
  const config = isWeb ? IMAGE_CONSTANTS.WEB : IMAGE_CONSTANTS.MOBILE;

  const {
    minHeight = config.MIN_HEIGHT,
    maxHeightRatio = config.MAX_HEIGHT_RATIO,
    defaultAspectRatio = IMAGE_CONSTANTS.DEFAULT_ASPECT_RATIO,
  } = options;

  const {
    width: originalWidth,
    height: originalHeight,
    aspectRatio,
  } = originalDimensions;

  const imageType = detectImageType(aspectRatio);
  const maxHeight = Math.min(
    screenDimensions.height * maxHeightRatio,
    config.MAX_HEIGHT,
  );

  // 정사각형 이미지 특별 처리
  if (imageType === "square") {
    const squareSize = Math.min(
      Math.max(minHeight, screenDimensions.width * 0.8), // 화면 너비의 80%
      maxHeight,
    );
    return {
      width: squareSize,
      height: squareSize,
      aspectRatio: 1,
    };
  }

  // 세로형 이미지 처리
  if (imageType === "portrait") {
    const height = Math.min(Math.max(minHeight, originalHeight), maxHeight);
    return {
      width: height * aspectRatio,
      height,
      aspectRatio,
    };
  }

  // 가로형 이미지 처리 (기존 로직 유지)
  const containerWidth = Math.min(screenDimensions.width * 0.95, 640); // 웹에서 최대 640px
  const calculatedHeight = containerWidth / aspectRatio;

  if (calculatedHeight < minHeight) {
    return {
      width: minHeight * aspectRatio,
      height: minHeight,
      aspectRatio,
    };
  }

  if (calculatedHeight > maxHeight) {
    return {
      width: maxHeight * aspectRatio,
      height: maxHeight,
      aspectRatio,
    };
  }

  return {
    width: containerWidth,
    height: calculatedHeight,
    aspectRatio,
  };
};

/**
 * 이미지 크기와 로딩 상태를 관리하는 커스텀 훅
 * @param imageUrl 이미지 URL
 * @param isWeb 웹 환경 여부
 * @param options 최적화 옵션
 * @returns 이미지 크기 정보와 로딩 상태
 */
export const useImageDimensions = (
  imageUrl: string | null,
  isWeb: boolean = false,
  options: ImageOptimizationOptions = {},
): UseImageDimensionsResult => {
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);
  const [imageHeight, setImageHeight] = useState<number | null>(null);
  const [imageLoading, setImageLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  useEffect(() => {
    if (!imageUrl) {
      setImageLoading(false);
      setImageAspectRatio(null);
      setImageHeight(null);
      setError(null);
      return;
    }

    setImageLoading(true);
    setError(null);

    getImageDimensions(imageUrl)
      .then((dimensions) => {
        const optimizedSize = calculateOptimizedImageSize(
          dimensions,
          { width: screenWidth, height: screenHeight },
          isWeb,
          options,
        );

        setImageAspectRatio(optimizedSize.aspectRatio);
        setImageHeight(optimizedSize.height);
        setImageLoading(false);
      })
      .catch((err) => {
        console.warn("Failed to load image dimensions:", err);

        // 기본값 설정
        const config = isWeb ? IMAGE_CONSTANTS.WEB : IMAGE_CONSTANTS.MOBILE;
        const defaultAspectRatio =
          options.defaultAspectRatio || IMAGE_CONSTANTS.DEFAULT_ASPECT_RATIO;
        const minHeight = options.minHeight || config.MIN_HEIGHT;

        setImageAspectRatio(defaultAspectRatio);
        setImageHeight(minHeight);
        setError(err.message || "Failed to load image");
        setImageLoading(false);
      });
  }, [
    imageUrl,
    screenWidth,
    screenHeight,
    isWeb,
    options.minHeight,
    options.maxHeightRatio,
    options.defaultAspectRatio,
  ]);

  return {
    imageAspectRatio,
    imageHeight,
    imageLoading,
    error,
  };
};

/**
 * 스토리 이미지에 특화된 크기 계산 함수
 * @param imageUrl 이미지 URL
 * @returns 스토리용 이미지 크기 정보
 */
export const useStoryImageDimensions = (imageUrl: string | null) => {
  return useImageDimensions(imageUrl, {
    minHeight: 60, // 스토리는 더 작은 최소 높이
    maxHeightRatio: 0.15, // 화면의 15%까지만 (더 작게 제한)
    defaultAspectRatio: IMAGE_CONSTANTS.STORY_ASPECT_RATIO,
  });
};

/**
 * 게시물 이미지에 특화된 크기 계산 함수
 * @param imageUrl 이미지 URL
 * @param isWeb 웹 환경 여부
 * @returns 게시물용 이미지 크기 정보
 */
export const usePostImageDimensions = (
  imageUrl: string | null,
  isWeb: boolean = false,
) => {
  const config = isWeb ? IMAGE_CONSTANTS.WEB : IMAGE_CONSTANTS.MOBILE;

  return useImageDimensions(imageUrl, isWeb, {
    minHeight: config.MIN_HEIGHT,
    maxHeightRatio: config.MAX_HEIGHT_RATIO,
    defaultAspectRatio: IMAGE_CONSTANTS.DEFAULT_ASPECT_RATIO,
  });
};
export type MediaItem = {
  id: string;
  url: string;
  type: "IMAGE" | "VIDEO" | "image" | "video";
};

export const selectOptimizedImageUrl = (
  media: MediaItem | null | undefined,
  mediaOptType: string
) => {
  if (!media) return undefined;
  const delimiter = "/public/";
  let url = `${media?.url.split(delimiter)[0] + delimiter}/${mediaOptType}/${media.id}.webp`;
  return normalizeUrl(url);
};
