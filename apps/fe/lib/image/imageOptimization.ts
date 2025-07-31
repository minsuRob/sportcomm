/**
 * 이미지 최적화 및 크기 계산 유틸리티
 *
 * PostCard, StorySection 등에서 공통으로 사용되는 이미지 처리 로직을 제공합니다.
 */

import { useState, useEffect } from "react";
import { Image, useWindowDimensions } from "react-native";

// --- 상수 정의 ---
export const IMAGE_CONSTANTS = {
  MIN_HEIGHT: 300, // 최소 이미지 높이
  DEFAULT_ASPECT_RATIO: 16 / 9, // 기본 가로세로 비율
  MAX_HEIGHT_RATIO: 0.6, // 화면 대비 최대 높이 비율
  STORY_ASPECT_RATIO: 16 / 9, // 스토리 이미지 비율
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
  imageUrl: string
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
      }
    );
  });
};

/**
 * 화면 크기에 맞는 최적화된 이미지 크기를 계산하는 함수
 * @param originalDimensions 원본 이미지 크기
 * @param screenDimensions 화면 크기
 * @param options 최적화 옵션
 * @returns 최적화된 이미지 크기
 */
export const calculateOptimizedImageSize = (
  originalDimensions: ImageDimensions,
  screenDimensions: { width: number; height: number },
  options: ImageOptimizationOptions = {}
): ImageDimensions => {
  const {
    minHeight = IMAGE_CONSTANTS.MIN_HEIGHT,
    maxHeightRatio = IMAGE_CONSTANTS.MAX_HEIGHT_RATIO,
    defaultAspectRatio = IMAGE_CONSTANTS.DEFAULT_ASPECT_RATIO,
  } = options;

  const maxHeight = screenDimensions.height * maxHeightRatio;
  const {
    width: originalWidth,
    height: originalHeight,
    aspectRatio,
  } = originalDimensions;

  // 최소 높이 보장
  if (originalHeight < minHeight) {
    return {
      width: minHeight * aspectRatio,
      height: minHeight,
      aspectRatio,
    };
  }

  // 최대 높이 제한
  if (originalHeight > maxHeight) {
    return {
      width: maxHeight * aspectRatio,
      height: maxHeight,
      aspectRatio,
    };
  }

  // 원본 크기 유지
  return originalDimensions;
};

/**
 * 이미지 크기와 로딩 상태를 관리하는 커스텀 훅
 * @param imageUrl 이미지 URL
 * @param options 최적화 옵션
 * @returns 이미지 크기 정보와 로딩 상태
 */
export const useImageDimensions = (
  imageUrl: string | null,
  options: ImageOptimizationOptions = {}
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
          options
        );

        setImageAspectRatio(optimizedSize.aspectRatio);
        setImageHeight(optimizedSize.height);
        setImageLoading(false);
      })
      .catch((err) => {
        console.warn("Failed to load image dimensions:", err);

        // 기본값 설정
        const defaultAspectRatio =
          options.defaultAspectRatio || IMAGE_CONSTANTS.DEFAULT_ASPECT_RATIO;
        const minHeight = options.minHeight || IMAGE_CONSTANTS.MIN_HEIGHT;

        setImageAspectRatio(defaultAspectRatio);
        setImageHeight(minHeight);
        setError(err.message || "Failed to load image");
        setImageLoading(false);
      });
  }, [
    imageUrl,
    screenWidth,
    screenHeight,
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
    minHeight: 80, // 스토리는 더 작은 최소 높이
    maxHeightRatio: 0.3, // 화면의 30%까지만
    defaultAspectRatio: IMAGE_CONSTANTS.STORY_ASPECT_RATIO,
  });
};

/**
 * 게시물 이미지에 특화된 크기 계산 함수
 * @param imageUrl 이미지 URL
 * @returns 게시물용 이미지 크기 정보
 */
export const usePostImageDimensions = (imageUrl: string | null) => {
  return useImageDimensions(imageUrl, {
    minHeight: IMAGE_CONSTANTS.MIN_HEIGHT,
    maxHeightRatio: IMAGE_CONSTANTS.MAX_HEIGHT_RATIO,
    defaultAspectRatio: IMAGE_CONSTANTS.DEFAULT_ASPECT_RATIO,
  });
};
