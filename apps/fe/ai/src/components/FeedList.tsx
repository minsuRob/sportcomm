import React from "react";
import { FlatList } from "react-native";
import PostCard from "./PostCard";

// Define a basic type for a post object for better type safety.
// You can expand this with other properties that a post might have.
interface Post {
  id: string | number;
  [key: string]: any; // Allow other properties
}

interface FeedListProps {
  posts: Post[];
}

export default function FeedList({ posts }: FeedListProps) {
  return (
    <FlatList
      data={posts}
      renderItem={({ item }) => <PostCard post={item} />}
      keyExtractor={(item) => item.id.toString()}
    />
  );
}
