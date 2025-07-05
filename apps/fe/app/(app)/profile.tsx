import React from "react";
import {
  View,
  ScrollView,
  Text,
  ActivityIndicator,
  Button,
} from "react-native";
import { useQuery } from "urql";

import ProfileHeader from "@/components/ProfileHeader";
import FeedList from "@/components/FeedList";
import { GET_POSTS } from "@/lib/graphql";
import { Post } from "./feed"; // This relative path is fine

// In a real app, this data would be fetched from a user-specific API endpoint.
const mockUser = {
  nickname: "Robert",
  bio: "Sports enthusiast. Fan of the home team. Catch me at the next game!",
  profileImageUrl: "https://i.pravatar.cc/150?u=robert",
};

export default function ProfileScreen() {
  // For now, we'll fetch the generic feed posts as a placeholder for user-specific posts.
  // A real implementation would use a different query like `GetUserPosts(userId: "1")`.
  const [result, executeQuery] = useQuery<{ posts: Post[] }>({
    query: GET_POSTS,
    variables: { take: 10, skip: 0 },
  });

  const { data, fetching, error } = result;

  const handleRefresh = () => {
    executeQuery({ requestPolicy: "network-only" });
  };

  if (fetching && !data) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-background p-4">
        <Text className="text-destructive text-lg text-center mb-4">
          Failed to load profile: {error.message}
        </Text>
        <Button title="Retry" onPress={handleRefresh} />
      </View>
    );
  }

  // Transform data similarly to FeedScreen for display purposes.
  const userPosts: Post[] =
    data?.posts.map((p) => ({
      ...p,
      isLiked: Math.random() > 0.5,
      likesCount: Math.floor(Math.random() * 100),
      commentsCount: p.comments.length,
    })) || [];

  return (
    <ScrollView className="flex-1 bg-background">
      <ProfileHeader user={mockUser} />
      <View className="h-px bg-border my-4" />
      <Text className="text-lg font-bold px-4 mb-2 text-foreground">
        My Posts
      </Text>
      {/* The FeedList component is reused to display the user's posts. */}
      <FeedList posts={userPosts} />
    </ScrollView>
  );
}
