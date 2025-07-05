import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";

// Define a basic type for the user object for better type safety
interface User {
  avatar: string;
  nickname: string;
  bio: string;
}

interface ProfileHeaderProps {
  user: User;
}

export default function ProfileHeader({ user }: ProfileHeaderProps) {
  return (
    <View style={styles.container}>
      <Image source={{ uri: user.avatar }} style={styles.avatar} />
      <Text style={styles.nickname}>{user.nickname}</Text>
      <Text style={styles.bio}>{user.bio}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    padding: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  nickname: {
    fontWeight: "bold",
    fontSize: 18,
  },
  bio: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
});
