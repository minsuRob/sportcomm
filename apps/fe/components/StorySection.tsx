import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ViewStyle,
  TextStyle,
  ImageStyle,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "@apollo/client";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { GET_STORY_POSTS } from "@/lib/graphql";
import { selectOptimizedImageUrl } from "@/lib/image";

/**
 * 스토리 데이터 타입 (Post 데이터 기반)
 */
interface StoryPost {
  id: string;
  title?: string;
  content: string;
  createdAt: string;
  teamId: string;
  author: {
    id: string;
    nickname: string;
    profileImageUrl?: string;
  };
  media: Array<{
    id: string;
    url: string;
    type: "IMAGE" | "VIDEO" | "image" | "video";
    width?: number;
    height?: number;
  }>;
  likeCount: number;
  commentCount?: number;
}

interface StorySectionProps {
  onStoryPress?: (postId: string) => void;
}

/**
 * 시간 경과를 한국어로 표시하는 함수
 */
const formatTimeAgo = (createdAt: string): string => {
  const now = new Date();
  const postDate = new Date(createdAt);
  const diffInMs = now.getTime() - postDate.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) return "방금 전";
  if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
  if (diffInHours < 24) return `${diffInHours}시간 전`;
  if (diffInDays < 7) return `${diffInDays}일 전`;

  return postDate.toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
};

/**
 * 개별 스토리 아이템 컴포넌트 (Post 데이터 기반)
 */
const StoryItem = ({
  post,
  onPress,
}: {
  post: StoryPost;
  onPress: (postId: string) => void;
}) => {
  const { themed } = useAppTheme();

  // 첫 번째 이미지 미디어 선택
  const imageMedia = post.media.find(
    (item) => item.type === "IMAGE" || item.type === "image"
  );

  // 썸네일 이미지 URL 생성
  const thumbnailUrl = imageMedia
    ? selectOptimizedImageUrl(imageMedia, "thumbnail")
    : post.author.profileImageUrl || "https://via.placeholder.com/200";

  // 제목을 username으로, 작성자를 timestamp로 매핑
  const displayTitle = post.title || post.content.substring(0, 20) + "...";
  const displayAuthor = post.author.nickname;
  const displayTime = formatTimeAgo(post.createdAt);

  return (
    <TouchableOpacity
      style={themed($storyItem)}
      onPress={() => onPress(post.id)}
      activeOpacity={0.8}
    >
      <View style={themed($storyImageContainer)}>
        <Image
          source={{ uri: thumbnailUrl }}
          style={themed($storyImage)}
          resizeMode="cover"
          onError={() =>
            console.warn(`Failed to load story image: ${thumbnailUrl}`)
          }
          // iOS 성능 최적화
          fadeDuration={200}
          loadingIndicatorSource={{
            uri: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
          }}
        />
        {/* 좋아요 수가 많으면 인기 표시 */}
        {post.likeCount > 10 && (
          <View style={themed($popularIndicator)}>
            <Text style={themed($popularText)}>인기</Text>
          </View>
        )}
      </View>
      <View style={themed($storyInfo)}>
        <Text style={themed($storyUsername)} numberOfLines={1}>
          {displayTitle}
        </Text>
        <Text style={themed($storyTimestamp)}>
          {displayAuthor} • {displayTime}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

/**
 * 스토리 섹션 컴포넌트
 * 가로 스크롤로 최신 게시물을 스토리 형태로 표시
 * 무한 스크롤을 지원하며 썸네일 이미지를 사용합니다.
 */
export default function StorySection({ onStoryPress }: StorySectionProps) {
  const { themed } = useAppTheme();
  const router = useRouter();

  // 페이지네이션 상태
  const [page, setPage] = useState(1);
  const [allPosts, setAllPosts] = useState<StoryPost[]>([]);
  const [hasMore, setHasMore] = useState(true);

  // GraphQL 쿼리
  const { data, loading, error, fetchMore } = useQuery(GET_STORY_POSTS, {
    variables: {
      input: {
        page: 1,
        limit: 5,
        sortBy: "createdAt",
        sortOrder: "DESC",
      },
    },
    onCompleted: (data) => {
      if (data?.posts?.posts) {
        setAllPosts(data.posts.posts);
        setHasMore(data.posts.hasNext);
      }
    },
    onError: (error) => {
      console.error("스토리 게시물 로드 실패:", error);
    },
  });

  // 스토리 클릭 핸들러
  const handleStoryPress = useCallback(
    (postId: string) => {
      if (onStoryPress) {
        onStoryPress(postId);
      } else {
        // 기본 동작: 게시물 상세 페이지로 이동
        router.push({
          pathname: "/post/[postId]",
          params: { postId },
        });
      }
    },
    [onStoryPress, router]
  );

  // 무한 스크롤 핸들러
  const handleLoadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    try {
      const result = await fetchMore({
        variables: {
          input: {
            page: page + 1,
            limit: 5,
            sortBy: "createdAt",
            sortOrder: "DESC",
          },
        },
      });

      if (result.data?.posts?.posts) {
        setAllPosts((prev) => [...prev, ...result.data.posts.posts]);
        setPage((prev) => prev + 1);
        setHasMore(result.data.posts.hasNext);
      }
    } catch (error) {
      console.error("추가 스토리 로드 실패:", error);
    }
  }, [loading, hasMore, page, fetchMore]);

  // 스크롤 끝 감지
  const handleScrollEnd = useCallback(() => {
    if (hasMore && !loading) {
      handleLoadMore();
    }
  }, [hasMore, loading, handleLoadMore]);

  // 로딩 상태
  if (loading && allPosts.length === 0) {
    return (
      <View style={themed($container)}>
        <View style={themed($loadingContainer)}>
          <ActivityIndicator
            size="small"
            color={themed($loadingContainer).color}
          />
          <Text style={themed($loadingText)}>스토리 로딩 중...</Text>
        </View>
      </View>
    );
  }

  // 에러 상태
  if (error && allPosts.length === 0) {
    return (
      <View style={themed($container)}>
        <View style={themed($errorContainer)}>
          <Text style={themed($errorText)}>스토리를 불러올 수 없습니다</Text>
        </View>
      </View>
    );
  }

  // 데이터가 없는 경우
  if (allPosts.length === 0) {
    return (
      <View style={themed($container)}>
        <View style={themed($emptyContainer)}>
          <Text style={themed($emptyText)}>아직 스토리가 없습니다</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={themed($container)}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={themed($scrollContent)}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
      >
        {allPosts.map((post) => (
          <StoryItem key={post.id} post={post} onPress={handleStoryPress} />
        ))}

        {/* 로딩 인디케이터 (추가 로드 중) */}
        {loading && allPosts.length > 0 && (
          <View style={themed($loadMoreIndicator)}>
            <ActivityIndicator
              size="small"
              color={themed($loadingContainer).color}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// --- 스타일 정의 ---
const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.backgroundAlt,
  paddingVertical: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
  marginBottom: spacing.sm,
});

const $scrollContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.sm,
  // gap 제거 - marginRight로 간격 조정
});

const $popularIndicator: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  position: "absolute",
  top: spacing.xs,
  right: spacing.xs,
  backgroundColor: colors.energy,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xxxs,
  borderRadius: 4,
});

const $popularText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 10,
  fontWeight: "800",
  letterSpacing: 0.5,
});

const $loadingContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: spacing.lg,
  paddingHorizontal: spacing.lg,
  color: colors.text,
});

const $loadingText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.text,
  fontSize: 14,
  marginLeft: spacing.sm,
});

const $errorContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: spacing.lg,
  paddingHorizontal: spacing.lg,
});

const $errorText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  fontSize: 14,
  textAlign: "center",
});

const $emptyContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: spacing.lg,
  paddingHorizontal: spacing.lg,
});

const $emptyText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  fontSize: 14,
  textAlign: "center",
});

const $loadMoreIndicator: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  width: 140,
  height: 120,
  alignItems: "center",
  justifyContent: "center",
  marginRight: spacing.md,
  color: colors.text,
});

const $storyItem: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  alignItems: "flex-start",
  width: 140, // 고정 너비
  height: 120, // 고정 높이
  marginRight: spacing.md, // 아이템 간 간격
  borderRadius: 12,
  overflow: "hidden",
  backgroundColor: colors.card,
  shadowColor: colors.shadowLight,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.2,
  shadowRadius: 5,
  elevation: 4,
  // iOS에서 더 나은 성능을 위한 추가 속성
  shouldRasterizeIOS: true,
  rasterizationScale: 2,
});

const $storyImageContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: "100%",
  height: 80, // 고정 높이로 변경
  overflow: "hidden",
  position: "relative",
  borderBottomWidth: 2,
  borderBottomColor: colors.tint,
});

const $storyImage: ThemedStyle<ImageStyle> = () => ({
  width: "100%",
  height: "100%",
  opacity: 0.9,
});

const $storyInfo: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  width: "100%",
  flex: 1, // 남은 공간 차지
  padding: spacing.sm,
  backgroundColor: colors.card,
  justifyContent: "center", // 세로 중앙 정렬
});

const $storyUsername: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12, // 폰트 크기 축소
  fontWeight: "700",
  color: colors.text,
  letterSpacing: 0.2,
});

const $storyTimestamp: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 10, // 폰트 크기 축소
  color: colors.accent,
  marginTop: 2,
  fontWeight: "500",
});
