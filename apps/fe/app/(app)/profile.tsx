import React, { useCallback } from "react";
import {
  View,
  ScrollView,
  Text,
  ActivityIndicator,
  Button,
  RefreshControl,
} from "react-native";
import { useQuery } from "urql";

import ProfileHeader from "@/components/ProfileHeader";
import FeedList from "@/components/FeedList";
import { GET_POSTS } from "@/lib/graphql";
import { Post } from "@/components/PostCard"; // Corrected import path for Post type

// This data would typically be fetched from a user-specific API endpoint.
// For example, a `GET_USER_PROFILE` query.
const mockUser = {
  nickname: "Robert",
  bio: "Sports enthusiast. Fan of the home team. Catch me at the next game!",
  profileImageUrl: "https://i.pravatar.cc/150?u=robert",
};

// The shape of the GraphQL response for the posts query.
interface PostsQueryResponse {
  posts: {
    posts: Post[];
  };
}

export default function ProfileScreen() {
  // In a real app, this `authorId` would come from the authenticated user's state.
  const authorId = "a_hardcoded_user_id_for_now"; // Placeholder

  const [result, executeQuery] = useQuery<PostsQueryResponse>({
    query: GET_POSTS,
    // The variables now use the correct 'input' structure.
    // We filter by a placeholder authorId to simulate fetching user-specific posts.
    variables: {
      input: {
        limit: 10,
        page: 1,
        // In a real implementation, you would pass the actual user's ID here.
        // authorId: "..."
      },
    },
  });

  const { data, fetching, error } = result;

  const handleRefresh = useCallback(() => {
    executeQuery({ requestPolicy: "network-only" });
  }, [executeQuery]);

  // Initial loading state
  if (fetching && !data) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-background p-4">
        <Text className="text-destructive text-lg text-center mb-4">
          Failed to load profile posts: {error.message}
        </Text>
        <Button title="Retry" onPress={handleRefresh} />
      </View>
    );
  }

  // The actual user posts from the API response.
  // The data now directly matches the `Post` type, so less transformation is needed.
  const userPosts: Post[] = data?.posts?.posts || [];

  return (
    <ScrollView
      className="flex-1 bg-background"
      refreshControl={
        <RefreshControl refreshing={fetching} onRefresh={handleRefresh} />
      }
    >
      <ProfileHeader user={mockUser} />

      <View className="h-px bg-border my-4" />

      <Text className="text-lg font-bold px-4 mb-2 text-foreground">
        My Posts
      </Text>

      {/* The FeedList component is reused to display the user's posts. */}
      {/* Note: This now passes the actual posts fetched from the API. */}
      <FeedList posts={userPosts} />
    </ScrollView>
  );
}
