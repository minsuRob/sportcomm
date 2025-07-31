import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  Image,
  ImageStyle,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { usePostInteractions } from "../hooks/usePostInteractions";
import { PostType } from "./shared/PostHeader";
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

export interface Post {
  id: string;
  content: string;
  author: User;
  media: Media[];
  comments: Comment[];
  createdAt: string;
  type: PostType;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  isMock?: boolean;
}

interface PostCardProps {
  post: Post;
  onPostUpdated?: (updatedPost: any) => void;
}

// --- Helper Functions & Components ---

/**
 * 날짜 문자열을 "방금 전", "N시간 전", "YYYY.MM.DD" 형식으로 변환
 */
const formatTimeAgo = (dateString: string) => {
  const now = new Date();
  const postDate = new Date(dateString);
  const diffHours = Math.floor(
    (now.getTime() - postDate.getTime()) / (1000 * 60 * 60),
  );

  if (diffHours < 1) return "방금 전";
  if (diffHours < 24) return `${diffHours}h`;
  return postDate.toLocaleDateString("ko-KR");
};

/**
 * 텍스트 테두리 효과를 위한 컴포넌트
 */
const StrokedText = ({
  content,
  themed,
}: {
  content: string;
  themed: (style: ThemedStyle<TextStyle>) => TextStyle;
}) => (
  <>
    <Text style={themed($contentTextStroke)} numberOfLines={4} aria-hidden>
      {content}
    </Text>
    <Text style={themed($contentTextStroke2)} numberOfLines={4} aria-hidden>
      {content}
    </Text>
    <Text style={themed($contentTextStroke3)} numberOfLines={4} aria-hidden>
      {content}
    </Text>
    <Text style={themed($contentTextStroke4)} numberOfLines={4} aria-hidden>
      {content}
    </Text>
    <Text style={themed($contentTextStroke5)} numberOfLines={4} aria-hidden>
      {content}
    </Text>
    <Text style={themed($contentTextStroke6)} numberOfLines={4} aria-hidden>
      {content}
    </Text>
    <Text style={themed($contentText)} numberOfLines={4}>
      {content}
    </Text>
  </>
);

// --- The Component ---
export default function PostCard({ post, onPostUpdated }: PostCardProps) {
  const { themed } = useAppTheme();
  const router = useRouter();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // 이미지 비율과 로딩 상태 관리
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);
  const [imageLoading, setImageLoading] = useState<boolean>(true);

  // 게시물 상호작용 훅 사용
  const { isLiked, likeCount, isLikeProcessing, isLikeError, handleLike } =
    usePostInteractions({
      postId: post.id,
      authorId: post.author.id,
      authorName: post.author.nickname,
      initialLikeCount: post.likeCount,
      initialIsLiked: post.isLiked,
      initialIsFollowing: post.author.isFollowing || false,
    });

  // 게시물 상세 페이지로 이동하는 함수
  const handlePostPress = () => {
    router.push({
      pathname: "/post/[postId]",
      params: { postId: post.id },
    });
  };

  // 이미지 미디어만 필터링
  const imageMedia = post.media.filter(
    (item) => item.type === "image" || item.type === "IMAGE",
  );

  // 이미지 비율 계산을 위한 효과
  useEffect(() => {
    if (imageMedia.length > 0 && imageMedia[0]?.url) {
      setImageLoading(true);

      Image.getSize(
        imageMedia[0].url,
        (width, height) => {
          if (height > 0) {
            setImageAspectRatio(width / height);
          } else {
            // 높이가 0이거나 비정상적일 경우 기본 비율 설정
            setImageAspectRatio(16 / 9);
          }
          setImageLoading(false);
        },
        () => {
          // 이미지 로드 실패 시 기본값 사용
          console.warn("Failed to load image dimensions");
          setImageAspectRatio(16 / 9);
          setImageLoading(false);
        },
      );
    } else {
      setImageLoading(false);
    }
  }, [imageMedia.length > 0 ? imageMedia[0]?.url : null]);

  // 카테고리별 색상 및 텍스트 매핑
  const getCategoryInfo = (type: PostType) => {
    switch (type) {
      case PostType.ANALYSIS:
        return {
          text: "ANALYSIS",
          colors: {
            border: "#8B5CF6",
            glow: "#8B5CF6",
            badge: "#8B5CF6",
          },
        };
      case PostType.HIGHLIGHT:
        return {
          text: "HIGHLIGHT",
          colors: {
            border: "#F59E0B",
            glow: "#F59E0B",
            badge: "#F59E0B",
          },
        };
      case PostType.CHEERING:
      default:
        return {
          text: "CHEERING",
          colors: {
            border: "#10B981",
            glow: "#10B981",
            badge: "#10B981",
          },
        };
    }
  };

  const categoryInfo = getCategoryInfo(post.type);

  return (
    <View style={themed($outerContainer)}>
      {/* 외부 글로우 효과 */}
      <View
        style={[
          themed($outerGlow),
          { backgroundColor: categoryInfo.colors.glow + "10" },
        ]}
      />

      {/* 네온 글로우 효과를 위한 배경 */}
      <View
        style={[
          themed($glowBackground),
          { backgroundColor: categoryInfo.colors.glow + "15" },
        ]}
      />

      {/* 은은한 테두리 효과를 위한 추가 레이어 */}
      <View
        style={[
          themed($borderLayer),
          { borderColor: categoryInfo.colors.border + "20" },
        ]}
      />

      <View
        style={[
          themed($container),
          {
            borderLeftColor: categoryInfo.colors.border,
            borderTopColor: categoryInfo.colors.border + "15",
            borderRightColor: categoryInfo.colors.border,
            borderBottomColor: categoryInfo.colors.border + "15",
            shadowColor: categoryInfo.colors.glow,
          },
        ]}
      >
        <TouchableOpacity onPress={handlePostPress} activeOpacity={0.9}>
          <View style={themed($mediaContainer)}>
            {imageMedia.length > 0 ? (
              imageLoading ? (
                // 로딩 중 인디케이터
                <View style={themed($loadingContainer)}>
                  <ActivityIndicator size="large" color="#FFFFFF" />
                </View>
              ) : (
                // 이미지가 있고 로딩 완료된 상태
                <View
                  style={{
                    aspectRatio: imageAspectRatio || 16 / 9,
                    maxHeight: screenHeight * 0.6, // 화면 높이의 60%로 제한
                  }}
                >
                  <Image
                    source={{ uri: imageMedia[0]?.url }}
                    style={themed($mediaImage)}
                    resizeMode="cover"
                  />
                  <View style={themed($gradientOverlay)} />
                </View>
              )
            ) : (
              // 이미지가 없는 경우
              <View style={themed($emptyMediaContainer)} />
            )}

            {/* 공통 오버레이 UI */}
            <View style={themed($profileContainer)}>
              <Image
                source={{
                  uri:
                    post.author.profileImageUrl ||
                    `https://i.pravatar.cc/150?u=${post.author.id}`,
                }}
                style={themed($profileImage)}
              />
              <View style={themed($profileInfo)}>
                <Text style={themed($profileName)}>{post.author.nickname}</Text>
                <Text style={themed($profileTime)}>
                  {formatTimeAgo(post.createdAt)}
                </Text>
              </View>
            </View>

            <View
              style={[
                themed($categoryBadge),
                { backgroundColor: categoryInfo.colors.badge + "40" },
              ]}
            >
              <View
                style={[
                  themed($categoryIcon),
                  { backgroundColor: categoryInfo.colors.badge + "60" },
                ]}
              >
                <Text style={themed($categoryIconText)}>
                  {post.type === PostType.ANALYSIS
                    ? "📊"
                    : post.type === PostType.HIGHLIGHT
                      ? "⚡"
                      : "📣"}
                </Text>
              </View>
              <Text style={themed($categoryText)}>{categoryInfo.text}</Text>
            </View>

            <View style={themed($contentContainer)}>
              <StrokedText content={post.content} themed={themed} />
            </View>
          </View>
        </TouchableOpacity>

        {/* 액션 버튼 - 좋아요, 댓글, 리포스트 */}
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
          shareCount={67}
        />
      </View>
    </View>
  );
}

// --- 스타일 정의 ---
const $outerContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  position: "relative",
  marginBottom: spacing.lg,
  marginHorizontal: spacing.md,
  // 웹에서 추가 여백
  ...(isWeb() && {
    marginHorizontal: spacing.lg,
  }),
});

const $outerGlow: ThemedStyle<ViewStyle> = () => ({
  position: "absolute",
  top: -4,
  left: -4,
  right: -4,
  bottom: 4,
  borderRadius: 20,
  zIndex: -2,
});

const $glowBackground: ThemedStyle<ViewStyle> = () => ({
  position: "absolute",
  top: -2,
  left: -2,
  right: -2,
  bottom: 2,
  borderRadius: 18,
  zIndex: -1,
});

const $borderLayer: ThemedStyle<ViewStyle> = () => ({
  position: "absolute",
  top: -1,
  left: -1,
  right: -1,
  bottom: 1,
  borderRadius: 17,
  borderWidth: 1,
  zIndex: 0,
});

const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.background,
  borderRadius: 16,
  overflow: "hidden",
  position: "relative",
  zIndex: 1,
  borderLeftWidth: 4,
  borderTopWidth: 0.8,
  borderRightWidth: 4,
  borderBottomWidth: 0.8,
  shadowColor: "#000",
  shadowOffset: {
    width: 0,
    height: 3,
  },
  shadowOpacity: 0.15,
  shadowRadius: 10,
  elevation: 6,
});

const $mediaContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: "relative",
  width: "100%",
  borderRadius: 16,
  overflow: "hidden",
  backgroundColor: colors.backgroundDim,
});

const $loadingContainer: ThemedStyle<ViewStyle> = () => ({
  height: 300,
  justifyContent: "center",
  alignItems: "center",
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
  backgroundColor: "rgba(0, 0, 0, 0.3)",
  zIndex: 1,
});

// 프로필 컨테이너 - 왼쪽 위
const $profileContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  position: "absolute",
  top: spacing.md,
  left: spacing.md,
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "rgba(0, 0, 0, 0.4)",
  borderRadius: 20,
  paddingVertical: spacing.xs,
  paddingHorizontal: spacing.sm,
  zIndex: 3,
});

const $profileImage: ThemedStyle<ImageStyle> = () => ({
  width: 32,
  height: 32,
  borderRadius: 16,
  marginRight: 8,
  borderWidth: 2,
  borderColor: "rgba(255, 255, 255, 0.3)",
});

const $profileInfo: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $profileName: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 14,
  fontWeight: "600",
});

const $profileTime: ThemedStyle<TextStyle> = () => ({
  color: "rgba(255, 255, 255, 0.7)",
  fontSize: 12,
});

// 카테고리 배지 - 오른쪽 위
const $categoryBadge: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  position: "absolute",
  top: spacing.md,
  right: spacing.md,
  flexDirection: "row",
  alignItems: "center",
  borderRadius: 20,
  paddingVertical: spacing.xs,
  paddingHorizontal: spacing.sm,
  zIndex: 3,
});

const $categoryIcon: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  width: 20,
  height: 20,
  borderRadius: 10,
  justifyContent: "center",
  alignItems: "center",
  marginRight: spacing.xs,
});

const $categoryIconText: ThemedStyle<TextStyle> = () => ({
  fontSize: 10,
});

const $categoryText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 12,
  fontWeight: "bold",
});

// 콘텐츠 텍스트 - 하단
const $contentContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  position: "absolute",
  bottom: spacing.md,
  left: spacing.md,
  right: 80,
  zIndex: 3,
});

// 텍스트 테두리 효과를 위한 스타일들
const $contentTextStroke: ThemedStyle<TextStyle> = () => ({
  position: "absolute",
  color: "black",
  fontSize: 24,
  fontWeight: "bold",
  lineHeight: 32,
  left: -1,
  top: -1,
});

const $contentTextStroke2: ThemedStyle<TextStyle> = () => ({
  position: "absolute",
  color: "black",
  fontSize: 24,
  fontWeight: "bold",
  lineHeight: 32,
  left: 1,
  top: -1,
});

const $contentTextStroke3: ThemedStyle<TextStyle> = () => ({
  position: "absolute",
  color: "black",
  fontSize: 24,
  fontWeight: "bold",
  lineHeight: 32,
  left: -1,
  top: 1,
});

const $contentTextStroke4: ThemedStyle<TextStyle> = () => ({
  position: "absolute",
  color: "black",
  fontSize: 24,
  fontWeight: "bold",
  lineHeight: 32,
  left: 1,
  top: 1,
});

const $contentTextStroke5: ThemedStyle<TextStyle> = () => ({
  position: "absolute",
  color: "black",
  fontSize: 24,
  fontWeight: "bold",
  lineHeight: 32,
  left: -2,
  top: 0,
});

const $contentTextStroke6: ThemedStyle<TextStyle> = () => ({
  position: "absolute",
  color: "black",
  fontSize: 24,
  fontWeight: "bold",
  lineHeight: 32,
  left: 2,
  top: 0,
});

const $contentText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 24,
  fontWeight: "bold",
  lineHeight: 32,
  position: "relative",
  zIndex: 1,
});

const $emptyMediaContainer: ThemedStyle<ViewStyle> = () => ({
  height: 300,
  width: "100%",
});
