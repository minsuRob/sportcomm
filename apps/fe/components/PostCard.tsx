import React, { useState, useEffect } from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { useMutation } from "urql";
import { TOGGLE_LIKE } from "@/lib/graphql";
import { Eye } from "@/lib/icons/Eye";
import { Heart } from "@/lib/icons/Heart";
import { MessageCircle } from "@/lib/icons/MessageCircle";
import { MoreHorizontal } from "@/lib/icons/MoreHorizontal";
import { Repeat } from "@/lib/icons/Repeat";

// --- Type Definitions ---
export enum PostType {
  ANALYSIS = "ANALYSIS",
  CHEERING = "CHEERING",
  HIGHLIGHT = "HIGHLIGHT",
}

export interface User {
  id: string;
  nickname: string;
  profileImageUrl?: string;
}

export interface Media {
  id: string;
  url: string;
  type: "image" | "video";
}

export interface Comment {
  id: string;
}

// This is the canonical Post type used throughout the frontend.
// It matches the backend GraphQL schema.
export interface Post {
  id: string;
  content: string;
  author: User;
  media: Media[];
  comments: Comment[];
  createdAt: string;
  type: PostType;
  viewCount: number;
  likeCount: number; // Changed from likesCount
  commentCount: number; // Changed from commentsCount
  isLiked: boolean;
  isMock?: boolean;
}

interface PostCardProps {
  post: Post;
}

// --- Helper Function ---
const getPostTypeStyle = (type: PostType) => {
  switch (type) {
    case PostType.ANALYSIS:
      return { badge: "bg-indigo-500", text: "Analysis" };
    case PostType.HIGHLIGHT:
      return { badge: "bg-amber-500", text: "Highlight" };
    case PostType.CHEERING:
    default:
      return { badge: "bg-green-500", text: "Cheering" };
  }
};

// --- The Component ---
export default function PostCard({ post }: PostCardProps) {
  // Use state to manage client-side interactions like "liking" a post.
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likeCount, setLikeCount] = useState(post.likeCount);

  // Sync state with props if the post object changes (e.g., after a refresh).
  useEffect(() => {
    setIsLiked(post.isLiked);
    setLikeCount(post.likeCount);
  }, [post.isLiked, post.likeCount]);

  // URQL mutation hook for toggling a like.
  const [likeResult, executeLike] = useMutation(TOGGLE_LIKE);

  const handleLike = () => {
    // Optimistically update the UI for a better user experience.
    const newLikedStatus = !isLiked;
    const newLikeCount = newLikedStatus ? likeCount + 1 : likeCount - 1;
    setIsLiked(newLikedStatus);
    setLikeCount(newLikeCount);

    // Execute the mutation.
    executeLike({ postId: post.id }).then((result) => {
      // If the mutation fails, revert the optimistic update.
      if (result.error) {
        console.error("Failed to toggle like:", result.error);
        setIsLiked(!newLikedStatus);
        setLikeCount(likeCount); // Revert to the original count
      }
    });
  };

  const firstMedia = post.media?.[0];
  const avatarUrl =
    post.author.profileImageUrl ||
    `https://i.pravatar.cc/150?u=${post.author.id}`;
  const postTypeStyle = getPostTypeStyle(post.type);

  return (
    <View className="bg-card p-4 border-b border-border">
      {/* Header */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Image
            source={{ uri: avatarUrl }}
            className="w-12 h-12 rounded-full"
          />
          <View className="ml-3">
            <Text className="font-bold text-lg text-foreground">
              {post.author.nickname}
            </Text>
            <Text className="text-xs text-muted-foreground">
              {new Date(post.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
        <TouchableOpacity>
          <MoreHorizontal className="text-muted-foreground" size={24} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <Text className="my-3 text-base text-foreground">{post.content}</Text>

      {/* Media */}
      {firstMedia?.type === "image" && (
        <View className="relative">
          <Image
            source={{ uri: firstMedia.url }}
            className="w-full h-56 rounded-lg bg-secondary"
          />
          <View
            className={`absolute top-2 right-2 ${postTypeStyle.badge} px-2 py-1 rounded-full`}
          >
            <Text className="text-white text-xs font-bold">
              {postTypeStyle.text}
            </Text>
          </View>
        </View>
      )}

      {/* Stats */}
      <View className="flex-row items-center mt-3">
        <Heart className="text-muted-foreground" size={16} />
        <Text className="ml-1 text-sm text-muted-foreground mr-4">
          {likeCount} Likes
        </Text>
        <MessageCircle className="text-muted-foreground" size={16} />
        <Text className="ml-1 text-sm text-muted-foreground mr-4">
          {post.commentCount} Comments
        </Text>
        <Eye className="text-muted-foreground" size={16} />
        <Text className="ml-1 text-sm text-muted-foreground">
          {post.viewCount} Views
        </Text>
      </View>

      {/* Action Bar */}
      <View className="flex-row justify-around items-center mt-3 pt-3 border-t border-border">
        <TouchableOpacity
          onPress={handleLike}
          disabled={likeResult.fetching}
          className="flex-row items-center"
        >
          <Heart
            size={22}
            className={isLiked ? "text-destructive" : "text-muted-foreground"}
            fill={isLiked ? "hsl(var(--destructive))" : "transparent"}
          />
          <Text
            className={`ml-2 text-sm font-medium ${
              isLiked ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            Like
          </Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-row items-center">
          <MessageCircle size={22} className="text-muted-foreground" />
          <Text className="ml-2 text-sm font-medium text-muted-foreground">
            Comment
          </Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-row items-center">
          <Repeat size={22} className="text-muted-foreground" />
          <Text className="ml-2 text-sm font-medium text-muted-foreground">
            Repost
          </Text>
        </TouchableOpacity>
      </View>

      {/* Comment Preview */}
      {post.commentCount > 0 && (
        <View className="mt-2">
          <TouchableOpacity>
            <Text className="text-sm text-muted-foreground">
              View all {post.commentCount} comments
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
