import React from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  ActivityIndicator,
  Button,
} from "react-native";
import { useQuery } from "urql";

import ProfileHeader from "../../components/ProfileHeader";
import FeedList from "../../components/FeedList";
import { GET_POSTS } from "../../lib/graphql";
import { Post } from "./feed";

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
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
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
    <ScrollView style={styles.container}>
      <ProfileHeader user={mockUser} />
      <View style={styles.divider} />
      <Text style={styles.postsHeader}>My Posts</Text>
      <FeedList posts={userPosts} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "red",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 16,
  },
  postsHeader: {
    fontSize: 18,
    fontWeight: "bold",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
});
