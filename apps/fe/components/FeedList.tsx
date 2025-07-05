import React from "react";
import { FlatList, View, Text } from "react-native";
import PostCard, { Post } from "./PostCard"; // Import PostCard and the Post type from it

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
  const renderItem = ({ item }: { item: Post }) => <PostCard post={item} />;

  const keyExtractor = (item: Post) => item.id;

  return (
    <FlatList
      data={posts}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ItemSeparatorComponent={() => <View className="h-2 bg-secondary" />}
      ListEmptyComponent={
        <View className="flex-1 justify-center items-center mt-12 p-4">
          <Text className="text-lg text-foreground">No posts available.</Text>
          <Text className="text-sm text-muted-foreground mt-2">
            Pull down to refresh.
          </Text>
        </View>
      }
      onRefresh={onRefresh}
      refreshing={refreshing}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={ListFooterComponent}
      className="bg-background"
    />
  );
}
