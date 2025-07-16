import React from "react";
import { FlatList, View, Text, ViewStyle, TextStyle } from "react-native";
import PostCard, { Post } from "./PostCard"; // Import PostCard and the Post type from it
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { useTranslation, TRANSLATION_KEYS } from "@/lib/i18n/useTranslation";

interface FeedListProps {
  posts: Post[];
  onRefresh?: () => void;
  refreshing?: boolean;
  ListFooterComponent?: React.ComponentType<any> | React.ReactElement | null;
  onEndReached?: () => void;
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
  onEndReached,
}: FeedListProps) {
  const { themed } = useAppTheme();
  const { t } = useTranslation();

  const renderItem = ({ item }: { item: Post }) => <PostCard post={item} />;

  const keyExtractor = (item: Post) => item.id;

  const ItemSeparator = () => <View style={themed($separator)} />;

  const EmptyComponent = () => (
    <View style={themed($emptyContainer)}>
      <Text style={themed($emptyTitle)}>
        {t(TRANSLATION_KEYS.FEED_NO_POSTS)}
      </Text>
      <Text style={themed($emptySubtitle)}>
        {t(TRANSLATION_KEYS.FEED_PULL_REFRESH)}
      </Text>
    </View>
  );

  return (
    <FlatList
      data={posts}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ItemSeparatorComponent={ItemSeparator}
      ListEmptyComponent={EmptyComponent}
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

const $separator: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  height: spacing.xs,
  backgroundColor: colors.separator,
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
