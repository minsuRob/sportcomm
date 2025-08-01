import React, { useState, useEffect, useMemo } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { usePostInteractions } from "../hooks/usePostInteractions";
import { PostType } from "./shared/PostHeader";
import { Media } from "./shared/PostMedia";
import PostActions from "./shared/PostActions";
import PostContextMenu from "./shared/PostContextMenu";
import { isWeb } from "@/lib/platform";
import { usePostImageDimensions, IMAGE_CONSTANTS } from "@/lib/image";
import { getSession } from "@/lib/auth";

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
  title?: string; // 기존 데이터와의 호환성을 위해 선택적 필드로 유지
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
    (now.getTime() - postDate.getTime()) / (1000 * 60 * 60)
  );

  if (diffHours < 1) return "방금 전";
  if (diffHours < 24) return `${diffHours}h`;
  return postDate.toLocaleDateString("ko-KR");
};

/**
 * 텍스트 테두리 효과를 위한 컴포넌트
 */
/**
 * 테두리 효과가 있는 텍스트를 렌더링하는 함수
 * @param content 표시할 텍스트 내용
 * @param themed 테마 적용 함수
 * @param style 추가 스타일 (선택)
 * @param numberOfLines 최대 표시 줄 수 (기본값: 4)
 * @param fontSize 폰트 크기 (선택)
 * @param lineHeight 줄 간격 (선택)
 * @returns JSX 엘리먼트
 */
const renderStrokedText = ({
  content,
  themed,
  style,
  numberOfLines = 4,
  fontSize,
  lineHeight,
}: {
  content: string;
  themed: (style: ThemedStyle<TextStyle>) => TextStyle;
  style?: TextStyle;
  numberOfLines?: number;
  fontSize?: number;
  lineHeight?: number;
}) => {
  // 스트로크 스타일 배열 정의
  const strokeStyles = [
    $contentTextStroke,
    $contentTextStroke2,
    $contentTextStroke3,
    $contentTextStroke4,
    $contentTextStroke5,
    $contentTextStroke6,
  ];

  // 기본 스타일 또는 오버라이드된 스타일 적용
  const getStrokeStyle = (baseStyle: ThemedStyle<TextStyle>) => {
    return themed((theme) => {
      const base = baseStyle(theme);
      return {
        ...base,
        ...(fontSize ? { fontSize } : {}),
        ...(lineHeight ? { lineHeight } : {}),
        ...(style || {}),
      };
    });
  };

  return (
    <>
      {/* 테두리 효과를 위한 여러 레이어의 텍스트 */}
      {strokeStyles.map((strokeStyle, index) => (
        <Text
          key={`stroke-${index}`}
          style={getStrokeStyle(strokeStyle)}
          numberOfLines={numberOfLines}
          aria-hidden
        >
          {content}
        </Text>
      ))}

      {/* 메인 텍스트 (최상위에 표시) */}
      <Text
        style={[
          themed($contentText),
          style,
          fontSize ? { fontSize } : null,
          lineHeight ? { lineHeight } : null,
        ]}
        numberOfLines={numberOfLines}
      >
        {content}
      </Text>
    </>
  );
};

// 이전 StrokedText 컴포넌트를 새 함수로 대체하기 위한 호환성 래퍼
const StrokedText = (props: Parameters<typeof renderStrokedText>[0]) => {
  return renderStrokedText(props);
};

/**
 * 컨텐츠 텍스트와 테두리 효과 렌더링 함수
 * @param content 표시할 텍스트 내용
 * @param themed 테마 적용 함수
 * @param containerStyle 컨테이너 추가 스타일
 * @param fontSize 폰트 크기
 * @param lineHeight 줄 간격
 * @param numberOfLines 최대 표시 줄 수 (기본값: 4)
 * @returns JSX 엘리먼트
 */
const renderContentText = ({
  content,
  themed,
  containerStyle,
  fontSize = 24,
  lineHeight = 32,
  numberOfLines = 4,
}: {
  content: string;
  themed: <T>(style: ThemedStyle<T>) => T;
  containerStyle?: ViewStyle;
  fontSize?: number;
  lineHeight?: number;
  numberOfLines?: number;
}) => {
  return (
    <View style={[themed($contentContainer), containerStyle]}>
      {/* 스트로크 효과가 있는 텍스트 렌더링 */}
      {renderStrokedText({
        content,
        themed,
        fontSize,
        lineHeight,
        numberOfLines,
      })}
    </View>
  );
};

// --- The Component ---
export default function PostCard({ post, onPostUpdated }: PostCardProps) {
  const { themed, theme } = useAppTheme();
  const router = useRouter();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // 컨텍스트 메뉴 상태 관리
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // __DEV__ 상수 선언 (React Native에서는 기본 제공되지만 웹에서는 아닐 수 있음)
  const __DEV__ = process.env.NODE_ENV === "development";

  // 이미지 미디어만 필터링
  const imageMedia = post.media.filter(
    (item) => item.type === "image" || item.type === "IMAGE"
  );

  // 공통 이미지 최적화 훅 사용
  const { imageAspectRatio, imageHeight, imageLoading, error } =
    usePostImageDimensions(imageMedia.length > 0 ? imageMedia[0]?.url : null);

  // 현재 사용자 정보 가져오기
  useEffect(() => {
    const loadCurrentUser = async () => {
      const { user } = await getSession();
      setCurrentUser(user);
    };
    loadCurrentUser();
  }, []);

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

  // 컨텍스트 메뉴 핸들러
  const handleMorePress = (e: any) => {
    e.stopPropagation(); // 부모의 onPress 이벤트 방지
    setShowContextMenu(true);
  };

  const handleCloseContextMenu = () => {
    setShowContextMenu(false);
  };

  // 이미지 미디어는 위에서 이미 필터링되었음

  // 불필요한 코드 제거

  // 디버깅용 - post 데이터 구조 확인 (개발 중에만 사용)
  useEffect(() => {
    if (__DEV__) {
      console.log(`PostCard - post.id: ${post.id}`);
      console.log(`PostCard - post.title: ${post.title || "제목 없음"}`);
      console.log(
        `PostCard - post.content: ${post.content.substring(0, 20)}...`
      );
    }
  }, [post.id]);

  // usePostImageDimensions 훅을 사용하여 이미지 비율과 높이 계산
  // 이 훅에서 이미지 로딩, 크기 계산, 오류 처리 등을 자동으로 수행합니다.
  // 해당 로직이 위에 이미 구현되어 있으므로 중복 코드 제거

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
                // 로딩 중 인디케이터 표시
                <View style={themed($loadingContainer)}>
                  <ActivityIndicator size="large" color="#FFFFFF" />
                </View>
              ) : (
                // 이미지가 있고 로딩 완료된 상태
                <View
                  style={{
                    aspectRatio:
                      imageAspectRatio || IMAGE_CONSTANTS.DEFAULT_ASPECT_RATIO, // 원본 이미지 비율 유지
                    maxHeight: screenHeight * IMAGE_CONSTANTS.MAX_HEIGHT_RATIO, // 화면 높이의 60%로 최대 높이 제한
                    minHeight: IMAGE_CONSTANTS.MIN_HEIGHT, // 최소 높이 300px로 설정
                    backgroundColor: themed($mediaContainer).backgroundColor, // 배경색 설정
                    position: "relative",
                    overflow: "hidden", // 이미지가 컨테이너를 넘어가지 않도록 설정
                    justifyContent: "center", // 세로 중앙 정렬
                    alignItems: "center", // 가로 중앙 정렬
                  }}
                >
                  <Image
                    source={{ uri: imageMedia[0]?.url }}
                    style={{
                      ...(imageHeight &&
                      imageHeight < IMAGE_CONSTANTS.MIN_HEIGHT
                        ? // 이미지 높이가 300px 이하인 경우: 원본 크기로 표시 (가운데 정렬)
                          {
                            height: imageHeight,
                            width:
                              imageHeight *
                              (imageAspectRatio ||
                                IMAGE_CONSTANTS.DEFAULT_ASPECT_RATIO),
                            alignSelf: "center", // 가로 중앙 정렬
                          }
                        : // 이미지 높이가 300px 초과인 경우: 전체 채움
                          { height: "100%", width: "100%" }),
                    }}
                    resizeMode={
                      imageHeight && imageHeight < IMAGE_CONSTANTS.MIN_HEIGHT
                        ? "contain"
                        : "cover"
                    }
                  />
                  {/* 이미지 위에 그라데이션 오버레이 적용 */}
                  <View style={themed($gradientOverlay)} />
                </View>
              )
            ) : (
              // 이미지가 없는 경우 빈 컨테이너 표시
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

            {/* 카테고리 배지와 더보기 버튼을 포함하는 컨테이너 */}
            <View style={themed($topRightContainer)}>
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

              {/* 더보기 버튼 */}
              <TouchableOpacity
                style={themed($moreButton)}
                onPress={handleMorePress}
                activeOpacity={0.7}
              >
                <Ionicons name="ellipsis-horizontal" size={20} color="white" />
              </TouchableOpacity>
            </View>

            {/* title이 있으면 표시 */}
            {post.title && post.title.trim() ? (
              <View style={themed($titleContainer)}>
                {renderStrokedText({
                  content: post.title,
                  themed: themed,
                  fontSize: 24,
                  lineHeight: 42,
                  numberOfLines: 2,
                })}
              </View>
            ) : null}
            {renderContentText({
              content: post.content,
              themed: themed,
              containerStyle:
                post.title && post.title.trim()
                  ? { bottom: 35 }
                  : ({} as ViewStyle),
              fontSize: 14,
              lineHeight: 32,
              numberOfLines: 2,
            })}
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

      {/* 컨텍스트 메뉴 */}
      <PostContextMenu
        visible={showContextMenu}
        onClose={handleCloseContextMenu}
        post={{
          id: post.id,
          title: post.title,
          content: post.content,
          type: post.type,
          author: {
            id: post.author.id,
            nickname: post.author.nickname,
          },
        }}
        currentUserId={currentUser?.id}
        onPostUpdated={onPostUpdated}
      />
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
  backgroundColor: colors.backgroundDim, // 이미지 배경색 설정
});

const $loadingContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  height: 300, // 로딩 컨테이너 높이 300px로 고정
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: colors.backgroundDim, // 로딩 시 배경색
});

const $mediaImage: ThemedStyle<ImageStyle> = () => ({
  // 스타일은 조건부로 직접 적용되므로 여기서는 기본 스타일만 지정
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

// 오른쪽 위 컨테이너 - 카테고리 배지와 더보기 버튼을 포함
const $topRightContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  position: "absolute",
  top: spacing.md,
  right: spacing.md,
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
  zIndex: 3,
});

// 카테고리 배지
const $categoryBadge: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  borderRadius: 20,
  paddingVertical: spacing.xs,
  paddingHorizontal: spacing.sm,
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

// 제목 텍스트 - 하단에서 위쪽
const $titleContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  position: "absolute",
  bottom: spacing.md + 90, // content 위에 배치
  left: spacing.md,
  right: 80,
  zIndex: 3,
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
  fontSize: 24, // StrokedText 컴포넌트에서 오버라이드됨
  fontWeight: "bold",
  lineHeight: 32, // StrokedText 컴포넌트에서 오버라이드됨
  position: "relative",
  zIndex: 1,
});

const $emptyMediaContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  height: 300, // 이미지가 없을 때 높이 300px로 고정
  width: "100%",
  backgroundColor: colors.backgroundDim, // 이미지가 없을 때 배경색 설정
});

// 더보기 버튼
const $moreButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  width: 32,
  height: 32,
  borderRadius: 16,
  backgroundColor: "rgba(0, 0, 0, 0.4)",
  justifyContent: "center",
  alignItems: "center",
  borderWidth: 1,
  borderColor: "rgba(255, 255, 255, 0.2)",
});
