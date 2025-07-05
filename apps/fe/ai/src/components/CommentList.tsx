import React from "react";
import { FlatList, Text } from "react-native";

// Basic types for props for better type safety
interface Comment {
  id: string | number;
  user: {
    nickname: string;
  };
  content: string;
}

interface CommentListProps {
  comments: Comment[];
}

export default function CommentList({ comments }: CommentListProps) {
  return (
    <FlatList
      data={comments}
      renderItem={({ item }) => (
        <Text>
          {item.user.nickname}: {item.content}
        </Text>
      )}
      keyExtractor={(item) => item.id.toString()}
    />
  );
}
