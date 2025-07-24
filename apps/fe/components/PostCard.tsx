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
import { TOGGLE_LIKE, TOGGLE_FOLLOW } from "@/lib/graphql";
import { showToast } from "@/components/CustomToast";
import { getSession } from "@/lib/auth";
import { useTranslation, TRANSLATION_KEYS } from "@/lib/i18n/useTranslation";
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
  isFollowing?: boolean;
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
const getPostTypeStyle = (type: PostType, t: (key: string) => string) => {
  switch (type) {
    case PostType.ANALYSIS:
      return { color: "#6366f1", text: t(TRANSLATION_KEYS.POST_TYPE_ANALYSIS) };
    case PostType.HIGHLIGHT:
      return {
        color: "#f59e0b",
        text: t(TRANSLATION_KEYS.POST_TYPE_HIGHLIGHT),
      };
    case PostType.CHEERING:
    default:
      return { color: "#10b981", text: t(TRANSLATION_KEYS.POST_TYPE_CHEERING) };
  }
};

// --- The Component ---
export default function PostCard({ post }: PostCardProps) {
  const { themed, theme } = useAppTheme();
  const router = useRouter();
  const { t } = useTranslation();

  // Use state to manage client-side interactions like "liking" a post.
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [isFollowing, setIsFollowing] = useState(
    post.author.isFollowing || false
  );
  const [isLikeProcessing, setIsLikeProcessing] = useState(false);
  const [isLikeError, setIsLikeError] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Sync state with props if the post object changes (e.g., after a refresh).
  useEffect(() => {
    setIsLiked(post.isLiked);
    setLikeCount(post.likeCount);
    setIsFollowing(post.author.isFollowing || false);
  }, [post.isLiked, post.likeCount, post.author.isFollowing]);

  // 현재 사용자 확인
  useEffect(() => {
    const checkCurrentUser = async () => {
      const { user } = await getSession();
      setCurrentUserId(user?.id || null);
    };
    checkCurrentUser();
  }, []);

  // URQL mutation hooks
  const [likeResult, executeLike] = useMutation(TOGGLE_LIKE);
  const [toggleFollowResult, toggleFollow] = useMutation(TOGGLE_FOLLOW);

  /**
   * 게시물 상세 페이지로 이동하는 함수
   */
  const handlePostPress = () => {
    // 경로를 명시적으로 지정하여 (app) 같은 그룹 폴더가 URL에 포함되지 않도록 함
    router.push({
      pathname: "/post/[postId]",
      params: { postId: post.id },
    });
  };

  /**
   * 게시물 좋아요 상태를 토글하는 함수입니다.
   * 중복 처리를 방지하고, 사용자 경험 향상을 위해 UI를 낙관적으로 업데이트합니다.
   * 서버 응답에 따라 최종 상태를 결정합니다.
   *
   * @returns {void}
   */
  const handleLike = () => {
    // 이미 처리 중인 경우 중복 요청 방지
    if (isLikeProcessing) {
      return;
    }

    // 현재 로그인된 사용자가 없으면, 로그인하라는 토스트 메시지를 표시합니다.
    if (!currentUserId) {
      showToast({
        type: "error",
        title: "로그인 필요",
        message: "좋아요를 누르려면 로그인이 필요합니다.",
        duration: 3000,
      });
      return;
    }

    // 처리 중 상태로 변경하여 중복 클릭 방지
    setIsLikeProcessing(true);
    setIsLikeError(false);

    // 현재 상태 저장 (에러 시 복원용)
    const originalLikedStatus = isLiked;
    const originalLikeCount = likeCount;

    // UI를 낙관적으로 업데이트
    const newLikedStatus = !isLiked;
    const newLikeCount = newLikedStatus ? likeCount + 1 : likeCount - 1;
    setIsLiked(newLikedStatus);
    setLikeCount(newLikeCount);

    // 뮤테이션 실행
    executeLike({ postId: post.id })
      .then((result) => {
        // 뮤테이션 에러 처리
        if (result.error) {
          console.error("좋아요 처리 실패:", result.error);
          // 원래 상태로 복원
          setIsLiked(originalLikedStatus);
          setLikeCount(originalLikeCount);
          setIsLikeError(true);
          showToast({
            type: "error",
            title: t(TRANSLATION_KEYS.POST_LIKE_ERROR),
            message:
              result.error.message || "좋아요 처리 중 오류가 발생했습니다.",
            duration: 3000,
          });
          return;
        }

        // 뮤테이션 결과 처리 (Boolean 반환값)
        // true = 좋아요 설정됨, false = 좋아요 취소됨
        const likeSuccessful = result.data?.likePost;

        // 서버 응답과 클라이언트 상태가 일치하지 않을 경우 상태 동기화
        if (likeSuccessful !== undefined && likeSuccessful !== newLikedStatus) {
          setIsLiked(likeSuccessful);
          setLikeCount(
            likeSuccessful ? originalLikeCount + 1 : originalLikeCount - 1
          );
        }
      })
      .finally(() => {
        // 처리 완료 후 상태 업데이트
        setTimeout(() => {
          setIsLikeProcessing(false);
        }, 300); // 로딩 상태 최소 표시 시간 (0.3초)
      });
  };

  /**
   * 사용자의 팔로우 상태를 토글하는 함수입니다.
   * toggleFollow 뮤테이션을 호출하고, 서버로부터 받은 새로운 팔로우 상태로 UI를 업데이트합니다.
   * 에러 발생 시, UI를 원래 상태로 되돌리고 사용자에게 에러 메시지를 표시합니다.
   */
  const handleFollowToggle = async () => {
    // 현재 로그인된 사용자가 없으면, 로그인하라는 토스트 메시지를 표시합니다.
    if (!currentUserId) {
      showToast({
        type: "error",
        title: "로그인 필요",
        message: "팔로우하려면 로그인이 필요합니다.",
        duration: 3000,
      });
      return;
    }

    // 자기 자신을 팔로우하는 것을 방지합니다.
    if (currentUserId === post.author.id) {
      return;
    }

    // 이전 팔로우 상태를 저장해두어, 에러 발생 시 복구할 수 있도록 합니다.
    const previousIsFollowing = isFollowing;

    // UI를 즉시 업데이트하여 사용자 경험을 향상시킵니다 (Optimistic Update).
    setIsFollowing(!previousIsFollowing);

    try {
      // toggleFollow 뮤테이션을 실행합니다.
      const result = await toggleFollow({ userId: post.author.id });

      // 뮤테이션 실행 중 에러가 발생했거나, 데이터가 없는 경우
      if (result.error || !result.data) {
        // UI를 이전 상태로 되돌립니다.
        setIsFollowing(previousIsFollowing);
        showToast({
          type: "error",
          title: t(TRANSLATION_KEYS.POST_FOLLOW_ERROR),
          message: result.error?.message || "An unknown error occurred.",
          duration: 3000,
        });
        return;
      }

      // 뮤테이션이 성공하면, 서버로부터 받은 새로운 팔로우 상태로 UI를 업데이트합니다.
      const newIsFollowing = result.data.toggleFollow;
      setIsFollowing(newIsFollowing);

      // 성공 토스트 메시지를 표시합니다.
      showToast({
        type: "success",
        title: "Success",
        message: newIsFollowing
          ? t(TRANSLATION_KEYS.POST_FOLLOW_SUCCESS)
          : t(TRANSLATION_KEYS.POST_UNFOLLOW_SUCCESS),
        duration: 2000,
      });
    } catch (error) {
      // 예기치 않은 에러 발생 시, UI를 이전 상태로 되돌리고 에러 메시지를 표시합니다.
      setIsFollowing(previousIsFollowing);
      showToast({
        type: "error",
        title: t(TRANSLATION_KEYS.POST_FOLLOW_ERROR),
        message: "An unexpected error occurred while processing your request.",
        duration: 3000,
      });
    }
  };

  const firstMedia = post.media?.[0];
  const avatarUrl =
    post.author.profileImageUrl ||
    `https://i.pravatar.cc/150?u=${post.author.id}`;
  const postTypeStyle = getPostTypeStyle(post.type, t);

  /**
   * 이미지 개수에 따른 그리드 레이아웃 렌더링
   */
  const renderMediaGrid = () => {
    const imageMedia = post.media.filter((media) => media.type === "image");
    const imageCount = imageMedia.length;

    if (imageCount === 0) return null;

    if (imageCount === 1) {
      // 단일 이미지
      return (
        <Image
          source={{ uri: imageMedia[0].url }}
          style={themed($mediaImage)}
          resizeMode="cover"
        />
      );
    }

    if (imageCount === 2) {
      // 2개 이미지 - 좌우 분할
      return (
        <View style={themed($mediaGrid)}>
          <Image
            source={{ uri: imageMedia[0].url }}
            style={themed($mediaImageHalf)}
            resizeMode="cover"
          />
          <Image
            source={{ uri: imageMedia[1].url }}
            style={themed($mediaImageHalf)}
            resizeMode="cover"
          />
        </View>
      );
    }

    if (imageCount === 3) {
      // 3개 이미지 - 첫 번째는 왼쪽 전체, 나머지는 오른쪽 상하
      return (
        <View style={themed($mediaGrid)}>
          <Image
            source={{ uri: imageMedia[0].url }}
            style={themed($mediaImageHalf)}
            resizeMode="cover"
          />
          <View style={themed($mediaRightColumn)}>
            <Image
              source={{ uri: imageMedia[1].url }}
              style={themed($mediaImageQuarter)}
              resizeMode="cover"
            />
            <Image
              source={{ uri: imageMedia[2].url }}
              style={themed($mediaImageQuarter)}
              resizeMode="cover"
            />
          </View>
        </View>
      );
    }

    // 4개 이상 이미지 - 2x2 그리드 + 더보기 표시
    return (
      <View style={themed($mediaGrid)}>
        <View style={themed($mediaRow)}>
          <Image
            source={{ uri: imageMedia[0].url }}
            style={themed($mediaImageQuarter)}
            resizeMode="cover"
          />
          <Image
            source={{ uri: imageMedia[1].url }}
            style={themed($mediaImageQuarter)}
            resizeMode="cover"
          />
        </View>
        <View style={themed($mediaRow)}>
          <Image
            source={{ uri: imageMedia[2].url }}
            style={themed($mediaImageQuarter)}
            resizeMode="cover"
          />
          <View style={themed($mediaImageQuarter)}>
            <Image
              source={{ uri: imageMedia[3].url }}
              style={themed($mediaImageQuarter)}
              resizeMode="cover"
            />
            {imageCount > 4 && (
              <View style={themed($moreImagesOverlay)}>
                <Text style={themed($moreImagesText)}>+{imageCount - 4}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

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

        <View style={themed($headerRight)}>
          {/* 팔로우 버튼 - 자기 자신이 아닐 때만 표시 */}
          {currentUserId && currentUserId !== post.author.id && (
            <TouchableOpacity
              style={[
                themed($followButton),
                {
                  backgroundColor: isFollowing
                    ? "transparent"
                    : theme.colors.tint,
                  borderColor: isFollowing
                    ? theme.colors.border
                    : theme.colors.tint,
                },
              ]}
              onPress={handleFollowToggle}
            >
              <Text
                style={[
                  themed($followButtonText),
                  { color: isFollowing ? theme.colors.text : "white" },
                ]}
              >
                {isFollowing
                  ? t(TRANSLATION_KEYS.POST_FOLLOWING)
                  : t(TRANSLATION_KEYS.POST_FOLLOW)}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={themed($moreButton)}>
            <MoreHorizontal color={theme.colors.textDim} size={24} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content - 클릭 가능 */}
      <TouchableOpacity onPress={handlePostPress} activeOpacity={0.7}>
        <Text style={themed($content)}>{post.content}</Text>
      </TouchableOpacity>

      {/* Media - 다중 이미지 지원 */}
      {post.media.length > 0 && (
        <TouchableOpacity
          style={themed($mediaContainer)}
          onPress={handlePostPress}
          activeOpacity={0.9}
        >
          {renderMediaGrid()}
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
        <Text style={themed($statText)}>
          {t(TRANSLATION_KEYS.POST_LIKE_COUNT, { count: likeCount })}
        </Text>
        <MessageCircle color={theme.colors.textDim} size={16} />
        <Text style={themed($statText)}>
          {t(TRANSLATION_KEYS.POST_COMMENT_COUNT, { count: post.commentCount })}
        </Text>
        <Eye color={theme.colors.textDim} size={16} />
        <Text style={themed($statText)}>
          {t(TRANSLATION_KEYS.POST_VIEW_COUNT, { count: post.viewCount })}
        </Text>
      </View>

      {/* Action Bar */}
      <View style={themed($actionBar)}>
        <TouchableOpacity
          onPress={handleLike}
          disabled={isLikeProcessing || likeResult.fetching}
          style={[themed($actionButton), isLikeError && { opacity: 0.7 }]}
        >
          {isLikeProcessing ? (
            <>
              <View style={themed($loadingIndicator)}>
                <Heart
                  size={22}
                  color={isLiked ? theme.colors.error : theme.colors.textDim}
                  fill={isLiked ? theme.colors.error : "transparent"}
                />
              </View>
              <Text
                style={[
                  themed($actionText),
                  {
                    color: isLiked ? theme.colors.error : theme.colors.textDim,
                  },
                ]}
              >
                {isLiked
                  ? t(TRANSLATION_KEYS.POST_UNLIKING)
                  : t(TRANSLATION_KEYS.POST_LIKING)}
              </Text>
            </>
          ) : (
            <>
              <Heart
                size={22}
                color={isLiked ? theme.colors.error : theme.colors.textDim}
                fill={isLiked ? theme.colors.error : "transparent"}
              />
              <Text
                style={[
                  themed($actionText),
                  {
                    color: isLiked ? theme.colors.error : theme.colors.textDim,
                  },
                ]}
              >
                {t(TRANSLATION_KEYS.POST_LIKE)}
              </Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={themed($actionButton)}>
          <MessageCircle size={22} color={theme.colors.textDim} />
          <Text style={themed($actionText)}>
            {t(TRANSLATION_KEYS.POST_COMMENT)}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={themed($actionButton)}>
          <Repeat size={22} color={theme.colors.textDim} />
          <Text style={themed($actionText)}>
            {t(TRANSLATION_KEYS.POST_REPOST)}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Comment Preview */}
      {post.commentCount > 0 && (
        <View style={themed($commentPreview)}>
          <TouchableOpacity>
            <Text style={themed($commentPreviewText)}>
              {t(TRANSLATION_KEYS.POST_VIEW_ALL_COMMENTS, {
                count: post.commentCount,
              })}
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
  minWidth: 70, // 최소 너비 설정으로 버튼 크기 안정화
});

const $loadingIndicator: ThemedStyle<ViewStyle> = () => ({
  opacity: 0.7,
  transform: [{ scale: 1.1 }],
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

const $headerRight: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  alignItems: "center",
});

const $followButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 16,
  borderWidth: 1,
  marginRight: spacing.sm,
});

const $followButtonText: ThemedStyle<TextStyle> = () => ({
  fontSize: 12,
  fontWeight: "600",
});

const $moreButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.xs,
});

// --- 다중 이미지 스타일 ---
const $mediaGrid: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  height: 224,
  gap: 2,
});

const $mediaImageHalf: ThemedStyle<ImageStyle> = ({ colors }) => ({
  flex: 1,
  height: "100%",
  borderRadius: 8,
  backgroundColor: colors.separator,
});

const $mediaRightColumn: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  gap: 2,
});

const $mediaImageQuarter: ThemedStyle<ImageStyle> = ({ colors }) => ({
  flex: 1,
  borderRadius: 8,
  backgroundColor: colors.separator,
});

const $mediaRow: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  flexDirection: "row",
  gap: 2,
});

const $moreImagesOverlay: ThemedStyle<ViewStyle> = () => ({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0, 0, 0, 0.6)",
  justifyContent: "center",
  alignItems: "center",
  borderRadius: 8,
});

const $moreImagesText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 18,
  fontWeight: "bold",
});
