// sportcomm/apps/fe/app/(app)/feed.tsx
import React, { useState, useEffect, useCallback } from "react";
import { ActivityIndicator, View, Button, Text } from "react-native";
import { useQuery } from "urql";

import { GET_POSTS } from "@/lib/graphql";
import FeedList from "@/components/FeedList";
import { Post, PostType } from "@/components/PostCard"; // Use the Post type from the canonical component

// --- Type Definitions ---

// This is the shape of a single post object coming from the GraphQL query
interface GqlPost {
  id: string;
  content: string;
  createdAt: string;
  type: PostType;
  viewCount: number;
  likeCount: number;
  commentCount: number;
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

// The shape of the entire response for the posts query, including pagination
interface PostsQueryResponse {
  posts: {
    posts: GqlPost[];
    hasNext: boolean;
    page: number;
  };
}

const PAGE_SIZE = 10;

export default function FeedScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // --- urql Query Hook ---
  // The variables are now passed inside an 'input' object to match the backend resolver.
  const [result, executeQuery] = useQuery<PostsQueryResponse>({
    query: GET_POSTS,
    variables: { input: { page: 1, limit: PAGE_SIZE } },
  });

  const { data, fetching, error } = result;

  // --- Data Handling Effect ---
  useEffect(() => {
    // Only process data if the request was successful and returned posts
    if (data?.posts?.posts) {
      // Transform the GQL data into the frontend Post type
      // The property names like `likeCount` and `commentCount` now match directly.
      const newPosts: Post[] = data.posts.posts.map((p) => ({
        ...p,
        isLiked: false, // Default value, should be managed by a 'like' mutation
        isMock: false,
      }));

      // If it's a refresh (page 1), replace the list. Otherwise, append new unique posts.
      if (data.posts.page === 1) {
        setPosts(newPosts);
      } else {
        setPosts((currentPosts) => {
          const postMap = new Map(currentPosts.map((p) => [p.id, p]));
          newPosts.forEach((p) => postMap.set(p.id, p));
          const mergedPosts = Array.from(postMap.values());
          // Re-sort to maintain chronological order
          return mergedPosts.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
        });
      }
    }

    // Stop the refreshing indicator once data is processed
    if (isRefreshing) {
      setIsRefreshing(false);
    }
  }, [data, isRefreshing]);

  // --- Event Handlers ---
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    // Refetch from the first page
    executeQuery({
      requestPolicy: "network-only",
      variables: { input: { page: 1, limit: PAGE_SIZE } },
    });
  }, [executeQuery]);

  const handleLoadMore = useCallback(() => {
    const hasNextPage = data?.posts?.hasNext ?? false;
    // Prevent multiple fetches while one is already in progress
    if (fetching || !hasNextPage) {
      return;
    }
    // Calculate the next page from the last successful response
    const nextPage = (data?.posts?.page ?? 0) + 1;
    executeQuery({
      variables: { input: { page: nextPage, limit: PAGE_SIZE } },
    });
  }, [fetching, executeQuery, data]);

  // --- Render Logic ---

  // Show a loading spinner only on the initial load
  if (fetching && posts.length === 0 && !isRefreshing) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Show an error message if the initial fetch fails
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

  // Loading indicator for pagination
  const ListFooter = () => {
    if (!fetching || isRefreshing) return null;
    return (
      <View className="p-4">
        <ActivityIndicator size="small" />
      </View>
    );
  };

  return (
    <FeedList
      posts={posts}
      refreshing={isRefreshing}
      onRefresh={handleRefresh}
      onEndReached={handleLoadMore}
      ListFooterComponent={ListFooter}
    />
  );
}
