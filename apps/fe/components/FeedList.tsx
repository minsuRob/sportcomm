import React from "react";
import { FlatList, View, Text, ViewStyle, TextStyle } from "react-native";
import PostCard, { Post } from "./PostCard"; // Import PostCard and the Post type from it
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { useTranslation, TRANSLATION_KEYS } from "@/lib/i18n/useTranslation";
import { getWebFeedCardStyle } from "./layout/WebCenteredLayout";
import { isWeb } from "@/lib/platform";

interface FeedListProps {
  posts: Post[];
  onRefresh?: () => void;
  refreshing?: boolean;
  ListFooterComponent?: React.ComponentType<any> | React.ReactElement | null;
  ListEmptyComponent?: React.ComponentType<any> | React.ReactElement | null;
  onEndReached?: () => void;
  onPostUpdated?: (updatedPost: any) => void;
}

/**
 * A reusable component to render a list of posts in a FlatList.
 * It uses the PostCard component to render each individual post and follows
 * the NativeWind v4 `className` pattern for styling.
 */
export default function FeedList({
  posts,
  onRefresh,
  refreshing,
  ListFooterComponent,
  ListEmptyComponent,
  onEndReached,
  onPostUpdated,
}: FeedListProps) {
  const { themed } = useAppTheme();
  const { t } = useTranslation();

  // 디버깅: 웹 환경 확인
  React.useEffect(() => {
    console.log("FeedList 환경 확인:", {
      isWeb: isWeb(),
      platform: typeof window !== "undefined" ? "browser" : "native",
      windowWidth: typeof window !== "undefined" ? window.innerWidth : "N/A",
    });
  }, []);

  const renderItem = ({ item }: { item: Post }) => (
    <View style={isWeb() ? themed($webItemContainer) : undefined}>
      <PostCard post={item} onPostUpdated={onPostUpdated} />
    </View>
  );

  const keyExtractor = (item: Post) => item.id;

  const ItemSeparator = () => <View style={themed($separator)} />;

  const EmptyComponent = () => (
    <View style={isWeb() ? themed($webItemContainer) : undefined}>
      <View style={themed($emptyContainer)}>
        <Text style={themed($emptyTitle)}>
          {t(TRANSLATION_KEYS.FEED_NO_POSTS)}
        </Text>
        <Text style={themed($emptySubtitle)}>
          {t(TRANSLATION_KEYS.FEED_PULL_REFRESH)}
        </Text>
      </View>
    </View>
  );

  if (isWeb()) {
    // 웹 환경에서는 외부 컨테이너로 감싸서 중앙 정렬
    return (
      <View style={themed($webOuterContainer)}>
        <FlatList
          data={posts}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ItemSeparatorComponent={ItemSeparator}
          ListEmptyComponent={ListEmptyComponent || EmptyComponent}
          onRefresh={onRefresh}
          refreshing={refreshing}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={ListFooterComponent}
          style={themed($webFlatListContainer)}
          contentContainerStyle={themed($webContentContainer)}
        />
      </View>
    );
  }

  // 모바일 환경에서는 기본 FlatList
  return (
    <FlatList
      data={posts}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ItemSeparatorComponent={ItemSeparator}
      ListEmptyComponent={ListEmptyComponent || EmptyComponent}
      onRefresh={onRefresh}
      refreshing={refreshing}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={ListFooterComponent}
      style={themed($container)}
    />
  );
}

// --- Styles ---
const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.background,
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
  paddingVertical: 8, // 상하 여백
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

const $separator: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
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
