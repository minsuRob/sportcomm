import React from "react";
import { FlatList, View, Text } from "react-native";
import { styled } from "nativewind/styled";

// --- Type Definitions ---
export interface Comment {
  id: string;
  content: string;
  author: {
    id: string;
    nickname: string;
    profileImageUrl?: string;
  };
  createdAt: string;
}

interface CommentListProps {
  comments: Comment[];
}

// --- Styled Components ---
const CommentContainer = styled(
  View,
  "p-3 border-b border-gray-200 dark:border-gray-700",
);
const CommentHeader = styled(View, "flex-row items-center");
const Nickname = styled(Text, "font-semibold text-gray-800 dark:text-gray-200");
const Timestamp = styled(Text, "ml-2 text-xs text-gray-500");
const Content = styled(Text, "mt-1 text-gray-700 dark:text-gray-300");
const EmptyContainer = styled(View, "p-8 items-center");
const EmptyText = styled(Text, "text-gray-500");

const CommentItem = ({ item }: { item: Comment }) => {
  return (
    <CommentContainer>
      <CommentHeader>
        <Nickname>{item.author.nickname}</Nickname>
        <Timestamp>{new Date(item.createdAt).toLocaleDateString()}</Timestamp>
      </CommentHeader>
      <Content>{item.content}</Content>
    </CommentContainer>
  );
};

export default function CommentList({ comments }: CommentListProps) {
  if (!comments || comments.length === 0) {
    return (
      <EmptyContainer>
        <EmptyText>No comments yet. Be the first to comment!</EmptyText>
      </EmptyContainer>
    );
  }

  return (
    <FlatList
      data={comments}
      renderItem={({ item }) => <CommentItem item={item} />}
      keyExtractor={(item) => item.id}
      className="bg-white dark:bg-gray-800"
    />
  );
}
