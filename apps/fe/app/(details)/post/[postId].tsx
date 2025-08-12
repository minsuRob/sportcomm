import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@apollo/client";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { useTranslation, TRANSLATION_KEYS } from "@/lib/i18n/useTranslation";
import { GET_POST_DETAIL } from "@/lib/graphql";
import { User, getSession } from "@/lib/auth";
import { usePostInteractions } from "../../../hooks/usePostInteractions";
import PostHeader, { PostType } from "@/components/shared/PostHeader";
import PostMedia from "@/components/shared/PostMedia";
import PostStats from "@/components/shared/PostStats";
import PostActions from "@/components/shared/PostActions";
import CommentSection from "@/components/CommentSection";
import ReportModal from "@/components/ReportModal";

// --- 타입 정의 ---
interface DetailedComment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    nickname: string;
    profileImageUrl?: string;
  };
}

interface DetailedPost {
  id: string;
  content: string;
  createdAt: string;
  type: PostType;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  isPinned: boolean;
  isPublic: boolean;
  author: {
    id: string;
    nickname: string;
    profileImageUrl?: string;
    role: string;
  };
  media: Array<{
    id: string;
    url: string;
    type: "image" | "video";
  }>;
  comments: DetailedComment[] | null;
}

interface PostDetailResponse {
  post: DetailedPost;
}

/**
 * 게시물 상세 페이지 컴포넌트
 * 게시물의 전체 내용, 댓글, 상호작용 기능을 제공합니다
 */
export default function PostDetailScreen() {
  const { themed, theme } = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { postId } = useLocalSearchParams<{ postId: string }>();

  // 상태 관리
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // GraphQL 쿼리 옵션을 useMemo로 생성하여 불필요한 재렌더링 방지
  // Apollo Client와 함께 GraphQL 쿼리 실행
  const {
    data,
    loading: fetching,
    error,
    refetch: refetchPost,
  } = useQuery<PostDetailResponse>(GET_POST_DETAIL, {
    variables: { id: postId },
    fetchPolicy: "cache-and-network", // 캐시와 네트워크 모두 사용하여 데이터 일관성 보장
    errorPolicy: "all", // 부분적 오류도 허용
    notifyOnNetworkStatusChange: true, // 네트워크 상태 변경 시 알림
  });

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
    postId: postId || "",
    authorId: data?.post?.author.id || "",
    authorName: data?.post?.author.nickname || "",
    initialLikeCount: data?.post?.likeCount || 0,
    initialIsLiked: false, // TODO: 실제 좋아요 상태 확인
    initialIsFollowing: false, // TODO: 실제 팔로우 상태 확인
  });

  // 사용자 세션 확인
  useEffect(() => {
    const checkSession = async () => {
      const { user } = await getSession();
      if (user) setCurrentUser(user);
    };
    checkSession();
  }, []);

  /**
   * 뒤로가기 버튼 핸들러
   */
  const handleGoBack = () => {
    router.back();
  };

  /**
   * 댓글 추가 후 새로고침 핸들러
   */
  const handleCommentAdded = useCallback(() => {
    refetchPost({ fetchPolicy: "network-only" });
  }, [refetchPost]);

  /**
   * 공유 핸들러
   */
  const handleShare = () => {
    // TODO: 공유 기능 구현
    console.log("게시물 공유");
  };

  // 로딩 상태
  if (fetching) {
    return (
      <View style={themed($loadingContainer)}>
        <ActivityIndicator size="large" color={theme.colors.tint} />
        <Text style={themed($loadingText)}>
          {t(TRANSLATION_KEYS.POST_LOADING)}
        </Text>
      </View>
    );
  }

  // 에러 상태
  if (error || !data?.post) {
    console.error("Post detail error:", error);
    return (
      <View style={themed($errorContainer)}>
        <Text style={themed($errorText)}>
          {error?.message || t(TRANSLATION_KEYS.POST_NOT_FOUND)}
        </Text>
        <TouchableOpacity style={themed($retryButton)} onPress={handleGoBack}>
          <Text style={themed($retryButtonText)}>
            {t(TRANSLATION_KEYS.POST_GO_BACK)}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const post = data.post;

  return (
    <KeyboardAvoidingView
      style={themed($container)}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* 헤더 */}
      <View style={themed($header)}>
        <TouchableOpacity onPress={handleGoBack} style={themed($backButton)}>
          <Ionicons name="arrow-back" color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={themed($headerTitle)}>
          {t(TRANSLATION_KEYS.POST_TITLE)}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={themed($scrollContainer)}
        showsVerticalScrollIndicator={false}
      >
        {/* 게시물 헤더 */}
        <PostHeader
          post={{
            id: post.id,
            title: undefined, // 상세 페이지에서는 title 정보가 없을 수 있음
            content: post.content,
            author: post.author,
            createdAt: post.createdAt,
            type: post.type,
          }}
          currentUserId={currentUserId}
          isFollowing={isFollowing}
          onFollowToggle={handleFollowToggle}
          showFollowButton={false} // 상세 페이지에서는 헤더에 팔로우 버튼 숨김
          onPostUpdated={(updatedPost) => {
            // 게시물 수정 후 페이지 새로고침
            refetchPost({ fetchPolicy: "network-only" });
          }}
        />

        {/* 게시물 내용 */}
        <View style={themed($postContent)}>
          <Text style={themed($contentText)}>{post.content}</Text>
        </View>

        {/* 미디어 */}
        {post.media.length > 0 && (
          <View style={themed($mediaSection)}>
            <PostMedia media={post.media} variant="detail" />
          </View>
        )}

        {/* 통계 정보 */}
        <PostStats
          likeCount={likeCount}
          commentCount={post.commentCount}
          viewCount={post.viewCount}
          variant="detail"
        />

        {/* 액션 버튼 */}
        <PostActions
          isLiked={isLiked}
          isLikeProcessing={isLikeProcessing}
          isLikeError={isLikeError}
          onLike={handleLike}
          onShare={handleShare}
          variant="detail"
        />

        {/* 댓글 섹션 */}
        <CommentSection
          postId={post.id}
          comments={post.comments || []}
          currentUser={currentUser}
          onCommentAdded={handleCommentAdded}
          postAuthorId={post.author?.id}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// --- 스타일 정의 ---
const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
});

const $loadingContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: colors.background,
});

const $loadingText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  marginTop: spacing.md,
  fontSize: 16,
  color: colors.textDim,
});

const $errorContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: colors.background,
  padding: spacing.lg,
});

const $errorText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 18,
  color: colors.error,
  textAlign: "center",
  marginBottom: spacing.lg,
});

const $retryButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.tint,
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
  borderRadius: 8,
});

const $retryButtonText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 16,
  fontWeight: "600",
});

const $header: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $backButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.xs,
});

const $headerTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
  fontWeight: "bold",
  color: colors.text,
});

const $scrollContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $postContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingBottom: spacing.md,
});

const $contentText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  lineHeight: 24,
  color: colors.text,
});

const $mediaSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingBottom: spacing.md,
});
