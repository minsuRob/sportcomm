import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from "react-native";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { usePostInteractions } from "../hooks/usePostInteractions";
import PostHeader, { PostType } from "./shared/PostHeader";
import PostMedia, { Media } from "./shared/PostMedia";
import PostActions from "./shared/PostActions";
import { getWebReadableTextStyle } from "./layout/WebCenteredLayout";
import { isWeb } from "@/lib/platform";

// --- Type Definitions ---
export { PostType, Media };

export interface User {
  id: string;
  nickname: string;
  profileImageUrl?: string;
  isFollowing?: boolean;
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
  onPostUpdated?: (updatedPost: any) => void;
}

// --- The Component ---
export default function PostCard({ post, onPostUpdated }: PostCardProps) {
  const { themed } = useAppTheme();
  const router = useRouter();

  // 게시물 상호작용 훅 사용
  const {
    currentUserId,
    isLiked,
    likeCount,
    isFollowing,
    isLikeProcessing,
    isLikeError,
    handleLike,
    handleFollowToggle,
  } = usePostInteractions({
    postId: post.id,
    authorId: post.author.id,
    authorName: post.author.nickname,
    initialLikeCount: post.likeCount,
    initialIsLiked: post.isLiked,
    initialIsFollowing: post.author.isFollowing || false,
  });

  /**
   * 게시물 상세 페이지로 이동하는 함수
   */
  const handlePostPress = () => {
    router.push({
      pathname: "/post/[postId]",
      params: { postId: post.id },
    });
  };

  return (
    <View style={themed($container)}>
      {/* 미디어가 있는 경우 - 이미지 위에 콘텐츠 오버레이 */}
      {post.media.length > 0 ? (
        <TouchableOpacity onPress={handlePostPress} activeOpacity={0.9}>
          <View style={themed($mediaContainer)}>
            <PostMedia
              media={post.media}
              onPress={handlePostPress}
              variant="feed"
            />
            {/* 그라데이션 오버레이 */}
            <View style={themed($gradientOverlay)} />

            {/* 콘텐츠 오버레이 */}
            <View style={themed($contentOverlay)}>
              <Text style={themed($authorName)}>{post.author.nickname}</Text>
              <Text style={themed($overlayContent)} numberOfLines={3}>
                {post.content}
              </Text>
              <Text style={themed($timestamp)}>
                {(() => {
                  const now = new Date();
                  const postDate = new Date(post.createdAt);
                  const diffHours = Math.floor(
                    (now.getTime() - postDate.getTime()) / (1000 * 60 * 60),
                  );

                  if (diffHours < 1) return "방금 전";
                  if (diffHours < 24) return `${diffHours}h`;
                  return postDate.toLocaleDateString("ko-KR");
                })()}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      ) : (
        /* 미디어가 없는 경우 - 기존 레이아웃 */
        <View>
          <PostHeader
            post={{
              id: post.id,
              title: undefined,
              content: post.content,
              author: post.author,
              createdAt: post.createdAt,
              type: post.type,
            }}
            currentUserId={currentUserId}
            isFollowing={isFollowing}
            onFollowToggle={handleFollowToggle}
            onPress={handlePostPress}
            onPostUpdated={onPostUpdated}
          />

          <TouchableOpacity onPress={handlePostPress} activeOpacity={0.7}>
            <Text
              style={[
                themed($content),
                isWeb() ? themed(getWebReadableTextStyle()) : undefined,
              ]}
            >
              {post.content}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 액션 버튼 - 좋아요, 댓글, 리포스트만 */}
      <PostActions
        isLiked={isLiked}
        isLikeProcessing={isLikeProcessing}
        isLikeError={isLikeError}
        onLike={handleLike}
        onComment={() =>
          router.push({
            pathname: "/post/[postId]",
            params: { postId: post.id },
          })
        }
        onRepost={() => {}}
        variant="feed"
        likeCount={likeCount}
        commentCount={post.commentCount}
        shareCount={67} // 임시 값
      />
    </View>
  );
}

// --- 스타일 정의 ---
const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  marginBottom: spacing.sm,
  borderRadius: 12,
  overflow: "hidden",
  // 웹에서 추가 여백
  ...(isWeb() && {
    marginHorizontal: spacing.md,
  }),
});

const $mediaContainer: ThemedStyle<ViewStyle> = () => ({
  position: "relative",
  aspectRatio: 16 / 9,
  borderRadius: 12,
  overflow: "hidden",
});

const $gradientOverlay: ThemedStyle<ViewStyle> = () => ({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0, 0, 0, 0.4)",
  zIndex: 1,
});

const $contentOverlay: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  padding: spacing.md,
  zIndex: 2,
});

const $authorName: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 14,
  fontWeight: "500",
  marginBottom: 4,
});

const $overlayContent: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 20,
  fontWeight: "bold",
  lineHeight: 26,
  marginBottom: 8,
});

const $timestamp: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 14,
  fontWeight: "500",
  opacity: 0.9,
});

const $content: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  marginVertical: spacing.sm,
  fontSize: isWeb() ? 15 : 16,
  color: colors.text,
  lineHeight: isWeb() ? 1.6 : undefined,
  paddingHorizontal: spacing.md,
});
