import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ViewStyle,
  TextStyle,
  ImageStyle,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@apollo/client";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { useTranslation, TRANSLATION_KEYS } from "@/lib/i18n/useTranslation";
import { GET_POSTS } from "@/lib/graphql";
import { User, getSession } from "@/lib/auth";
import { selectOptimizedImageUrl } from "@/lib/image";

// 날짜 포맷팅 함수 (임시로 여기에 정의)
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

// --- 타입 정의 ---
interface BoardPost {
  id: string;
  title?: string;
  content: string;
  createdAt: string;
  viewCount: number;
  commentCount: number;
  author: {
    id: string;
    nickname: string;
    profileImageUrl?: string;
  };
  media: Array<{
    id: string;
    url: string;
    type: "image" | "video" | "IMAGE" | "VIDEO";
  }>;
}

interface BoardPostsResponse {
  posts: {
    posts: BoardPost[];
    hasNext: boolean;
    page: number;
  };
}

/**
 * 상세 게시판 화면 컴포넌트
 * 게시물 목록을 표 형태로 표시합니다.
 */
export default function BoardScreen() {
  const { themed, theme } = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // 게시물 목록 조회
  const {
    data,
    loading: fetching,
    error,
    refetch,
  } = useQuery<BoardPostsResponse>(GET_POSTS, {
    variables: {
      input: { page: 1, limit: 50 }, // 더 많은 게시물 로드
    },
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
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
   * 게시물 클릭 핸들러
   */
  const handlePostPress = (postId: string) => {
    router.push(`/(details)/post/${postId}`);
  };

  /**
   * 사용자 프로필 클릭 핸들러
   */
  const handleUserPress = (userId: string) => {
    router.push(`/(modals)/user-profile?userId=${userId}`);
  };

  /**
   * 게시물 아이템 렌더링
   */
  const renderPostItem = ({ item }: { item: BoardPost }) => {
    const imageMedia = item.media.find(
      (media) => media.type === "image" || media.type === "IMAGE"
    );
    const videoMedia = item.media.find(
      (media) => media.type === "video" || media.type === "VIDEO"
    );

    return (
      <TouchableOpacity
        style={themed($postItem)}
        onPress={() => handlePostPress(item.id)}
        activeOpacity={0.7}
      >
        {/* 왼쪽: 게시물 정보 */}
        <View style={themed($postInfo)}>
          {/* 제목 */}
          <Text style={themed($postTitle)} numberOfLines={2}>
            {item.title || item.content.substring(0, 50)}
            {!item.title && item.content.length > 50 && "..."}
          </Text>

          {/* 작성자 및 메타 정보 */}
          <View style={themed($postMeta)}>
            <TouchableOpacity
              onPress={() => handleUserPress(item.author.id)}
              activeOpacity={0.7}
            >
              <Text style={themed($authorName)}>{item.author.nickname}</Text>
            </TouchableOpacity>

            {/* 사용자 레벨 표시 */}
            <View style={themed($userLevel)}>
              <Text style={themed($userLevelText)}>4</Text>
            </View>

            {/* 시간 */}
            <Text style={themed($postTime)}>
              {formatTimeAgo(item.createdAt)}
            </Text>

            {/* 조회수 */}
            <Text style={themed($viewCount)}>조회 {item.viewCount}</Text>
          </View>
        </View>

        {/* 오른쪽: 썸네일과 댓글 */}
        <View style={themed($postRight)}>
          {/* 썸네일과 댓글을 가로로 배치 */}
          <View style={themed($thumbnailAndCommentRow)}>
            {/* 썸네일 */}
            {imageMedia && (
              <View style={themed($thumbnailContainer)}>
                <Image
                  source={{
                    uri: selectOptimizedImageUrl(imageMedia, "thumbnails"),
                  }}
                  style={themed($thumbnail)}
                  resizeMode="cover"
                />
                {videoMedia && (
                  <View style={themed($playIcon)}>
                    <Ionicons name="play" size={16} color="white" />
                  </View>
                )}
              </View>
            )}

            {/* 댓글 수 - 썸네일 오른쪽에 배치 */}
            <View style={themed($commentCount)}>
              <Text style={themed($commentCountText)}>{item.commentCount}</Text>
              <Text style={themed($commentLabel)}>댓글</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  /**
   * 빈 상태 렌더링
   */
  const renderEmptyState = () => (
    <View style={themed($emptyContainer)}>
      <Ionicons
        name="document-text-outline"
        size={64}
        color={theme.colors.text}
      />
      <Text style={themed($emptyTitle)}>게시물이 없습니다</Text>
      <Text style={themed($emptySubtitle)}>새로운 게시물을 작성해보세요</Text>
    </View>
  );

  /**
   * 로딩 상태 렌더링
   */
  const renderLoadingState = () => (
    <View style={themed($loadingContainer)}>
      <ActivityIndicator size="large" color={theme.colors.tint} />
      <Text style={themed($loadingText)}>게시물을 불러오는 중...</Text>
    </View>
  );

  return (
    <View style={themed($container)}>
      {/* 헤더 */}
      <View style={themed($header)}>
        <TouchableOpacity onPress={handleGoBack} style={themed($backButton)}>
          <Ionicons name="arrow-back" color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={themed($headerTitle)}>상세 게시판</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* 게시물 목록 */}
      {fetching ? (
        renderLoadingState()
      ) : error ? (
        <View style={themed($errorContainer)}>
          <Text style={themed($errorText)}>게시물을 불러올 수 없습니다</Text>
          <TouchableOpacity
            style={themed($retryButton)}
            onPress={() => refetch()}
          >
            <Text style={themed($retryButtonText)}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={data?.posts?.posts || []}
          renderItem={renderPostItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={themed($listContainer)}
          ListEmptyComponent={renderEmptyState}
          ItemSeparatorComponent={() => <View style={themed($separator)} />}
        />
      )}
    </View>
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
  backgroundColor: colors.card,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $backButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: colors.backgroundAlt,
  justifyContent: "center",
  alignItems: "center",
});

const $headerTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
  fontWeight: "bold",
  color: colors.text,
  flex: 1,
  textAlign: "center",
});

const $listContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.md,
});

const $postItem: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  backgroundColor: colors.card,
  borderRadius: 12,
  padding: spacing.md,
  marginBottom: spacing.sm,
  borderWidth: 1,
  borderColor: colors.border,
  minHeight: 80, // 최소 높이 설정으로 일관된 크기 보장
});

const $postInfo: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  marginRight: spacing.md,
  justifyContent: "space-between", // 세로 방향 균등 분배
});

const $postTitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 16,
  fontWeight: "600",
  color: colors.text,
  marginBottom: spacing.sm,
  lineHeight: 22,
  flex: 1, // 제목이 공간을 차지하도록 설정
});

const $postMeta: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
  flexWrap: "wrap", // 긴 내용일 때 줄바꿈 허용
});

const $authorName: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  fontWeight: "500",
  color: colors.text,
});

const $userLevel: ThemedStyle<ViewStyle> = () => ({
  width: 20,
  height: 20,
  borderRadius: 4,
  backgroundColor: "#4CAF50",
  justifyContent: "center",
  alignItems: "center",
  marginLeft: 4,
});

const $userLevelText: ThemedStyle<TextStyle> = () => ({
  fontSize: 12,
  fontWeight: "bold",
  color: "white",
});

const $postTime: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 12,
  color: colors.textDim,
  marginLeft: spacing.xs,
});

const $viewCount: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 12,
  color: colors.textDim,
  marginLeft: spacing.xs,
});

const $postRight: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "flex-end", // 오른쪽 정렬
  justifyContent: "center", // 세로 중앙 정렬
  minWidth: 120, // 썸네일과 댓글을 포함할 수 있는 최소 너비
});

const $thumbnailAndCommentRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row", // 가로 배치
  alignItems: "center", // 세로 중앙 정렬
  gap: spacing.sm, // 썸네일과 댓글 사이 간격
});

const $thumbnailContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  position: "relative",
  width: 60,
  height: 60,
  borderRadius: 8,
  overflow: "hidden",
});

const $thumbnail: ThemedStyle<ImageStyle> = () => ({
  width: "100%",
  height: "100%",
});

const $playIcon: ThemedStyle<ViewStyle> = () => ({
  position: "absolute",
  bottom: 4,
  left: 4,
  width: 24,
  height: 24,
  borderRadius: 12,
  backgroundColor: "rgba(0, 0, 0, 0.7)",
  justifyContent: "center",
  alignItems: "center",
});

const $commentCount: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.backgroundAlt,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 6,
  alignItems: "center",
  minWidth: 50,
  height: 60, // 썸네일과 같은 높이로 맞춤
  justifyContent: "center",
});

const $commentCountText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  fontWeight: "600",
  color: colors.text,
  lineHeight: 16,
});

const $commentLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 10,
  color: colors.textDim,
  lineHeight: 12,
});

const $separator: ThemedStyle<ViewStyle> = ({ colors }) => ({
  height: 1,
  backgroundColor: colors.border,
  marginVertical: 8,
});

const $emptyContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingVertical: spacing.xl * 2,
});

const $emptyTitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 18,
  fontWeight: "600",
  color: colors.text,
  marginTop: spacing.md,
  marginBottom: spacing.xs,
});

const $emptySubtitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
});

const $loadingContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingVertical: spacing.xl * 2,
});

const $loadingText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 16,
  color: colors.textDim,
  marginTop: spacing.md,
});

const $errorContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingVertical: spacing.xl * 2,
});

const $errorText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 16,
  color: colors.error,
  marginBottom: spacing.md,
  textAlign: "center",
});

const $retryButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.tint,
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.sm,
  borderRadius: 8,
});

const $retryButtonText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 14,
  fontWeight: "600",
});
