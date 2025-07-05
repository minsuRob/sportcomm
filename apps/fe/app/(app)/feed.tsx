import React, { useState, useEffect, useCallback } from "react";
import { ActivityIndicator, View, Button, Text } from "react-native";
import { useQuery } from "urql";

import { GET_POSTS } from "@/lib/graphql";
import {
  createMockFeedData,
  Post as PostTypeData,
  PostType,
} from "@/lib/mockData";
import FeedList from "@/components/FeedList";

// This is the shape of the data coming from the GraphQL query
interface GqlPost {
  id: string;
  content: string;
  createdAt: string;
  type: PostType;
  viewCount: number;
  author: {
    id: string;
    nickname: string;
    profileImageUrl?: string;
  };
  media: {
    id: string;
    url: string;
    type: "image" | "video";
  }[];
  comments: {
    id: string;
  }[];
}

// Re-export the Post type from mockData to be used within this screen and other screens.
export type Post = PostTypeData;

const PAGE_SIZE = 10;

export default function FeedScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // --- urql Query Hook ---
  const [result, executeQuery] = useQuery<{ posts: GqlPost[] }>({
    query: GET_POSTS,
    variables: { skip: 0, take: PAGE_SIZE },
  });

  const { data, fetching, error } = result;

  // --- Data Handling Effect ---
  useEffect(() => {
    // Case 1: Handle a successful API response.
    if (data?.posts) {
      if (data.posts.length > 0) {
        const transformedPosts: Post[] = data.posts.map((p) => ({
          ...p,
          isLiked: false, // Default value, will be managed by a 'like' mutation
          likesCount: Math.floor(Math.random() * 200), // Placeholder until backend provides this
          commentsCount: p.comments.length,
          isMock: false,
        }));

        setPosts((currentPosts) => {
          const wasShowingMocks =
            currentPosts.length > 0 && currentPosts[0].isMock;
          if (isRefreshing || wasShowingMocks) {
            return transformedPosts;
          }
          const postMap = new Map(currentPosts.map((p) => [p.id, p]));
          transformedPosts.forEach((p) => postMap.set(p.id, p));
          const mergedPosts = Array.from(postMap.values());
          return mergedPosts.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
        });
      } else if (posts.length === 0) {
        // Case 2: API returned no posts on initial load.
        console.log(
          "Feed is empty. Populating with mock data for demonstration.",
        );
        setPosts(createMockFeedData(5));
      }
    } else if (error && posts.length === 0) {
      // Case 3: Error on initial load, show mock data instead of an error message.
      console.log(
        "Error fetching feed. Populating with mock data for demonstration.",
        error.message,
      );
      setPosts(createMockFeedData(5));
    }

    // After processing data or error, if we were refreshing, stop the indicator.
    if (isRefreshing) {
      setIsRefreshing(false);
    }
  }, [data, error, isRefreshing, posts.length]);

  // --- Event Handlers ---
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    executeQuery({ requestPolicy: "network-only" });
  }, [executeQuery]);

  const handleLoadMore = useCallback(() => {
    const hasMoreData = data?.posts?.length === PAGE_SIZE;
    if (fetching || !hasMoreData) {
      return;
    }
    executeQuery({
      variables: { skip: posts.length, take: PAGE_SIZE },
    });
  }, [fetching, executeQuery, posts.length, data?.posts]);

  // --- Render Logic ---
  if (fetching && posts.length === 0 && !isRefreshing) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error && posts.length === 0) {
    return (
      <View className="flex-1 justify-center items-center bg-background p-4">
        <Text className="text-destructive text-lg text-center mb-4">
          An error occurred while fetching the feed: {error.message}
        </Text>
        <Button title="Retry" onPress={handleRefresh} />
      </View>
    );
  }

  return (
    <FeedList
      posts={posts}
      refreshing={isRefreshing}
      onRefresh={handleRefresh}
      onEndReached={handleLoadMore}
      ListFooterComponent={() => {
        if (!fetching || posts.length === 0 || isRefreshing) return null;
        return (
          <View className="p-4">
            <ActivityIndicator size="small" />
          </View>
        );
      }}
    />
  );
}
