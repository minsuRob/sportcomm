import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";

// Define basic types for the post object for better type safety
interface Post {
  user: {
    avatar: string;
    nickname: string;
  };
  content: string;
  images?: string[];
  likes: number;
  comments: number;
}

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Image source={{ uri: post.user.avatar }} style={styles.avatar} />
        <Text style={styles.nickname}>{post.user.nickname}</Text>
      </View>
      <Text style={styles.content}>{post.content}</Text>
      {post.images && post.images.length > 0 && (
        <Image source={{ uri: post.images[0] }} style={styles.postImage} />
      )}
      <View style={styles.actions}>
        <TouchableOpacity>
          <Text>❤️ {post.likes}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text>💬 {post.comments}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text>🔁</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  nickname: {
    marginLeft: 8,
    fontWeight: "bold",
  },
  content: {
    marginVertical: 8,
  },
  postImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
  },
  actions: {
    flexDirection: "row",
    marginTop: 8,
  },
  actionButton: {
    marginLeft: 16,
  },
});
