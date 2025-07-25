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
import PostStats from "./shared/PostStats";
import PostActions from "./shared/PostActions";
import ReportModal from "./ReportModal";

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
}

// --- The Component ---
export default function PostCard({ post }: PostCardProps) {
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
    showReportModal,
    handleLike,
    handleFollowToggle,
    handleMorePress,
    closeReportModal,
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
      {/* 헤더 */}
      <PostHeader
        author={post.author}
        createdAt={post.createdAt}
        postType={post.type}
        currentUserId={currentUserId}
        isFollowing={isFollowing}
        onFollowToggle={handleFollowToggle}
        onMorePress={handleMorePress}
        onPress={handlePostPress}
      />

      {/* 콘텐츠 - 클릭 가능 */}
      <TouchableOpacity onPress={handlePostPress} activeOpacity={0.7}>
        <Text style={themed($content)}>{post.content}</Text>
      </TouchableOpacity>

      {/* 미디어 */}
      {post.media.length > 0 && (
        <PostMedia
          media={post.media}
          onPress={handlePostPress}
          variant="feed"
        />
      )}

      {/* 통계 */}
      <PostStats
        likeCount={likeCount}
        commentCount={post.commentCount}
        viewCount={post.viewCount}
        variant="feed"
      />

      {/* 액션 버튼 */}
      <PostActions
        isLiked={isLiked}
        isLikeProcessing={isLikeProcessing}
        isLikeError={isLikeError}
        onLike={handleLike}
        variant="feed"
      />

      {/* 댓글 미리보기 */}
      {post.commentCount > 0 && (
        <View style={themed($commentPreview)}>
          <TouchableOpacity onPress={handlePostPress}>
            <Text style={themed($commentPreviewText)}>
              댓글 {post.commentCount}개 모두 보기
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 신고 모달 */}
      <ReportModal
        visible={showReportModal}
        onClose={closeReportModal}
        postId={post.id}
        reportedUserId={post.author.id}
        reportedUserName={post.author.nickname}
      />
    </View>
  );
}

// --- 스타일 정의 ---
const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  padding: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $content: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  marginVertical: spacing.sm,
  fontSize: 16,
  color: colors.text,
});

const $commentPreview: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.xs,
});

const $commentPreviewText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
});
