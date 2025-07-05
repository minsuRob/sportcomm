import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, View, StyleSheet, Text } from "react-native";
import { getFeedPosts } from "../api/post"; // Assuming API function exists
import FeedList from "../components/FeedList";

// Define a basic type for a post object for better type safety.
// This should match the type definition in FeedList.tsx
interface Post {
  id: string | number;
  [key: string]: any;
}

export default function FeedScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      setError(null);
      const data = await getFeedPosts();
      setPosts(data);
    } catch (e) {
      setError("Failed to fetch feed. Please try again.");
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchPosts();
  }, [fetchPosts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPosts();
  }, [fetchPosts]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  // To implement pull-to-refresh, FeedList would need to accept `onRefresh` and `refreshing` props
  // and pass them to its underlying FlatList's RefreshControl.
  // For now, this structure is set up to support it.
  return (
    <View style={styles.container}>
      <FeedList posts={posts} />
    </View>
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
  },
});
