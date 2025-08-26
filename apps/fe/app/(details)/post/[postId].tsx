import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { useTranslation, TRANSLATION_KEYS } from "@/lib/i18n/useTranslation";
import { usePostDetail } from "@/lib/hooks/usePostDetail";
import { usePostInteractions } from "../../../hooks/usePostInteractions";
import PostHeader from "@/components/shared/PostHeader";
import PostMedia from "@/components/shared/PostMedia";
import PostStats from "@/components/shared/PostStats";
import PostActions from "@/components/shared/PostActions";
import CommentSection from "@/components/CommentSection";
import ReportModal from "@/components/ReportModal";

const { width: screenWidth } = Dimensions.get("window");

/**
 * 게시물 상세 페이지 컴포넌트
 * 최적화된 통합 쿼리와 깔끔한 카드 디자인을 적용했습니다
 */
export default function PostDetailScreen() {
  const { themed, theme } = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { postId } = useLocalSearchParams<{ postId: string }>();

  // 상태 관리
  const [showReportModal, setShowReportModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // 최적화된 게시물 데이터 훅
  const {
    post,
    currentUser,
    loading,
    error,
    refetch,
  } = usePostDetail({
    postId: postId || "",
  });

  // 게시물 상호작용 훅 - 초기값을 post 데이터에서 가져옴
  const {
    currentUserId,
    isLiked,
    likeCount,
    isFollowing,
    isBookmarked,
    isLikeProcessing,
    isBookmarkProcessing,
    isLikeError,
    handleLike,
    handleFollowToggle,
    handleBookmark,
  } = usePostInteractions({
    postId: postId || "",
    authorId: post?.author.id || "",
    authorName: post?.author.nickname || "",
    initialLikeCount: post?.likeCount || 0,
    initialIsLiked: post?.isLiked || false,
    initialIsFollowing: false, // TODO: 별도 쿼리로 팔로우 상태 확인
    initialIsBookmarked: post?.isBookmarked || false,
  });

  /**
   * 뒤로가기 버튼 핸들러
   */
  const handleGoBack = useCallback(() => {
    router.back();
  }, [router]);

  /**
   * 댓글 추가 후 새로고침 핸들러
   */
  const handleCommentAdded = useCallback(async () => {
    try {
      await refetch({ fetchPolicy: "network-only" });
    } catch (error) {
      console.error("댓글 추가 후 새로고침 실패:", error);
    }
  }, [refetch]);

  /**
   * 공유 핸들러
   */
  const handleShare = useCallback(() => {
    // TODO: 공유 기능 구현
    console.log("게시물 공유:", postId);
  }, [postId]);

  /**
   * 새로고침 핸들러
   */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch({ fetchPolicy: "network-only" });
    } catch (error) {
      console.error("새로고침 실패:", error);
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  /**
   * 신고 모달 열기
   */
  const handleOpenReportModal = useCallback(() => {
    setShowReportModal(true);
  }, []);

  /**
   * 게시물 업데이트 핸들러
   */
  const handlePostUpdated = useCallback(async () => {
    await refetch({ fetchPolicy: "network-only" });
  }, [refetch]);

  // 헤더 컴포넌트 메모이제이션
  const HeaderComponent = useMemo(
    () => (
      <View style={themed($header)}>
        <TouchableOpacity onPress={handleGoBack} style={themed($backButton)}>
          <Ionicons name="arrow-back" color={theme.colors.text} size={24} />
        </TouchableOpacity>

        <View style={themed($headerCenter)}>
          <Text style={themed($headerTitle)}>
            {t(TRANSLATION_KEYS.POST_TITLE)}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleRefresh}
          style={themed($refreshButton)}
          disabled={refreshing}
        >
          <Ionicons
            name="refresh"
            color={refreshing ? theme.colors.textDim : theme.colors.text}
            size={20}
          />
        </TouchableOpacity>
      </View>
    ),
    [
      themed,
      theme.colors,
      handleGoBack,
      handleRefresh,
      refreshing,
      t,
    ]
  );

  // 로딩 상태
  if (loading) {
    return (
      <View style={themed($container)}>
        {HeaderComponent}
        <View style={themed($loadingContainer)}>
          <ActivityIndicator size="large" color={theme.colors.tint} />
          <Text style={themed($loadingText)}>
            {t(TRANSLATION_KEYS.POST_LOADING)}
          </Text>
        </View>
      </View>
    );
  }

  // 에러 상태
  if (error || !post) {
    console.error("Post detail error:", error);
    return (
      <View style={themed($container)}>
        {HeaderComponent}
        <View style={themed($errorContainer)}>
          <MaterialIcons name="error-outline" size={48} color={theme.colors.error} />
          <Text style={themed($errorText)}>
            {error?.message || t(TRANSLATION_KEYS.POST_NOT_FOUND)}
          </Text>
          <TouchableOpacity style={themed($retryButton)} onPress={handleGoBack}>
            <Text style={themed($retryButtonText)}>
              {t(TRANSLATION_KEYS.POST_GO_BACK)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={themed($container)}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* 헤더 */}
      {HeaderComponent}

      <ScrollView
        style={themed($scrollContainer)}
        showsVerticalScrollIndicator={false}

      >
        {/* 메인 게시물 카드 */}
        <View style={themed($postCard)}>
          {/* 게시물 헤더 */}
          <PostHeader
            post={{
              id: post.id,
              title: post.title,
              content: post.content,
              author: post.author,
              createdAt: post.createdAt,
              teamId: post.teamId || "default",
            }}
            currentUserId={currentUserId}
            isFollowing={isFollowing}
            onFollowToggle={handleFollowToggle}
            showFollowButton={currentUserId !== post.author.id}
            onPostUpdated={handlePostUpdated}
          />

          {/* 게시물 내용 */}
          <View style={themed($postContent)}>
            <Text style={themed($contentText)}>{post.content}</Text>
          </View>

          {/* 미디어 섹션 */}
          {post.media.length > 0 && (
            <View style={themed($mediaSection)}>
              <PostMedia media={post.media} variant="detail" />
            </View>
          )}

          {/* 태그 섹션 */}
          {post.tags.length > 0 && (
            <View style={themed($tagsSection)}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {post.tags.map((tag) => (
                  <View
                    key={tag.id}
                    style={[
                      themed($tag),
                      { backgroundColor: tag.color || theme.colors.tint },
                    ]}
                  >
                    <Text style={themed($tagText)}>#{tag.name}</Text>
                  </View>
                ))}
              </ScrollView>
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
            isBookmarked={isBookmarked}
            isLikeProcessing={isLikeProcessing}
            isBookmarkProcessing={isBookmarkProcessing}
            isLikeError={isLikeError}
            onLike={handleLike}
            onBookmark={handleBookmark}
            onShare={handleShare}
            variant="detail"
          />
        </View>

        {/* 댓글 섹션 */}
        <View style={themed($commentsCard)}>
          <CommentSection
            postId={post.id}
            comments={post.comments || []}
            currentUser={currentUser}
            onCommentAdded={handleCommentAdded}
            postAuthorId={post.author?.id}
          />
        </View>
      </ScrollView>

      {/* 신고 모달 */}
      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        postId={post.id}
      />
    </KeyboardAvoidingView>
  );
}

// --- 스타일 정의 ---
const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
});

const $header: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
  backgroundColor: colors.background,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
  elevation: 2,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 2,
});

const $backButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.xs,
  borderRadius: 20,
});

const $headerCenter: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  alignItems: "center",
  marginHorizontal: 16,
});

const $headerTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
  fontWeight: "bold",
  color: colors.text,
});

const $refreshButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.xs,
  borderRadius: 20,
});

const $loadingContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: colors.background,
  padding: spacing.lg,
});

const $loadingText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  marginTop: spacing.md,
  fontSize: 16,
  color: colors.textDim,
  textAlign: "center",
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
  marginTop: spacing.md,
  marginBottom: spacing.lg,
});

const $retryButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.tint,
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
  borderRadius: 8,
  elevation: 2,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.2,
  shadowRadius: 2,
});

const $retryButtonText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 16,
  fontWeight: "600",
});

const $scrollContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $postCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  marginHorizontal: spacing.md,
  marginTop: spacing.md,
  borderRadius: 12,
  elevation: 3,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  overflow: "hidden",
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

const $tagsSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingBottom: spacing.md,
});

const $tag: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 16,
  marginRight: spacing.xs,
});

const $tagText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 12,
  fontWeight: "500",
});

const $commentsCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  marginHorizontal: spacing.md,
  marginTop: spacing.md,
  marginBottom: spacing.lg,
  borderRadius: 12,
  elevation: 3,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  overflow: "hidden",
});
