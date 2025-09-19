/**
 * 플랫폼별 성능 최적화 유틸리티
 */

import { Platform } from "react-native";

/**
 * 플랫폼별 FlatList 최적화 설정 (피드 성능 최적화)
 * - 스크롤 성능 향상을 위한 설정
 * - 메모리 사용량 최적화
 * - 렌더링 성능 개선
 */
export const getFlatListOptimizationProps = () => {
  const baseProps = {
    removeClippedSubviews: true,
    maxToRenderPerBatch: 5, // 한 번에 렌더링할 아이템 수 (성능 최적화)
    updateCellsBatchingPeriod: 30, // 배치 업데이트 주기 (더 빠름)
    initialNumToRender: 8, // 초기 렌더링 아이템 수 (빠른 첫 화면)
    windowSize: 8, // 뷰포트 주변 유지할 아이템 수
    onEndReachedThreshold: 0.1, // 스크롤 끝 감지 임계값 (더 빠른 트리거)
    disableIntervalMomentum: false, // iOS 스크롤 모멘텀 유지
    scrollEventThrottle: 16, // 스크롤 이벤트 스로틀 (60fps)
    getItemLayout: (data: any, index: number) => ({
      length: 200, // 예상 아이템 높이
      offset: 200 * index,
      index,
    }),
  };

  if (Platform.OS === "android") {
    return {
      ...baseProps,
      // Android 특화 최적화 (더 엄격한 메모리 관리)
      maxToRenderPerBatch: 3,
      initialNumToRender: 6,
      windowSize: 6,
      removeClippedSubviews: true,
    };
  }

  if (Platform.OS === "ios") {
    return {
      ...baseProps,
      // iOS 특화 최적화 (더 부드러운 스크롤)
      maxToRenderPerBatch: 6,
      initialNumToRender: 10,
      windowSize: 10,
    };
  }

  // 웹 환경 (가장 엄격한 메모리 관리)
  return {
    ...baseProps,
    removeClippedSubviews: false, // 웹에서는 메모리 효율성 문제로 비활성화
    maxToRenderPerBatch: 8,
    initialNumToRender: 12,
    windowSize: 12,
    // 웹 특화 최적화
    scrollEventThrottle: 8, // 더 빈번한 이벤트
  };
};

/**
 * 피드 전용 FlatList 최적화 설정
 * 일반 리스트보다 더 엄격한 메모리 관리
 */
export const getFeedFlatListOptimizationProps = () => {
  const baseProps = getFlatListOptimizationProps();

  return {
    ...baseProps,
    // 피드 특화 최적화
    maxToRenderPerBatch: Math.max(1, baseProps.maxToRenderPerBatch - 2),
    initialNumToRender: Math.max(3, baseProps.initialNumToRender - 2),
    windowSize: Math.max(3, baseProps.windowSize - 2),
    // 메모리 누수 방지
    legacyImplementation: false,
    // 큰 리스트 최적화
    maintainVisibleContentPosition: {
      minIndexForVisible: 0,
      autoscrollToTopThreshold: 10,
    },
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
