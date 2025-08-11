/**
 * 최적화된 이미지 컴포넌트
 *
 * 플랫폼과 화면 크기에 따라 적절한 썸네일을 로드하는 컴포넌트입니다.
 * 점진적 로딩과 lazy loading을 지원합니다.
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Image,
  View,
  ActivityIndicator,
  ImageStyle,
  ViewStyle,
  Dimensions,
  PixelRatio,
} from "react-native";
import { isWeb } from "@/lib/platform";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";

interface ThumbnailData {
  size: string;
  url: string;
  width: number;
  height: number;
}

interface OptimizedImageProps {
  /** 미디어 ID */
  mediaId: string;
  /** 사용 가능한 썸네일 목록 */
  thumbnails: ThumbnailData[];
  /** 원본 이미지 URL (fallback) */
  originalUrl?: string;
  /** 이미지 스타일 */
  style?: ImageStyle;
  /** 컨테이너 스타일 */
  containerStyle?: ViewStyle;
  /** 로딩 인디케이터 표시 여부 */
  showLoadingIndicator?: boolean;
  /** 점진적 로딩 사용 여부 */
  useProgressiveLoading?: boolean;
  /** Lazy loading 사용 여부 */
  useLazyLoading?: boolean;
  /** 이미지 로드 완료 콜백 */
  onLoad?: () => void;
  /** 이미지 로드 실패 콜백 */
  onError?: () => void;
  /** 접근성 라벨 */
  accessibilityLabel?: string;
}

/**
 * 화면 크기와 픽셀 밀도를 기반으로 최적 썸네일 크기 결정
 */
function getOptimalThumbnailSize(
  thumbnails: ThumbnailData[],
  containerWidth: number,
  containerHeight: number
): ThumbnailData | null {
  if (thumbnails.length === 0) return null;

  const screenScale = PixelRatio.get();
  const isHighDPI = screenScale >= 2;
  const { width: screenWidth } = Dimensions.get("window");

  // 필요한 실제 픽셀 크기 계산
  const requiredWidth = containerWidth * screenScale;
  const requiredHeight = containerHeight * screenScale;
  const requiredSize = Math.max(requiredWidth, requiredHeight);

  // 웹 환경에서는 더 큰 이미지 선호
  const webMultiplier = isWeb() ? 1.5 : 1;
  const targetSize = requiredSize * webMultiplier;

  // 크기별로 정렬 (작은 것부터)
  const sortedThumbnails = [...thumbnails].sort(
    (a, b) => Math.max(a.width, a.height) - Math.max(b.width, b.height)
  );

  // 목표 크기보다 큰 첫 번째 썸네일 찾기
  let selectedThumbnail = sortedThumbnails.find(
    (thumb) => Math.max(thumb.width, thumb.height) >= targetSize
  );

  // 적절한 크기가 없으면 가장 큰 썸네일 사용
  if (!selectedThumbnail) {
    selectedThumbnail = sortedThumbnails[sortedThumbnails.length - 1];
  }

  // 모바일에서 너무 큰 이미지는 피하기 (데이터 절약)
  if (!isWeb() && screenWidth < 768) {
    const maxMobileSize = isHighDPI ? 600 : 300;
    const mobileFriendly = sortedThumbnails.find(
      (thumb) =>
        Math.max(thumb.width, thumb.height) <= maxMobileSize &&
        Math.max(thumb.width, thumb.height) >= targetSize * 0.7
    );

    if (mobileFriendly) {
      selectedThumbnail = mobileFriendly;
    }
  }

  return selectedThumbnail;
}

/**
 * 점진적 로딩을 위한 썸네일 순서 결정
 */
function getProgressiveLoadingOrder(
  thumbnails: ThumbnailData[]
): ThumbnailData[] {
  return [...thumbnails].sort(
    (a, b) => Math.max(a.width, a.height) - Math.max(b.width, b.height)
  );
}

export default function OptimizedImage({
  mediaId,
  thumbnails,
  originalUrl,
  style,
  containerStyle,
  showLoadingIndicator = true,
  useProgressiveLoading = true,
  useLazyLoading = false,
  onLoad,
  onError,
  accessibilityLabel,
}: OptimizedImageProps) {
  const { themed, theme } = useAppTheme();
  const [currentImageUrl, setCurrentImageUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isVisible, setIsVisible] = useState(!useLazyLoading);
  const containerRef = useRef<View>(null);

  // 컨테이너 크기 측정
  const [containerSize, setContainerSize] = useState({
    width: 300,
    height: 300,
  });

  useEffect(() => {
    if (!isVisible || thumbnails.length === 0) return;

    const loadOptimalImage = async () => {
      try {
        setIsLoading(true);
        setHasError(false);

        // 최적 썸네일 선택
        const optimalThumbnail = getOptimalThumbnailSize(
          thumbnails,
          containerSize.width,
          containerSize.height
        );

        if (optimalThumbnail) {
          if (useProgressiveLoading) {
            // 점진적 로딩: 작은 이미지부터 로드
            const orderedThumbnails = getProgressiveLoadingOrder(thumbnails);
            const smallestThumbnail = orderedThumbnails[0];

            // 가장 작은 썸네일 먼저 로드
            if (smallestThumbnail && smallestThumbnail !== optimalThumbnail) {
              setCurrentImageUrl(smallestThumbnail.url);

              // 잠시 후 최적 썸네일로 교체
              setTimeout(() => {
                setCurrentImageUrl(optimalThumbnail.url);
              }, 100);
            } else {
              setCurrentImageUrl(optimalThumbnail.url);
            }
          } else {
            setCurrentImageUrl(optimalThumbnail.url);
          }
        } else if (originalUrl) {
          // 썸네일이 없으면 원본 사용
          setCurrentImageUrl(originalUrl);
        }
      } catch (error) {
        console.error("이미지 로드 실패:", error);
        setHasError(true);
        onError?.();
      }
    };

    loadOptimalImage();
  }, [
    thumbnails,
    originalUrl,
    containerSize,
    isVisible,
    useProgressiveLoading,
    onError,
  ]);

  // Lazy loading을 위한 Intersection Observer (웹 전용)
  useEffect(() => {
    if (!useLazyLoading || !isWeb() || isVisible) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );

    const currentRef = containerRef.current;
    if (currentRef) {
      // React Native Web에서는 직접 DOM 요소에 접근
      const domNode = (currentRef as any)._nativeTag || currentRef;
      if (domNode && domNode.nodeType) {
        observer.observe(domNode);
      }
    }

    return () => observer.disconnect();
  }, [useLazyLoading, isVisible]);

  const handleImageLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  const handleContainerLayout = (event: any) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerSize({ width, height });
  };

  if (!isVisible) {
    // Lazy loading 대기 중
    return (
      <View
        ref={containerRef}
        style={[themed($container), containerStyle]}
        onLayout={handleContainerLayout}
      >
        <View style={themed($placeholder)} />
      </View>
    );
  }

  return (
    <View
      ref={containerRef}
      style={[themed($container), containerStyle]}
      onLayout={handleContainerLayout}
    >
      {currentImageUrl && !hasError ? (
        <>
          <Image
            source={{ uri: currentImageUrl }}
            style={[themed($image), style]}
            onLoad={handleImageLoad}
            onError={handleImageError}
            accessibilityLabel={accessibilityLabel}
            // 웹에서 이미지 최적화 속성
            {...(isWeb() && {
              loading: "lazy",
              decoding: "async",
            })}
          />
          {isLoading && showLoadingIndicator && (
            <View style={themed($loadingOverlay)}>
              <ActivityIndicator size="small" color={theme.colors.tint} />
            </View>
          )}
        </>
      ) : (
        <View style={themed($errorContainer)}>
          <View style={themed($errorPlaceholder)} />
        </View>
      )}
    </View>
  );
}

// --- 스타일 정의 ---

const $container: ThemedStyle<ViewStyle> = () => ({
  position: "relative",
  overflow: "hidden",
});

const $image: ThemedStyle<ImageStyle> = () => ({
  width: "100%",
  height: "100%",
  resizeMode: "cover",
});

const $loadingOverlay: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: colors.background + "80",
  justifyContent: "center",
  alignItems: "center",
});

const $placeholder: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: "100%",
  height: "100%",
  backgroundColor: colors.border + "30",
  justifyContent: "center",
  alignItems: "center",
});

const $errorContainer: ThemedStyle<ViewStyle> = () => ({
  width: "100%",
  height: "100%",
  justifyContent: "center",
  alignItems: "center",
});

const $errorPlaceholder: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: "100%",
  height: "100%",
  backgroundColor: colors.border + "20",
  justifyContent: "center",
  alignItems: "center",
});

/**
 * WebP 기반 썸네일 크기별 권장 사용처 (3단계 최적화)
 */
export const ThumbnailSizeGuide = {
  thumbnail_small: {
    description: "작은 썸네일 (150x150) - WebP",
    useCases: ["프로필 이미지", "목록 아이템", "아바타"],
    maxDisplaySize: { width: 150, height: 150 },
    format: "WebP (정사각형 크롭)",
  },
  thumbnail_large: {
    description: "모바일 최적화 (600px 긴변) - WebP",
    useCases: ["모바일 피드", "카드 이미지", "갤러리 그리드", "웹 피드"],
    maxDisplaySize: { width: 600, height: 600 },
    format: "WebP (비율 유지)",
  },
  preview: {
    description: "웹 최적화 (1200px 긴변) - WebP",
    useCases: [
      "상세보기",
      "전체화면 보기",
      "확대 이미지",
      "고해상도 디스플레이",
    ],
    maxDisplaySize: { width: 1200, height: 1200 },
    format: "WebP (비율 유지)",
  },
};
