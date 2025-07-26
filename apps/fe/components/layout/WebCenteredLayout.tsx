/**
 * 웹 환경용 중앙 정렬 레이아웃 컴포넌트
 *
 * PC 웹 환경에서 모바일 중심 SNS 앱(Threads, Instagram)처럼
 * 중앙 칼럼에 피드가 집중되도록 구성하는 레이아웃입니다.
 */

import React from "react";
import { View, ViewStyle, ScrollView } from "react-native";
import { isWeb } from "@/lib/platform";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";

interface WebCenteredLayoutProps {
  children: React.ReactNode;
  scrollable?: boolean;
  showsVerticalScrollIndicator?: boolean;
  contentContainerStyle?: ViewStyle;
  onScroll?: (event: any) => void;
  refreshControl?: React.ReactElement;
}

/**
 * 웹 환경에서 중앙 정렬된 콘텐츠 레이아웃
 *
 * 특징:
 * - 최대 640px 너비로 제한
 * - 중앙 정렬
 * - 양 옆 여백 처리
 * - 모바일에서는 전체 너비 사용
 */
export default function WebCenteredLayout({
  children,
  scrollable = true,
  showsVerticalScrollIndicator = false,
  contentContainerStyle,
  onScroll,
  refreshControl,
}: WebCenteredLayoutProps) {
  const { themed } = useAppTheme();

  // 모바일 환경에서는 기본 레이아웃 사용
  if (!isWeb()) {
    if (scrollable) {
      return (
        <ScrollView
          style={themed($mobileContainer)}
          showsVerticalScrollIndicator={showsVerticalScrollIndicator}
          contentContainerStyle={contentContainerStyle}
          onScroll={onScroll}
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      );
    }

    return (
      <View style={[themed($mobileContainer), contentContainerStyle]}>
        {children}
      </View>
    );
  }

  // 웹 환경에서는 중앙 정렬 레이아웃 사용
  if (scrollable) {
    return (
      <View style={themed($webOuterContainer)}>
        <ScrollView
          style={themed($webScrollContainer)}
          contentContainerStyle={[
            themed($webContentContainer),
            contentContainerStyle,
          ]}
          showsVerticalScrollIndicator={showsVerticalScrollIndicator}
          onScroll={onScroll}
          refreshControl={refreshControl}
        >
          <View style={themed($webInnerContainer)}>{children}</View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={themed($webOuterContainer)}>
      <View style={[themed($webContentContainer), contentContainerStyle]}>
        <View style={themed($webInnerContainer)}>{children}</View>
      </View>
    </View>
  );
}

// --- 스타일 정의 ---

// 모바일 환경용 스타일
const $mobileContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
});

// 웹 환경용 스타일
const $webOuterContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
  // 전체 화면을 차지하되 중앙 정렬을 위한 컨테이너
});

const $webScrollContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  // 스크롤 컨테이너는 전체 너비 사용
});

const $webContentContainer: ThemedStyle<ViewStyle> = () => ({
  flexGrow: 1,
  // 중앙 정렬을 위한 flex 설정
  alignItems: "center",
  justifyContent: "flex-start",
  paddingHorizontal: 16, // 최소 여백 보장
});

const $webInnerContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: "100%",
  maxWidth: 640, // Instagram/Threads 스타일의 최대 너비
  minHeight: "100%",
  backgroundColor: colors.background,
  // 카드형 피드를 위한 설정
  paddingVertical: 8,
});

/**
 * 웹 환경에서 피드 아이템용 카드 스타일
 */
export const getWebFeedCardStyle =
  (): ThemedStyle<ViewStyle> =>
  ({ colors, spacing }) => ({
    backgroundColor: colors.background,
    borderRadius: isWeb() ? 12 : 0, // 웹에서만 둥근 모서리
    marginBottom: spacing.sm,
    // 웹에서 카드 효과를 위한 그림자 (선택적)
    ...(isWeb() && {
      shadowColor: colors.border,
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
      borderWidth: 1,
      borderColor: colors.border + "30",
    }),
  });

/**
 * 웹 환경에서 섹션 간격용 스타일
 */
export const getWebSectionSpacing =
  (): ThemedStyle<ViewStyle> =>
  ({ spacing }) => ({
    paddingHorizontal: isWeb() ? 0 : spacing.md, // 웹에서는 내부 여백 제거
    marginBottom: spacing.md,
  });

/**
 * 웹 환경에서 텍스트 가독성을 위한 스타일
 */
export const getWebReadableTextStyle = (): ThemedStyle<ViewStyle> => () => ({
  // 가독성을 위한 줄 길이 제한 (이미 640px로 제한되어 있음)
  lineHeight: isWeb() ? 1.6 : undefined, // 웹에서 줄 간격 증가
});
