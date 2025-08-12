import React, { useCallback, useMemo } from "react";
import { FlatList, View, Text } from "react-native";
import { getFlatListOptimizationProps } from "@/lib/platform/optimization";

// --- Type Definitions ---
// This defines the shape of a single comment object.
export interface Comment {
  id: string;
  content: string;
  author: {
    id: string;
    nickname: string;
    profileImageUrl?: string;
  };
  createdAt: string;
}

interface CommentListProps {
  comments: Comment[];
}

// --- Sub-component for a single comment item ---
// This keeps the main component logic clean and focuses on rendering one item.
const CommentItem = React.memo(({ item }: { item: Comment }) => {
  return (
    <View className="p-3 border-b border-border">
      <View className="flex-row items-center">
        <Text className="font-semibold text-foreground">
          {item.author.nickname}
        </Text>
        <Text className="ml-2 text-xs text-muted-foreground">
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <Text className="mt-1 text-base text-foreground">{item.content}</Text>
    </View>
  );
});

/**
 * A reusable component to render a list of comments.
 * It follows the NativeWind v4 pattern of using `className` for styling.
 */
export default function CommentList({ comments }: CommentListProps) {
  // 메모이제이션된 렌더 함수들
  const renderItem = useCallback(
    ({ item }: { item: Comment }) => <CommentItem item={item} />,
    []
  );

  const keyExtractor = useCallback((item: Comment) => item.id, []);

  // 플랫폼별 최적화 props
  const optimizationProps = useMemo(() => getFlatListOptimizationProps(), []);

  // Handle the case where there are no comments to display.
  if (!comments || comments.length === 0) {
    return (
      <View className="p-8 items-center bg-card">
        <Text className="text-muted-foreground">
          No comments yet. Be the first to comment!
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={comments}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      className="bg-card"
      // 플랫폼별 성능 최적화 props
      {...optimizationProps}
    />
  );
}
