import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  ImageStyle,
} from "react-native";
import { useMutation } from "urql";
import { useRouter } from "expo-router";
import { TOGGLE_LIKE } from "@/lib/graphql";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
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
      return { color: "#6366f1", text: "Analysis" };
    case PostType.HIGHLIGHT:
      return { color: "#f59e0b", text: "Highlight" };
    case PostType.CHEERING:
    default:
      return { color: "#10b981", text: "Cheering" };
  }
};

// --- The Component ---
export default function PostCard({ post }: PostCardProps) {
  const { themed, theme } = useAppTheme();
  const router = useRouter();

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

  /**
   * 게시물 상세 페이지로 이동하는 함수
   */
  const handlePostPress = () => {
    router.push(`/(app)/post/${post.id}` as any);
  };

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
    <View style={themed($container)}>
      {/* Header */}
      <View style={themed($header)}>
        <TouchableOpacity
          style={themed($headerLeft)}
          onPress={handlePostPress}
          activeOpacity={0.7}
        >
          <Image source={{ uri: avatarUrl }} style={themed($avatar)} />
          <View style={themed($userInfo)}>
            <Text style={themed($username)}>{post.author.nickname}</Text>
            <Text style={themed($timestamp)}>
              {new Date(post.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity>
          <MoreHorizontal color={theme.colors.textDim} size={24} />
        </TouchableOpacity>
      </View>

      {/* Content - 클릭 가능 */}
      <TouchableOpacity onPress={handlePostPress} activeOpacity={0.7}>
        <Text style={themed($content)}>{post.content}</Text>
      </TouchableOpacity>

      {/* Media - 클릭 가능 */}
      {firstMedia?.type === "image" && (
        <TouchableOpacity
          style={themed($mediaContainer)}
          onPress={handlePostPress}
          activeOpacity={0.9}
        >
          <Image source={{ uri: firstMedia.url }} style={themed($mediaImage)} />
          <View
            style={[themed($badge), { backgroundColor: postTypeStyle.color }]}
          >
            <Text style={themed($badgeText)}>{postTypeStyle.text}</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Stats */}
      <View style={themed($stats)}>
        <Heart color={theme.colors.textDim} size={16} />
        <Text style={themed($statText)}>{likeCount} Likes</Text>
        <MessageCircle color={theme.colors.textDim} size={16} />
        <Text style={themed($statText)}>{post.commentCount} Comments</Text>
        <Eye color={theme.colors.textDim} size={16} />
        <Text style={themed($statText)}>{post.viewCount} Views</Text>
      </View>

      {/* Action Bar */}
      <View style={themed($actionBar)}>
        <TouchableOpacity
          onPress={handleLike}
          disabled={likeResult.fetching}
          style={themed($actionButton)}
        >
          <Heart
            size={22}
            color={isLiked ? theme.colors.error : theme.colors.textDim}
            fill={isLiked ? theme.colors.error : "transparent"}
          />
          <Text
            style={[
              themed($actionText),
              { color: isLiked ? theme.colors.error : theme.colors.textDim },
            ]}
          >
            Like
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={themed($actionButton)}>
          <MessageCircle size={22} color={theme.colors.textDim} />
          <Text style={themed($actionText)}>Comment</Text>
        </TouchableOpacity>
        <TouchableOpacity style={themed($actionButton)}>
          <Repeat size={22} color={theme.colors.textDim} />
          <Text style={themed($actionText)}>Repost</Text>
        </TouchableOpacity>
      </View>

      {/* Comment Preview */}
      {post.commentCount > 0 && (
        <View style={themed($commentPreview)}>
          <TouchableOpacity>
            <Text style={themed($commentPreviewText)}>
              View all {post.commentCount} comments
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// --- Styles ---
const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  padding: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $header: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
});

const $headerLeft: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  alignItems: "center",
});

const $avatar: ThemedStyle<ImageStyle> = () => ({
  width: 48,
  height: 48,
  borderRadius: 24,
});

const $userInfo: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginLeft: spacing.sm,
});

const $username: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontWeight: "bold",
  fontSize: 18,
  color: colors.text,
});

const $timestamp: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
});

const $content: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  marginVertical: spacing.sm,
  fontSize: 16,
  color: colors.text,
});

const $mediaContainer: ThemedStyle<ViewStyle> = () => ({
  position: "relative",
});

const $mediaImage: ThemedStyle<ImageStyle> = ({ colors }) => ({
  width: "100%",
  height: 224,
  borderRadius: 8,
  backgroundColor: colors.separator,
});

const $badge: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  position: "absolute",
  top: spacing.xs,
  right: spacing.xs,
  paddingHorizontal: spacing.xs,
  paddingVertical: spacing.xxxs,
  borderRadius: 16,
});

const $badgeText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 12,
  fontWeight: "bold",
});

const $stats: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  marginTop: spacing.sm,
});

const $statText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  marginLeft: spacing.xxxs,
  fontSize: 14,
  color: colors.textDim,
  marginRight: spacing.md,
});

const $actionBar: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-around",
  alignItems: "center",
  marginTop: spacing.sm,
  paddingTop: spacing.sm,
  borderTopWidth: 1,
  borderTopColor: colors.border,
});

const $actionButton: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  alignItems: "center",
});

const $actionText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  marginLeft: spacing.xs,
  fontSize: 14,
  fontWeight: "500",
  color: colors.textDim,
});

const $commentPreview: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.xs,
});

const $commentPreviewText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
});
