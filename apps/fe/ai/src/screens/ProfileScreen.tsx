import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  ActivityIndicator,
} from "react-native";
import ProfileHeader from "../components/ProfileHeader";
import FeedList from "../components/FeedList";
import { getUserProfile, getUserPosts } from "../api/user"; // Assuming API functions exist

// Define basic types for user and post for better type safety
interface User {
  id: string | number;
  avatar: string;
  nickname: string;
  bio: string;
}

interface Post {
  id: string | number;
  [key: string]: any;
}

// Assume we have a user ID, in a real app this might come from auth context or route params
const USER_ID = "1";

export default function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        setError(null);
        // In a real app, you might fetch user profile and posts separately or together
        // For this example, we'll simulate fetching them.
        const [userData, userPosts] = await Promise.all([
          getUserProfile(USER_ID),
          getUserPosts(USER_ID),
        ]);
        setUser(userData);
        setPosts(userPosts);
      } catch (e) {
        setError("Failed to load profile. Please try again.");
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error || !user) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || "User not found."}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <ProfileHeader user={user} />
      {/* A divider component could be placed here */}
      <FeedList posts={posts} />
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
  },
});
