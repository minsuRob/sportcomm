/**
 * 전역 웹 레이아웃 래퍼 컴포넌트
 *
 * 모든 화면에 자동으로 웹 중앙 정렬을 적용합니다.
 * 모바일에서는 기존과 동일하게 작동하고,
 * 웹에서는 640px 최대 너비로 중앙 정렬됩니다.
 *
 * 이미지 비율 최적화를 위한 반응형 컨테이너를 제공합니다.
 */

import React from "react";
import { View, ViewStyle, useWindowDimensions } from "react-native";
import { isWeb } from "@/lib/platform";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { usePathname } from "expo-router";
import { useResponsive } from "@/lib/hooks/useResponsive";

interface GlobalWebLayoutProps {
  children: React.ReactNode;
  disableWebLayout?: boolean; // 특정 화면에서 웹 레이아웃을 비활성화하고 싶을 때
}

/**
 * 메인 앱 화면인지 확인하는 함수
 * 메인 앱 화면(feed, search, profile)에서는 사이드바 레이아웃을 사용
 */
const isMainAppScreen = (pathname: string): boolean => {
  const mainScreens = [
    "/feed",
    "/search",
    "/profile",
    "/(app)/feed",
    "/(app)/search",
    "/(app)/profile",
  ];
  return (
    mainScreens.some((screen) => pathname.includes(screen)) || pathname === "/"
  );
};

/**
 * 전역 웹 레이아웃 컴포넌트
 *
 * 사용법:
 * - 기본: 모든 화면에 자동 적용
 * - 비활성화: disableWebLayout={true} 전달
 */
export default function GlobalWebLayout({
  children,
  disableWebLayout = false,
}: GlobalWebLayoutProps) {
  const { themed } = useAppTheme();
  const pathname = usePathname();
  const { isDesktop } = useResponsive();
  const { width: screenWidth } = useWindowDimensions();

  // 웹 레이아웃 비활성화 또는 모바일 환경인 경우 그대로 반환
  if (disableWebLayout || !isWeb()) {
    return <>{children}</>;
  }

  // 메인 앱 화면에서는 사이드바 레이아웃이 적용되므로 추가 래퍼 불필요
  if (isMainAppScreen(pathname)) {
    return <>{children}</>;
  }

  // 모달이나 기타 화면에서는 640px 중앙 정렬 레이아웃 적용
  return (
    <View style={themed($webContainer)}>
      <View
        style={[
          themed($webContent),
          {
            maxWidth: isDesktop ? 640 : screenWidth * 0.95,
            paddingHorizontal: isDesktop ? 16 : 8,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

// --- 스타일 정의 ---

const $webContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
  alignItems: "center", // 중앙 정렬
  paddingHorizontal: 8, // 최소 여백 (반응형으로 조정됨)
});

const $webContent: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: "100%",
  flex: 1,
  backgroundColor: colors.background,
  // 이미지 비율 최적화를 위한 여백 조정
  ...(isWeb() && {
    paddingTop: 8,
    paddingBottom: 8,
  }),
});

/**
 * 특정 화면에서 웹 레이아웃을 비활성화하기 위한 HOC
 */
export function withoutWebLayout<T extends object>(
  Component: React.ComponentType<T>,
): React.ComponentType<T> {
  return function WrappedComponent(props: T) {
    return (
      <GlobalWebLayout disableWebLayout={true}>
        <Component {...props} />
      </GlobalWebLayout>
    );
  };
}

/**
 * 웹 레이아웃이 적용된 화면인지 확인하는 훅
 */
export function useIsWebLayoutActive(): boolean {
  return isWeb();
}

/**
 * 웹 환경에서 모달이나 전체 화면 컴포넌트용 스타일
 * 이미지 비율 최적화를 고려한 스타일
 */
export const getWebModalStyle =
  (isDesktop: boolean = false): ThemedStyle<ViewStyle> =>
  ({ colors }) => ({
    ...(isWeb() && {
      alignSelf: "center",
      width: "100%",
      maxWidth: isDesktop ? 640 : "95%",
      marginHorizontal: isDesktop ? 16 : 8,
      paddingHorizontal: isDesktop ? 16 : 8,
    }),
    backgroundColor: colors.background,
  });

/**
 * 이미지 컨테이너를 위한 최적화된 스타일
 */
export const getImageContainerStyle =
  (isDesktop: boolean = false): ThemedStyle<ViewStyle> =>
  ({ colors }) => ({
    width: "100%",
    ...(isWeb() && {
      maxWidth: isDesktop ? 640 : "100%",
      alignSelf: "center",
    }),
    backgroundColor: colors.background,
  });
