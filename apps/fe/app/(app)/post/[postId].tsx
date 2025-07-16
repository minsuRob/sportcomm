import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ViewStyle,
  TextStyle,
  ImageStyle,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation } from "urql";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Share,
  MoreHorizontal,
  Send,
} from "lucide-react-native";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { GET_POST_DETAIL, TOGGLE_LIKE } from "@/lib/graphql";
import { PostType } from "@/components/PostCard";
import { User, getSession } from "@/lib/auth";
import CommentSection from "@/components/CommentSection";

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
  comments: DetailedComment[];
}

interface PostDetailResponse {
  post: DetailedPost;
}

// --- 헬퍼 함수 ---
const getPostTypeStyle = (type: PostType) => {
  switch (type) {
    case PostType.ANALYSIS:
      return { color: "#6366f1", text: "분석" };
    case PostType.HIGHLIGHT:
      return { color: "#f59e0b", text: "하이라이트" };
    case PostType.CHEERING:
    default:
      return { color: "#10b981", text: "응원" };
  }
};

/**
 * 게시물 상세 페이지 컴포넌트
 * 게시물의 전체 내용, 댓글, 상호작용 기능을 제공합니다
 */
export default function PostDetailScreen() {
  const { themed, theme } = useAppTheme();
  const router = useRouter();
  const { postId } = useLocalSearchParams<{ postId: string }>();

  // 상태 관리
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [refreshComments, setRefreshComments] = useState(0);

  // GraphQL 쿼리 및 뮤테이션
  const [{ data, fetching, error }] = useQuery<PostDetailResponse>({
    query: GET_POST_DETAIL,
    variables: { id: postId },
  });

  const [, executeToggleLike] = useMutation(TOGGLE_LIKE);
  // CREATE_COMMENT는 CommentSection에서 처리하므로 제거

  // 사용자 세션 확인
  useEffect(() => {
    const checkSession = async () => {
      const { user } = await getSession();
      if (user) setCurrentUser(user);
    };
    checkSession();
  }, []);

  // 게시물 데이터 동기화
  useEffect(() => {
    if (data?.post) {
      setIsLiked(false); // TODO: 실제 좋아요 상태 확인
      setLikeCount(data.post.likeCount);
    }
  }, [data]);

  /**
   * 뒤로가기 버튼 핸들러
   */
  const handleGoBack = () => {
    router.back();
  };

  /**
   * 좋아요 토글 핸들러
   */
  const handleLike = async () => {
    if (!data?.post) return;

    const newLikedStatus = !isLiked;
    const newLikeCount = newLikedStatus ? likeCount + 1 : likeCount - 1;

    // 낙관적 업데이트
    setIsLiked(newLikedStatus);
    setLikeCount(newLikeCount);

    try {
      const result = await executeToggleLike({ postId: data.post.id });
      if (result.error) {
        // 실패 시 원래 상태로 복원
        setIsLiked(!newLikedStatus);
        setLikeCount(likeCount);
        console.error("좋아요 토글 실패:", result.error);
      }
    } catch (error) {
      console.error("좋아요 토글 오류:", error);
      setIsLiked(!newLikedStatus);
      setLikeCount(likeCount);
    }
  };

  /**
   * 댓글 추가 후 새로고침 핸들러
   */
  const handleCommentAdded = () => {
    setRefreshComments((prev) => prev + 1);
  };

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
        <Text style={themed($loadingText)}>게시물을 불러오는 중...</Text>
      </View>
    );
  }

  // 에러 상태
  if (error || !data?.post) {
    return (
      <View style={themed($errorContainer)}>
        <Text style={themed($errorText)}>게시물을 불러올 수 없습니다.</Text>
        <TouchableOpacity style={themed($retryButton)} onPress={handleGoBack}>
          <Text style={themed($retryButtonText)}>돌아가기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const post = data.post;
  const postTypeStyle = getPostTypeStyle(post.type);
  const avatarUrl =
    post.author.profileImageUrl ||
    `https://i.pravatar.cc/150?u=${post.author.id}`;

  return (
    <KeyboardAvoidingView
      style={themed($container)}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* 헤더 */}
      <View style={themed($header)}>
        <TouchableOpacity onPress={handleGoBack} style={themed($backButton)}>
          <ArrowLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={themed($headerTitle)}>게시물</Text>
        <TouchableOpacity>
          <MoreHorizontal color={theme.colors.textDim} size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={themed($scrollContainer)}
        showsVerticalScrollIndicator={false}
      >
        {/* 게시물 헤더 */}
        <View style={themed($postHeader)}>
          <Image source={{ uri: avatarUrl }} style={themed($authorAvatar)} />
          <View style={themed($authorInfo)}>
            <Text style={themed($authorName)}>{post.author.nickname}</Text>
            <Text style={themed($postDate)}>
              {new Date(post.createdAt).toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
          <View
            style={[
              themed($typeBadge),
              { backgroundColor: postTypeStyle.color },
            ]}
          >
            <Text style={themed($typeBadgeText)}>{postTypeStyle.text}</Text>
          </View>
        </View>

        {/* 게시물 내용 */}
        <View style={themed($postContent)}>
          <Text style={themed($contentText)}>{post.content}</Text>
        </View>

        {/* 미디어 */}
        {post.media.length > 0 && (
          <View style={themed($mediaSection)}>
            {post.media.map((media) => (
              <Image
                key={media.id}
                source={{ uri: media.url }}
                style={themed($mediaImage)}
                resizeMode="cover"
              />
            ))}
          </View>
        )}

        {/* 통계 정보 */}
        <View style={themed($statsSection)}>
          <Text style={themed($statText)}>{likeCount}개의 좋아요</Text>
          <Text style={themed($statText)}>{post.commentCount}개의 댓글</Text>
          <Text style={themed($statText)}>{post.viewCount}회 조회</Text>
        </View>

        {/* 액션 버튼 */}
        <View style={themed($actionSection)}>
          <TouchableOpacity style={themed($actionButton)} onPress={handleLike}>
            <Heart
              size={24}
              color={isLiked ? theme.colors.error : theme.colors.textDim}
              fill={isLiked ? theme.colors.error : "transparent"}
            />
            <Text
              style={[
                themed($actionText),
                { color: isLiked ? theme.colors.error : theme.colors.textDim },
              ]}
            >
              좋아요
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={themed($actionButton)}>
            <MessageCircle size={24} color={theme.colors.textDim} />
            <Text style={themed($actionText)}>댓글</Text>
          </TouchableOpacity>

          <TouchableOpacity style={themed($actionButton)} onPress={handleShare}>
            <Share size={24} color={theme.colors.textDim} />
            <Text style={themed($actionText)}>공유</Text>
          </TouchableOpacity>
        </View>

        {/* 댓글 섹션 - CommentSection 컴포넌트 사용 */}
        <CommentSection
          postId={post.id}
          comments={post.comments}
          currentUser={currentUser}
          onCommentAdded={handleCommentAdded}
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

const $postHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  padding: spacing.md,
});

const $authorAvatar: ThemedStyle<ImageStyle> = () => ({
  width: 50,
  height: 50,
  borderRadius: 25,
});

const $authorInfo: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  marginLeft: spacing.sm,
});

const $authorName: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  fontWeight: "bold",
  color: colors.text,
});

const $postDate: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 14,
  color: colors.textDim,
  marginTop: spacing.xxxs,
});

const $typeBadge: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xxxs,
  borderRadius: 12,
});

const $typeBadgeText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 12,
  fontWeight: "bold",
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

const $mediaImage: ThemedStyle<ImageStyle> = ({ spacing }) => ({
  width: "100%",
  height: 300,
  borderRadius: 12,
  marginBottom: spacing.sm,
});

const $statsSection: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-around",
  paddingVertical: spacing.md,
  borderTopWidth: 1,
  borderBottomWidth: 1,
  borderColor: colors.border,
  marginHorizontal: spacing.md,
});

const $statText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
});

const $actionSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-around",
  paddingVertical: spacing.lg,
  paddingHorizontal: spacing.md,
});

const $actionButton: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  alignItems: "center",
});

const $actionText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  marginLeft: spacing.xs,
  fontSize: 16,
  fontWeight: "500",
  color: colors.textDim,
});

// CommentSection 컴포넌트에서 처리하므로 댓글 관련 스타일 제거
