import React, { useCallback, useMemo } from "react";
import { FlatList, View, Text, ViewStyle, TextStyle, ActivityIndicator } from "react-native";
import PostCard, { Post } from "./PostCard"; // Import PostCard and the Post type from it
import PostCardSkeleton from "./PostCardSkeleton";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { useTranslation, TRANSLATION_KEYS } from "@/lib/i18n/useTranslation";
import { isWeb } from "@/lib/platform";
import { getFeedFlatListOptimizationProps } from "@/lib/platform/optimization";

interface FeedListProps {
  posts: Post[];
  fetching?: boolean;
  loadingText?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
  ListFooterComponent?: React.ComponentType<any> | React.ReactElement | null;
  ListEmptyComponent?: React.ComponentType<any> | React.ReactElement | null;
  onEndReached?: () => void;
  onPostUpdated?: (updatedPost: any) => void;
  onFeedRefresh?: () => void;
}

/**
 * A reusable component to render a list of posts in a FlatList.
 * It uses the PostCard component to render each individual post and follows
 * the NativeWind v4 `className` pattern for styling.
 */
export default function FeedList({
  posts,
  fetching,
  loadingText,
  onRefresh,
  refreshing,
  ListHeaderComponent,
  ListFooterComponent,
  ListEmptyComponent,
  onEndReached,
  onPostUpdated,
  onFeedRefresh,
}: FeedListProps) {
  const { themed, theme } = useAppTheme();
  const { t } = useTranslation();

  // 디버깅: 웹 환경 확인
  // React.useEffect(() => {
    //console.log("FeedList 환경 확인:", {
    //   isWeb: isWeb(),
    //   platform: typeof window !== "undefined" ? "browser" : "native",
    //   windowWidth: typeof window !== "undefined" ? window.innerWidth : "N/A",
    // });
  // }, []);

  // 메모이제이션된 렌더 함수들
  const renderItem = useCallback(
    ({ item }: { item: Post }) => (
      <View style={isWeb() ? themed($webItemContainer) : undefined}>
        <PostCard post={item} onPostUpdated={onPostUpdated} onRefresh={onFeedRefresh} />
      </View>
    ),
    [themed, onPostUpdated, onFeedRefresh],
  );

  const keyExtractor = useCallback((item: Post) => item.id, []);

  const ItemSeparator = useCallback(
    () => <View style={themed($separator)} />,
    [themed],
  );

  const EmptyComponent = useCallback(
    () => (
      <View style={isWeb() ? themed($webItemContainer) : undefined}>
        <View style={themed($emptyContainer)}>
          <Text style={themed($emptyTitle)}>
            {t(TRANSLATION_KEYS.FEED_NO_POSTS)}
          </Text>
          {/* <Text style={themed($emptySubtitle)}>
            {t(TRANSLATION_KEYS.FEED_PULL_REFRESH)}
          </Text> */}
        </View>
      </View>
    ),
    [themed, t],
  );

  // 로딩 상태 확인 (fetching 중이고 posts가 비어있는 경우)
  const isLoading = fetching && posts.length === 0;

  // 플랫폼별 성능 최적화 설정 (피드 전용)
  const optimizationProps = useMemo(() => getFeedFlatListOptimizationProps(), []);

  // 성능 최적화를 위한 FlatList props 메모이제이션
  const flatListProps = useMemo(
    () => ({
      data: posts,
      renderItem,
      keyExtractor,
      ItemSeparatorComponent: ItemSeparator,
      ListHeaderComponent,
      ListEmptyComponent: ListEmptyComponent || EmptyComponent,
      onRefresh,
      refreshing,
      onEndReached,
      onEndReachedThreshold: 0.5,
      ListFooterComponent,
      // 플랫폼별 성능 최적화 props
      ...optimizationProps,
    }),
    [
      posts,
      renderItem,
      keyExtractor,
      ItemSeparator,
      ListHeaderComponent,
      ListEmptyComponent,
      EmptyComponent,
      onRefresh,
      refreshing,
      onEndReached,
      ListFooterComponent,
      optimizationProps,
    ],
  );

  // 로딩 상태일 때 스켈레톤 UI 표시
  if (isLoading) {
    return (
      <View style={themed($skeletonContainer)}>
        <PostCardSkeleton count={6} />
        <View style={themed($loadingIndicator)}>
          <ActivityIndicator size="large" color={theme.colors.tint} />
          <Text style={themed($loadingText)}>
            {loadingText || "피드를 불러오는 중..."}
          </Text>
        </View>
      </View>
    );
  }

  if (isWeb()) {
    // 웹 환경에서는 외부 컨테이너로 감싸서 중앙 정렬
    return (
      <View style={themed($webOuterContainer)}>
        <FlatList
          {...flatListProps}
          style={themed($webFlatListContainer)}
          contentContainerStyle={themed($webContentContainer)}
          showsVerticalScrollIndicator={true}
        />
      </View>
    );
  }

  // 모바일 환경에서는 기본 FlatList (스크롤바 표시)
  return (
    <FlatList
      {...flatListProps}
      style={themed($container)}
      showsVerticalScrollIndicator={true}
    />
  );
}

// --- Styles ---
const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.background,
});

// 로딩 관련 스타일 (profile.tsx에서 가져옴)
const $loadingContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingVertical: spacing.xl,
});

const $loadingText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 16,
  color: colors.textDim,
  marginTop: spacing.sm,
});

// 스켈레톤 UI 관련 스타일
const $skeletonContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.md,
});

const $loadingIndicator: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  paddingVertical: spacing.xl,
  paddingHorizontal: spacing.md,
});

// 웹 전용 스타일들
const $webOuterContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
  alignItems: "center", // 중앙 정렬
  paddingHorizontal: 16, // 최소 여백
});

const $webFlatListContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 640, // 고정 너비
  maxWidth: "100%", // 반응형
  backgroundColor: colors.background,
});

const $webContentContainer: ThemedStyle<ViewStyle> = () => ({
  // paddingVertical: 8, // 상하 여백
});

const $webItemContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: "100%", // 부모 컨테이너(640px)의 전체 너비 사용
  backgroundColor: colors.background,
  // 카드 스타일
  borderRadius: 12,
  marginBottom: 8,
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
});

const $separator: ThemedStyle<ViewStyle> = () => ({
  height: 0, // PostCard에서 marginBottom으로 간격 처리
  backgroundColor: "transparent",
});

const $emptyContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  marginTop: spacing.xxxl,
  padding: spacing.md,
});

const $emptyTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
  color: colors.text,
  textAlign: "center",
});

const $emptySubtitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 14,
  color: colors.textDim,
  textAlign: "center",
  marginTop: spacing.xs,
});
