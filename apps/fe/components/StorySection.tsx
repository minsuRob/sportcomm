import React, { useCallback } from "react";
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
import { useRouter } from "expo-router";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { useStoryData } from "@/lib/hooks/useStoryData";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

/**
 * 스토리 아이템 타입 정의
 */
export type StoryType = "popular" | "myteams" | "news" | "trending";

/**
 * 기본 스토리 인터페이스
 */
interface BaseStory {
  id: string;
  type: StoryType;
  title: string;
  content: string;
  createdAt: string;
  thumbnailUrl?: string;
  author: {
    id: string;
    nickname: string;
    profileImageUrl?: string;
  };
  metadata?: {
    likeCount?: number;
    commentCount?: number;
    viewCount?: number;
    source?: string; // 뉴스 기사의 경우 출처
    teamName?: string; // MyTeams 게시물의 경우 팀명
    isPopular?: boolean;
  };
}

/**
 * 게시물 기반 스토리 (기존 Post 데이터)
 */
interface PostStory extends BaseStory {
  type: "popular" | "myteams";
  teamId: string;
  media: Array<{
    id: string;
    url: string;
    type: "IMAGE" | "VIDEO" | "image" | "video";
    width?: number;
    height?: number;
  }>;
}

/**
 * 뉴스 기사 스토리 (크롤링 데이터)
 */
interface NewsStory extends BaseStory {
  type: "news";
  url: string; // 원본 기사 URL
  source: string; // 뉴스 출처
  category?: string; // 스포츠 카테고리
}

/**
 * 통합 스토리 타입
 */
export type StoryItem = PostStory | NewsStory;

interface StorySectionProps {
  onStoryPress?: (story: StoryItem) => void;
  storyTypes?: StoryType[]; // 표시할 스토리 타입들
  maxItems?: number; // 최대 표시 개수
  teamIds?: string[] | null; // 팀 필터 (null이면 모든 팀)
  currentUser?: any; // 피드에서 전달받은 사용자 정보 (중복 API 호출 방지)
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
 * 스토리 타입별 배지 컴포넌트
 */
const StoryTypeBadge = ({ type }: { type: StoryType }) => {
  const { themed } = useAppTheme();

  const getBadgeConfig = (type: StoryType) => {
    switch (type) {
      case "popular":
        return { text: "인기", color: "#FF6B35" };
      case "myteams":
        return { text: "내팀", color: "#4ECDC4" };
      case "news":
        return { text: "뉴스", color: "#6C7CE7" };
      default:
        return { text: "일반", color: "#9CA3AF" };
    }
  };

  const config = getBadgeConfig(type);

  return (
    <View style={[themed($typeBadge), { backgroundColor: config.color }]}>
      <Text style={themed($typeBadgeText)}>{config.text}</Text>
    </View>
  );
};

/**
 * 개별 스토리 아이템 컴포넌트 (확장된 버전)
 */
const StoryItemComponent = ({
  story,
  onPress,
}: {
  story: StoryItem;
  onPress: (story: StoryItem) => void;
}) => {
  const { themed } = useAppTheme();

  // 썸네일 이미지 URL
  const thumbnailUrl =
    story.thumbnailUrl ||
    story.author.profileImageUrl ||
    "https://via.placeholder.com/200";

  // 표시할 정보
  const displayTitle = story.title;
  const displayAuthor = story.author.nickname;
  const displayTime = formatTimeAgo(story.createdAt);

  return (
    <TouchableOpacity
      style={themed($storyItem)}
      onPress={() => onPress(story)}
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
          fadeDuration={200}
          loadingIndicatorSource={{
            uri: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
          }}
        />

        {/* 스토리 타입 배지 */}
        <StoryTypeBadge type={story.type} />

        {/* 인기 표시 (인기 게시물이거나 좋아요가 많은 경우) */}
        {/* {(story.metadata?.isPopular ||
          (story.metadata?.likeCount && story.metadata.likeCount > 10)) && (
          <View style={themed($popularIndicator)}>
            <Text style={themed($popularText)}>{"🔥"}</Text>
          </View>
        )} */}
      </View>

      <View style={themed($storyInfo)}>
        <Text style={themed($storyUsername)} numberOfLines={1}>
          {displayTitle}
        </Text>
        <Text style={themed($storyTimestamp)}>
          {displayAuthor} • {displayTime}
        </Text>

        {/* 추가 메타데이터 표시 */}
        {story.metadata?.teamName && (
          <Text style={themed($storyTeam)} numberOfLines={1}>
            {story.metadata.teamName}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

/**
 * 스토리 섹션 컴포넌트 (확장된 버전)
 * 다양한 데이터 소스(인기 게시물, MyTeams, 뉴스)를 통합하여 표시
 */

const DEFAULT_STORY_TYPES: StoryType[] = ["popular", "myteams", "news"];

export default function StorySection({
  onStoryPress,
  storyTypes = DEFAULT_STORY_TYPES,
  maxItems = 8,
  teamIds,
  currentUser: propCurrentUser,
}: StorySectionProps) {
  const { themed } = useAppTheme();
  const router = useRouter();

  // prop으로 전달받은 currentUser 우선 사용, 없으면 훅 사용 (폴백)
  const { currentUser: hookCurrentUser } = useCurrentUser();
  const currentUser = propCurrentUser || hookCurrentUser;

  const { stories, loading, error, refresh, hasMore } = useStoryData({
    storyTypes,
    maxItems,
    userId: currentUser?.id,
    teamIds: teamIds, // 팀 필터 전달
  });

  // 스토리 클릭 핸들러
  const handleStoryPress = useCallback(
    (story: StoryItem) => {
      if (onStoryPress) {
        onStoryPress(story);
      } else {
        // 스토리 타입에 따른 기본 동작
        if (story.type === "news" && "url" in story) {
          // 뉴스 기사는 외부 링크로 이동 (웹뷰 또는 브라우저)
          console.log("뉴스 기사 열기:", story.url);
          // TODO: 웹뷰 모달 또는 외부 브라우저로 열기
        } else {
          // 게시물은 상세 페이지로 이동
          router.push({
            pathname: "/post/[postId]",
            params: { postId: story.id },
          });
        }
      }
    },
    [onStoryPress, router],
  );

  // 스크롤 끝 감지 (추가 로드)
  const handleScrollEnd = useCallback(() => {
    if (hasMore && !loading) {
      // TODO: 추가 로드 구현
      console.log("더 많은 스토리 로드");
    }
  }, [hasMore, loading]);

  // 로딩 상태
  if (loading && stories.length === 0) {
    return (
      <View style={themed($container)}>
        <View style={themed($loadingContainer)}>
          <ActivityIndicator size="small" color={themed($loadingText).color} />
          <Text style={themed($loadingText)}>{"스토리 로딩 중..."}</Text>
        </View>
      </View>
    );
  }

  // 에러 상태
  if (error && stories.length === 0) {
    return (
      <View style={themed($container)}>
        <View style={themed($errorContainer)}>
          <Text style={themed($errorText)}>
            {"스토리를 불러올 수 없습니다"}
          </Text>
          <TouchableOpacity onPress={refresh} style={themed($retryButton)}>
            <Text style={themed($retryButtonText)}>{"다시 시도"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 데이터가 없는 경우
  if (stories.length === 0) {
    return (
      <View style={themed($container)}>
        <View style={themed($emptyContainer)}>
          <Text style={themed($emptyText)}>{"아직 스토리가 없습니다"}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={themed($container)}>
      {/* 스토리 타입 표시 헤더 (선택사항) */}
      <View style={themed($headerContainer)}>
        <Text style={themed($headerTitle)}>{"스토리"}</Text>
        {/* <Text style={themed($headerSubtitle)}>
          {storyTypes
            .map((type) => {
              if (type === "popular") return "인기";
              if (type === "myteams") return "내팀";
              if (type === "news") return "뉴스";
              return null;
            })
            .filter(Boolean)
            .join(" ")}
          {" 콘텐츠"}
        </Text> */}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={themed($scrollContent)}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
      >
        {stories.map((story) => (
          <StoryItemComponent
            key={story.id}
            story={story}
            onPress={handleStoryPress}
          />
        ))}

        {/* 로딩 인디케이터 (추가 로드 중) */}
        {loading && stories.length > 0 && (
          <View style={themed($loadMoreIndicator)}>
            <ActivityIndicator
              size="small"
              color={themed($loadingText).color}
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

const $headerContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: spacing.lg,
  marginBottom: spacing.sm,
});

const $headerTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
  fontWeight: "700",
  color: colors.text,
});

const $headerSubtitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
  fontWeight: "500",
});

const $scrollContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.sm,
});

const $storyItem: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  alignItems: "flex-start",
  width: 140,
  height: 120,
  marginRight: spacing.md,
  borderRadius: 12,
  overflow: "hidden",
  backgroundColor: colors.card,
  shadowColor: colors.shadowLight,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.2,
  shadowRadius: 5,
  elevation: 4,
  shouldRasterizeIOS: true,
  rasterizationScale: 2,
});

const $storyImageContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: "100%",
  height: 80,
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

const $typeBadge: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  position: "absolute",
  top: spacing.xs,
  left: spacing.xs,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xxxs,
  borderRadius: 4,
  zIndex: 2,
});

const $typeBadgeText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 10,
  fontWeight: "800",
  letterSpacing: 0.5,
});

const $popularIndicator: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  position: "absolute",
  top: spacing.xs,
  right: spacing.xs,
  backgroundColor: "rgba(255, 107, 53, 0.9)",
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xxxs,
  borderRadius: 4,
  zIndex: 2,
});

const $popularText: ThemedStyle<TextStyle> = () => ({
  fontSize: 12,
});

const $storyInfo: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  width: "100%",
  flex: 1,
  padding: spacing.sm,
  backgroundColor: colors.card,
  justifyContent: "center",
});

const $storyUsername: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  fontWeight: "700",
  color: colors.text,
  letterSpacing: 0.2,
});

const $storyTimestamp: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 10,
  color: colors.accent,
  marginTop: 2,
  fontWeight: "500",
});

const $storyTeam: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 9,
  color: colors.tint,
  marginTop: 1,
  fontWeight: "600",
});

const $loadingContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: spacing.lg,
  paddingHorizontal: spacing.lg,
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
  marginBottom: 12,
});

const $retryButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.tint,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderRadius: 8,
});

const $retryButtonText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 12,
  fontWeight: "600",
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
