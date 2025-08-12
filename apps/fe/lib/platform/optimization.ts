/**
 * 플랫폼별 성능 최적화 유틸리티
 */

import { Platform } from "react-native";

/**
 * 플랫폼별 FlatList 최적화 설정
 */
export const getFlatListOptimizationProps = () => {
  const baseProps = {
    removeClippedSubviews: true,
    maxToRenderPerBatch: 10,
    updateCellsBatchingPeriod: 50,
    initialNumToRender: 10,
    windowSize: 10,
  };

  if (Platform.OS === "android") {
    return {
      ...baseProps,
      // Android 특화 최적화
      maxToRenderPerBatch: 8,
      initialNumToRender: 8,
      windowSize: 8,
    };
  }

  if (Platform.OS === "ios") {
    return {
      ...baseProps,
      // iOS 특화 최적화
      maxToRenderPerBatch: 12,
      initialNumToRender: 12,
      windowSize: 12,
    };
  }

  // 웹 환경
  return {
    ...baseProps,
    removeClippedSubviews: false, // 웹에서는 비활성화
    maxToRenderPerBatch: 15,
    initialNumToRender: 15,
    windowSize: 15,
  };
};

/**
 * 플랫폼별 키보드 설정
 */
export const getKeyboardProps = () => {
  return Platform.select({
    ios: {
      behavior: "padding" as const,
      keyboardVerticalOffset: 0,
    },
    android: {
      behavior: "height" as const,
      keyboardVerticalOffset: 0,
    },
    default: {
      behavior: "padding" as const,
      keyboardVerticalOffset: 0,
    },
  });
};

/**
 * 플랫폼별 그림자 스타일
 */
export const getPlatformShadow = (elevation: number = 3) => {
  if (Platform.OS === "ios") {
    return {
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: elevation / 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: elevation,
    };
  }

  if (Platform.OS === "android") {
    return {
      elevation,
    };
  }

  // 웹
  return {
    boxShadow: `0px ${elevation}px ${elevation * 2}px rgba(0, 0, 0, 0.1)`,
  };
};

/**
 * 플랫폼별 터치 피드백 설정
 */
export const getTouchableProps = () => {
  return Platform.select({
    ios: {
      activeOpacity: 0.7,
    },
    android: {
      // Android Ripple 효과 (API 21+)
      activeOpacity: 0.7,
    },
    default: {
      activeOpacity: 0.7,
    },
  });
};

/**
 * 메모리 사용량 최적화를 위한 이미지 props
 */
export const getOptimizedImageProps = () => {
  return Platform.select({
    ios: {
      resizeMode: "cover" as const,
      // iOS에서 메모리 최적화
      defaultSource: undefined,
    },
    android: {
      resizeMode: "cover" as const,
      // Android에서 메모리 최적화
      fadeDuration: 300,
    },
    default: {
      resizeMode: "cover" as const,
    },
  });
};
