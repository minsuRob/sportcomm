import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { useTranslation, TRANSLATION_KEYS } from "@/lib/i18n/useTranslation";
import { usePostDetail } from "@/lib/hooks/usePostDetail";
import { usePostInteractions } from "../../hooks/usePostInteractions";
import PostHeader from "@/components/shared/PostHeader";
import PostMedia from "@/components/shared/PostMedia";

import PostActions from "@/components/shared/PostActions";
import CommentSection from "@/components/CommentSection";
import ReportModal from "@/components/ReportModal";

/**
 * 재사용 가능한 게시물 상세 컨텐츠 컴포넌트
 * - 페이지 / 모달 두 가지 형태로 표시 가능
 * - 기존 (details)/post/[postId].tsx 의 UI + 로직을 캡슐화
 * - variant 에 따라 헤더/레이아웃 차이를 최소한으로 분기
 * - initialPost 를 통해 피드에서 이미 로드된 데이터로 즉시(빠른) 1차 렌더 후 상세 쿼리 보강
 */
export interface PostDetailContentProps {
  postId: string; // 게시물 ID
  variant?: "page" | "modal"; // 표시 형태
  onClose?: () => void; // 모달 닫기 콜백 (modal 일 때 사용)
  onPostUpdated?: () => Promise<void> | void; // 게시물 수정/댓글 추가 후 상위 통지
  initialPost?: {
    id: string;
    title?: string;
    content: string;
    author?: { id: string; nickname: string; profileImageUrl?: string };
    createdAt?: string;
    teamId?: string;
    likeCount?: number;
    commentCount?: number;
    viewCount?: number;
    isLiked?: boolean;
    isBookmarked?: boolean;
    media?: Array<{
      id: string;
      url: string;
      type: "image" | "video" | "IMAGE" | "VIDEO";
    }>;
    tags?: Array<{ id: string; name: string; color?: string }>;
  };
}

export function PostDetailContent({
  postId,
  variant = "page",
  onClose,
  onPostUpdated,
  initialPost,
}: PostDetailContentProps) {
  const { themed, theme } = useAppTheme();
  const { t } = useTranslation();

  // 지역 상태
  const [showReportModal, setShowReportModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // 게시물/사용자 상세 데이터 (상세 쿼리)
  const {
    post: fetchedPost,
    currentUser,
    loading,
    error,
    refetch,
  } = usePostDetail({
    postId: postId || "",
  });

  /**
   * initialPost -> 상세 화면에서 필요한 필드 형태로 정규화
   * (fetchedPost 수신 전 임시/낙관적 뷰)
   */
  const normalizedInitialPost = useMemo(() => {
    if (!initialPost) return null;
    return {
      id: initialPost.id,
      title: initialPost.title,
      content: initialPost.content,
      createdAt: initialPost.createdAt || new Date().toISOString(),
      teamId: initialPost.teamId || "default",
      viewCount: initialPost.viewCount ?? 0,
      likeCount: initialPost.likeCount ?? 0,
      commentCount: initialPost.commentCount ?? 0,
      shareCount: 0,
      isPinned: false,
      isPublic: true,
      isLiked: initialPost.isLiked ?? false,
      isBookmarked: initialPost.isBookmarked ?? false,
      author: initialPost.author || { id: "", nickname: "" },
      media:
        initialPost.media?.map((m) => ({
          id: m.id,
          url: m.url,
          type:
            m.type === "IMAGE"
              ? "image"
              : m.type === "VIDEO"
                ? "video"
                : (m.type as "image" | "video"),
        })) || [],
      comments: [],
      tags:
        initialPost.tags?.map((t) => ({
          id: t.id,
          name: t.name,
          color: t.color || theme.colors.tint,
        })) || [],
    };
  }, [initialPost, theme.colors.tint]);

  // effective post (상세 데이터 우선, 없으면 초기 데이터)
  const post = fetchedPost || normalizedInitialPost;
  const isPartial = !fetchedPost && !!normalizedInitialPost;

  // 좋아요 / 팔로우 / 북마크 등 상호작용 상태 & 핸들러 (초기값에 initialPost 반영)
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
    authorId: post?.author?.id || "",
    authorName: post?.author?.nickname || "",
    initialLikeCount: post?.likeCount || 0,
    initialIsLiked: post?.isLiked || false,
    initialIsFollowing: false, // TODO: 팔로우 상태 별도 API 연동 시 초기값 반영
    initialIsBookmarked: post?.isBookmarked || false,
  });

  /**
   * 새로고침 로직
   */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch({ fetchPolicy: "network-only" });
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  /**
   * 댓글 추가 후 데이터 재조회
   */
  const handleCommentAdded = useCallback(async () => {
    try {
      await refetch({ fetchPolicy: "network-only" });
      if (onPostUpdated) {
        await onPostUpdated();
      }
    } catch (e) {
      console.log("댓글 추가 후 재조회 실패:", e);
    }
  }, [refetch, onPostUpdated]);

  /**
   * 게시물 수정 후 (PostHeader 내 수정 모달 등)
   */
  const handlePostUpdatedInternal = useCallback(async () => {
    await refetch({ fetchPolicy: "network-only" });
    if (onPostUpdated) {
      await onPostUpdated();
    }
  }, [refetch, onPostUpdated]);

  /**
   * 공유 (추후 구현 예정)
   * - 현재는 로그 출력만
   */
  const handleShare = useCallback(() => {
    console.log("공유 - postId:", postId);
  }, [postId]);

  /**
   * 헤더 구성 (variant 별 분기)
   * - 페이지: 좌측/우측 여백 동일한 기본 헤더
   * - 모달: 닫기 버튼 + 리프레시 버튼
   */
  const HeaderComponent = useMemo(() => {
    const titleNode = (
      <Text style={themed($headerTitle)}>{t(TRANSLATION_KEYS.POST_TITLE)}</Text>
    );

    if (variant === "modal") {
      return (
        <View style={themed($modalHeader)}>
          <TouchableOpacity
            onPress={onClose}
            style={themed($iconButton)}
            accessibilityLabel="닫기"
          >
            <Ionicons name="close" size={22} color={theme.colors.text} />
          </TouchableOpacity>
          {titleNode}
          <TouchableOpacity
            onPress={handleRefresh}
            style={themed($iconButton)}
            disabled={refreshing}
            accessibilityLabel="새로고침"
          >
            <Ionicons
              name="refresh"
              size={20}
              color={refreshing ? theme.colors.textDim : theme.colors.text}
            />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={themed($pageHeader)}>
        {titleNode}
        <TouchableOpacity
          onPress={handleRefresh}
          style={themed($iconButton)}
          disabled={refreshing}
        >
          <Ionicons
            name="refresh"
            size={20}
            color={refreshing ? theme.colors.textDim : theme.colors.text}
          />
        </TouchableOpacity>
      </View>
    );
  }, [variant, themed, theme.colors, t, handleRefresh, refreshing, onClose]);

  /**
   * 로딩 상태 렌더
   * - initialPost 가 있으면 즉시 본문 렌더 (스피너 생략)
   */
  if (loading && !post) {
    return (
      <View
        style={[
          themed($rootContainer),
          variant === "modal" && themed($modalVariantRoot),
        ]}
      >
        {HeaderComponent}
        <View style={themed($centerStateContainer)}>
          <ActivityIndicator size="large" color={theme.colors.tint} />
          <Text style={themed($stateText)}>
            {t(TRANSLATION_KEYS.POST_LOADING)}
          </Text>
        </View>
      </View>
    );
  }

  /**
   * 에러 / 데이터 없음
   */
  if ((error || !post) && !loading) {
    return (
      <View
        style={[
          themed($rootContainer),
          variant === "modal" && themed($modalVariantRoot),
        ]}
      >
        {HeaderComponent}
        <View style={themed($centerStateContainer)}>
          <MaterialIcons
            name="error-outline"
            size={48}
            color={theme.colors.error}
          />
          <Text style={themed($errorText)}>
            {error?.message || t(TRANSLATION_KEYS.POST_NOT_FOUND)}
          </Text>
          {variant === "modal" && (
            <TouchableOpacity style={themed($retryButton)} onPress={onClose}>
              <Text style={themed($retryButtonText)}>닫기</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  /**
   * 정상 / 부분(초기) 렌더
   */
  return (
    <KeyboardAvoidingView
      style={[
        themed($rootContainer),
        variant === "modal" && themed($modalVariantRoot),
      ]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {HeaderComponent}

      <ScrollView
        style={themed($scrollContainer)}
        showsVerticalScrollIndicator={false}
      >
        {/* 메인 카드 */}
        <View style={themed($postCard)}>
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
            onPostUpdated={handlePostUpdatedInternal}
          />

          {/* 본문 내용 */}
          <View style={themed($postContent)}>
            <Text style={themed($contentText)}>{post.content}</Text>
          </View>

          {/* 미디어 */}
          {post.media?.length > 0 && (
            <View style={themed($mediaSection)}>
              <PostMedia media={post.media} variant="detail" />
            </View>
          )}

          {/* 태그 */}
          {post.tags?.length > 0 && (
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

          {/* 통계 바 제거: 카운트는 액션 영역에서 표시 */}

          {/* 액션 버튼 - 카운트 포함 */}
          <PostActions
            isLiked={isLiked}
            isBookmarked={isBookmarked}
            isLikeProcessing={isLikeProcessing}
            isBookmarkProcessing={isBookmarkProcessing}
            isLikeError={isLikeError}
            onLike={handleLike}
            onBookmark={handleBookmark}
            onShare={handleShare}
            likeCount={likeCount}
            commentCount={post.commentCount}
            variant="detail"
          />

          {isPartial && (
            <View
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                backgroundColor: theme.colors.background + "CC",
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 12,
              }}
            >
              <Text style={{ fontSize: 11, color: theme.colors.textDim }}>
                로딩 중...
              </Text>
            </View>
          )}
        </View>

        {/* 댓글 (partial 이면 숨김 - 상세 데이터 도착 후 표시) */}
        {(!isPartial || fetchedPost) && (
          <View style={themed($commentsCard)}>
            <CommentSection
              postId={post.id}
              comments={post.comments || []}
              currentUser={currentUser}
              onCommentAdded={handleCommentAdded}
              postAuthorId={post.author?.id}
            />
          </View>
        )}
      </ScrollView>

      {/* 신고 모달 */}
      {fetchedPost && (
        <ReportModal
          visible={showReportModal}
          onClose={() => setShowReportModal(false)}
          postId={post.id}
        />
      )}
    </KeyboardAvoidingView>
  );
}

/* ================= 스타일 정의 ================= */

const $rootContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
});

const $modalVariantRoot: ThemedStyle<ViewStyle> = () => ({
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  overflow: "hidden",
});

/** 페이지 헤더 스타일 (기본 상세 페이지) */
const $pageHeader: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
  backgroundColor: colors.background,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

/** 모달 헤더 스타일 (닫기 + 새로고침) */
const $modalHeader: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.md,
  paddingBottom: spacing.sm,
  backgroundColor: colors.background,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $headerTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
  fontWeight: "bold",
  color: colors.text,
});

const $iconButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.xs,
  borderRadius: 20,
});

const $centerStateContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  padding: spacing.lg,
});

const $stateText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  marginTop: spacing.md,
  fontSize: 16,
  color: colors.textDim,
});

const $errorText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 16,
  color: colors.error,
  marginTop: spacing.md,
  textAlign: "center",
});

const $retryButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  marginTop: spacing.lg,
  backgroundColor: colors.tint,
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.sm,
  borderRadius: 8,
});

const $retryButtonText: ThemedStyle<TextStyle> = () => ({
  fontSize: 14,
  color: "white",
  fontWeight: "600",
});

const $scrollContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $postCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  marginHorizontal: 0, // 스크롤뷰 contentContainer에 패딩 적용하므로 0으로 설정
  marginTop: spacing.md,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.border,
  overflow: "hidden",
});
/* ================= 새로운 스타일들 (공지 디자인 참고) ================= */

const $scrollContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.md,
  paddingBottom: spacing.xl,
});

const $postContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  // 본문 텍스트 영역 여백: 좌우는 스크롤 패딩과 맞추고, 위/아래 균형 있게 배치
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.sm,
  paddingBottom: spacing.md,
});
const $contentText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  lineHeight: 24,
  color: colors.text,
});

const $mediaSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  // 상세 화면 좌우 패딩을 스크롤 콘텐츠/본문과 통일
  paddingHorizontal: spacing.lg,
  marginTop: spacing.sm,
  marginBottom: spacing.md,
});

const $tagsSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  // 태그 섹션 추가: 좌우 패딩을 상세 레이아웃과 동일하게 맞춤
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.xs,
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
  marginHorizontal: 0, // 스크롤뷰 contentContainer에 패딩 적용하므로 0으로 설정
  marginTop: spacing.lg,
  marginBottom: spacing.xl,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.border,
  overflow: "hidden",
});
