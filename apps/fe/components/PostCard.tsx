import React, { useState, useEffect } from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { styled } from "nativewind";
import {
  Heart,
  MessageCircle,
  Repeat,
  MoreHorizontal,
  Eye,
} from "lucide-react-native";
import { useMutation } from "urql";
import { TOGGLE_LIKE } from "../lib/graphql";

// --- Type Definitions ---
// In a larger app, these would live in a shared types file or be generated from the GraphQL schema.
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

// The feed query only fetches comment IDs for performance.
export interface Comment {
  id: string;
}

// This is the data shape the PostCard component expects as a prop.
// It's derived from the GraphQL query result in FeedScreen.
export interface Post {
  id: string;
  content: string;
  author: User;
  media: Media[];
  comments: Comment[];
  createdAt: string;
  type: PostType;
  viewCount: number;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
}

interface PostCardProps {
  post: Post;
}

// --- Styled Components ---
const CardContainer = styled(
  View,
  "bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700",
);
const Header = styled(View, "flex-row items-center justify-between");
const UserInfo = styled(View, "flex-row items-center");
const Avatar = styled(Image, "w-12 h-12 rounded-full");
const Nickname = styled(
  Text,
  "ml-3 font-bold text-lg text-gray-900 dark:text-white",
);
const PostContent = styled(
  Text,
  "my-3 text-base text-gray-800 dark:text-gray-300",
);
const MediaImage = styled(Image, "w-full h-56 rounded-lg bg-gray-200");
const ActionBar = styled(
  View,
  "flex-row justify-around items-center mt-3 pt-3 border-t border-gray-100 dark:border-gray-600",
);
const ActionButton = styled(TouchableOpacity, "flex-row items-center");
const ActionText = styled(
  Text,
  "ml-2 text-sm text-gray-600 dark:text-gray-400",
);
const StatsContainer = styled(View, "flex-row items-center mt-2");
const StatText = styled(Text, "text-sm text-gray-500 dark:text-gray-400 mr-4");
const CommentPreviewContainer = styled(View, "mt-2");
const CommentText = styled(Text, "text-sm text-gray-500 dark:text-gray-400");
const PostTypeText = styled(Text, "text-white text-xs font-bold");

// --- Helper Function ---
const getPostTypeStyle = (type: PostType) => {
  switch (type) {
    case PostType.ANALYSIS:
      return { badge: "bg-indigo-500", text: "ANALYSIS" };
    case PostType.HIGHLIGHT:
      return { badge: "bg-amber-500", text: "HIGHLIGHT" };
    case PostType.CHEERING:
    default:
      return { badge: "bg-green-500", text: "CHEERING" };
  }
};

// --- The Component ---
export default function PostCard({ post }: PostCardProps) {
  // Local state for optimistic UI updates on "like" actions.
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likesCount);

  // Effect to re-sync local state if the parent passes a changed post prop (e.g., on list refresh).
  useEffect(() => {
    setIsLiked(post.isLiked);
    setLikesCount(post.likesCount);
  }, [post.isLiked, post.likesCount]);

  // urql mutation hook for toggling likes.
  const [likeResult, executeLike] = useMutation(TOGGLE_LIKE);

  const handleLike = () => {
    // 1. Optimistically update the UI.
    const newLikedStatus = !isLiked;
    const newLikesCount = newLikedStatus ? likesCount + 1 : likesCount - 1;
    setIsLiked(newLikedStatus);
    setLikesCount(newLikesCount);

    // 2. Execute the mutation in the background.
    executeLike({ postId: post.id }).then((result) => {
      // 3. If the mutation fails, revert the optimistic update.
      if (result.error) {
        console.error("Failed to toggle like:", result.error);
        setIsLiked(!newLikedStatus); // Revert liked status
        setLikesCount(likesCount); // Revert likes count
        // In a real app, you would show a toast message to the user here.
      }
      // On success, the backend is now in sync with our optimistic state. No further action is needed
      // unless the mutation returns new data that we need to sync.
    });
  };

  const firstMedia = post.media?.[0];
  const avatarUrl =
    post.author.profileImageUrl ||
    `https://i.pravatar.cc/150?u=${post.author.id}`;
  const postTypeStyle = getPostTypeStyle(post.type);
  const likeColor = isLiked ? "#EF4444" : "#6B7280"; // Red if liked, gray otherwise

  return (
    <CardContainer>
      {/* Header */}
      <Header>
        <UserInfo>
          <Avatar source={{ uri: avatarUrl }} />
          <View>
            <Nickname>{post.author.nickname}</Nickname>
            <Text className="ml-3 text-xs text-gray-500 dark:text-gray-400">
              {new Date(post.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </UserInfo>
        <TouchableOpacity>
          <MoreHorizontal size={24} color="#6B7280" />
        </TouchableOpacity>
      </Header>

      {/* Content */}
      <PostContent>{post.content}</PostContent>

      {/* Media */}
      {firstMedia?.type === "image" && (
        <View className="relative">
          <MediaImage source={{ uri: firstMedia.url }} />
          <View
            className={`absolute top-2 right-2 ${postTypeStyle.badge} px-2 py-1 rounded-full`}
          >
            <PostTypeText>{postTypeStyle.text}</PostTypeText>
          </View>
        </View>
      )}

      {/* Stats */}
      <StatsContainer>
        <Heart size={16} color="#6B7280" />
        <StatText className="ml-1">{likesCount} Likes</StatText>
        <MessageCircle size={16} color="#6B7280" />
        <StatText className="ml-1">{post.commentsCount} Comments</StatText>
        <Eye size={16} color="#6B7280" />
        <StatText className="ml-1">{post.viewCount} Views</StatText>
      </StatsContainer>

      {/* Action Bar */}
      <ActionBar>
        <ActionButton onPress={handleLike} disabled={likeResult.fetching}>
          <Heart
            size={22}
            color={likeColor}
            fill={isLiked ? likeColor : "none"}
          />
          <ActionText style={{ color: likeColor }}>Like</ActionText>
        </ActionButton>
        <ActionButton>
          <MessageCircle size={22} color="#6B7280" />
          <ActionText>Comment</ActionText>
        </ActionButton>
        <ActionButton>
          <Repeat size={22} color="#6B7280" />
          <ActionText>Repost</ActionText>
        </ActionButton>
      </ActionBar>

      {/* Comment Preview */}
      {post.commentsCount > 0 && (
        <CommentPreviewContainer>
          <TouchableOpacity>
            <CommentText>View all {post.commentsCount} comments</CommentText>
          </TouchableOpacity>
        </CommentPreviewContainer>
      )}
    </CardContainer>
  );
}
