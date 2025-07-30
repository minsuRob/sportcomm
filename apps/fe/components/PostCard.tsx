import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  Image,
  ImageStyle,
} from "react-native";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { usePostInteractions } from "../hooks/usePostInteractions";
import PostHeader, { PostType } from "./shared/PostHeader";
import { Media } from "./shared/PostMedia";
import PostActions from "./shared/PostActions";
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

  // 이미지 미디어만 필터링
  const imageMedia = post.media.filter(
    (item) => item.type === "image" || item.type === "IMAGE"
  );

  return (
    <View style={themed($container)}>
      {/* 미디어가 있는 경우 - 이미지 위에 콘텐츠 오버레이 */}
      {imageMedia.length > 0 ? (
        <TouchableOpacity onPress={handlePostPress} activeOpacity={0.9}>
          <View style={themed($mediaContainer)}>
            {/* 첫 번째 이미지만 표시 */}
            <Image
              source={{
                uri:
                  imageMedia[0]?.url ||
                  "https://lh3.googleusercontent.com/aida-public/AB6AXuBAs31Z9e7tE4MEe4qOvL8tmInV3OnopXRbbPUHDNNX03bqTEq8OptDvE69aED3dCTsdjrOwx-hh1WXCjmg5AYjZlUdYzfIIRgWjRUH-M9jwhugMxisjA2Z2Hd4ajK0GpMA-fJeZFJtEKyQiIn9dx72icpJF4oCeubT-vK2wYemuAfrGCJ7rPocUTEmkQX8nHZi448NpsOXSVMbeBOH4dfm6DlSZyuaL0ft8FIXoRor76NK0vugaMl5-BtfZCvuB-ZAfsCo_NUYfJ3k",
              }}
              style={themed($mediaImage)}
              resizeMode="cover"
              onLoad={() =>
                console.log("이미지 로드 성공:", imageMedia[0]?.url)
              }
              onError={(error) =>
                console.log("이미지 로드 실패:", error.nativeEvent.error)
              }
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
                    (now.getTime() - postDate.getTime()) / (1000 * 60 * 60)
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
        <View style={themed($textOnlyContainer)}>
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
            <Text style={themed($content)}>{post.content}</Text>
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
  marginBottom: spacing.md,
  marginHorizontal: spacing.md,
  borderRadius: 12,
  overflow: "hidden",
  // 웹에서 추가 여백
  ...(isWeb() && {
    marginHorizontal: spacing.lg,
  }),
});

const $mediaContainer: ThemedStyle<ViewStyle> = () => ({
  position: "relative",
  width: "100%",
  height: 200,
  borderRadius: 12,
  overflow: "hidden",
});

const $mediaImage: ThemedStyle<ImageStyle> = () => ({
  width: "100%",
  height: "100%",
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

const $textOnlyContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.md,
});

const $content: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  marginVertical: spacing.sm,
  fontSize: isWeb() ? 15 : 16,
  color: colors.text,
  lineHeight: isWeb() ? 1.6 : undefined,
});
