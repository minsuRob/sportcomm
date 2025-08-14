/**
 * PostCard 컴포넌트
 *
 * 소셜 미디어 스타일의 게시물 카드를 렌더링합니다.
 * 이미지, 동영상, 텍스트 콘텐츠를 지원하며 반응형 디자인을 적용합니다.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Pressable,
  ViewStyle,
  TextStyle,
  ImageStyle,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery } from "@apollo/client";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { usePostInteractions } from "../hooks/usePostInteractions";
import { GET_MY_TEAMS, type GetMyTeamsResult } from "@/lib/graphql/teams";
import TeamLogo from "./TeamLogo";
import PostActions from "./shared/PostActions";
import PostContextMenu from "./shared/PostContextMenu";
import { isWeb } from "@/lib/platform";
import {
  usePostImageDimensions,
  IMAGE_CONSTANTS,
  selectOptimizedImageUrl,
} from "@/lib/image";
import { getSession } from "@/lib/auth";
import { useResponsive } from "@/lib/hooks/useResponsive";
import UserAvatar from "@/components/users/UserAvatar";

// expo-video는 조건부로 import (웹에서 문제 발생 방지)
let Video: any = null;
try {
  if (!isWeb()) {
    Video = require("expo-video").Video;
  }
} catch (error) {
  console.warn("expo-video를 로드할 수 없습니다:", error);
}

// --- 타입 정의 ---
export interface User {
  id: string;
  nickname: string;
  profileImageUrl?: string;
  isFollowing?: boolean;
  myTeams?: {
    team: {
      id: string;
      name: string;
      logoUrl?: string;
      icon: string;
    };
  }[];
}

export interface Comment {
  id: string;
  content: string;
}

export interface Media {
  id: string;
  url: string;
  type: "image" | "video" | "IMAGE" | "VIDEO";
  width?: number;
  height?: number;
  duration?: number;
}

export enum PostType {
  ANALYSIS = "ANALYSIS",
  HIGHLIGHT = "HIGHLIGHT",
  CHEERING = "CHEERING",
}

export interface Post {
  id: string;
  title?: string;
  content: string;
  type: PostType;
  teamId: string;
  media: Media[];
  author: User;
  likeCount: number;
  isLiked: boolean;
  isBookmarked?: boolean;
  createdAt: string;
  commentCount?: number;
  viewCount?: number;
  isMock?: boolean;
}

export interface PostCardProps {
  post: Post;
  onPostUpdated?: (post: Post) => void;
}

// --- 유틸리티 함수 ---

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
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

/**
 * 테두리가 있는 텍스트 렌더링 함수
 */
const renderStrokedText = ({
  content,
  themed,
  containerStyle,
  fontSize = 24,
  lineHeight = 32,
  numberOfLines = 4,
}: {
  content: string;
  themed: any;
  containerStyle?: ViewStyle;
  fontSize?: number;
  lineHeight?: number;
  numberOfLines?: number;
}) => {
  return (
    <View style={[themed($titleContainer), containerStyle]}>
      {/* 테두리 효과를 위한 여러 레이어 */}
      <Text
        style={[
          themed($contentTextStroke),
          { fontSize, lineHeight, left: -1, top: -1 },
        ]}
        numberOfLines={numberOfLines}
      >
        {content}
      </Text>
      <Text
        style={[
          themed($contentTextStroke2),
          { fontSize, lineHeight, left: 1, top: -1 },
        ]}
        numberOfLines={numberOfLines}
      >
        {content}
      </Text>
      <Text
        style={[
          themed($contentTextStroke3),
          { fontSize, lineHeight, left: -1, top: 1 },
        ]}
        numberOfLines={numberOfLines}
      >
        {content}
      </Text>
      <Text
        style={[
          themed($contentTextStroke4),
          { fontSize, lineHeight, left: 1, top: 1 },
        ]}
        numberOfLines={numberOfLines}
      >
        {content}
      </Text>
      <Text
        style={[
          themed($contentTextStroke5),
          { fontSize, lineHeight, left: -2, top: 0 },
        ]}
        numberOfLines={numberOfLines}
      >
        {content}
      </Text>
      <Text
        style={[
          themed($contentTextStroke6),
          { fontSize, lineHeight, left: 2, top: 0 },
        ]}
        numberOfLines={numberOfLines}
      >
        {content}
      </Text>
      {/* 메인 텍스트 */}
      <Text
        style={[themed($contentText), { fontSize, lineHeight }]}
        numberOfLines={numberOfLines}
      >
        {content}
      </Text>
    </View>
  );
};

/**
 * 콘텐츠 텍스트 렌더링 함수
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
  themed: any;
  containerStyle?: ViewStyle;
  fontSize?: number;
  lineHeight?: number;
  numberOfLines?: number;
}) => {
  return (
    <View style={[themed($contentContainer), containerStyle]}>
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

// --- 메인 컴포넌트 ---
const PostCard = React.memo(function PostCard({
  post,
  onPostUpdated,
}: PostCardProps) {
  const { themed, theme } = useAppTheme();
  const router = useRouter();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // 컨텍스트 메뉴 상태 관리
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const { data: myTeamsData } = useQuery<GetMyTeamsResult>(GET_MY_TEAMS, {
    skip: !currentUser || post.author.id !== currentUser.id,
    fetchPolicy: "cache-and-network",
  });

  // 개발 환경 체크
  const __DEV__ = process.env.NODE_ENV === "development";

  // 미디어 타입별 필터링
  const imageMedia = post.media.filter(
    (item) => item.type === "image" || item.type === "IMAGE"
  );
  const videoMedia = post.media.filter(
    (item) => item.type === "video" || item.type === "VIDEO"
  );

  // 동영상 재생 상태 관리
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [showVideoControls, setShowVideoControls] = useState(false);
  const [isVideoVisible, setIsVideoVisible] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoContainerRef = useRef<View | null>(null);
  const [videoTouched, setVideoTouched] = useState(false);
  const [autoPlayAttempted, setAutoPlayAttempted] = useState(false);
  const [showAutoplayIndicator, setShowAutoplayIndicator] = useState(false);

  // 반응형 환경 감지
  const { isDesktop } = useResponsive();

  // 공통 이미지 최적화 훅 사용 (웹/모바일 환경 고려)
  const { imageAspectRatio, imageHeight, imageLoading } =
    usePostImageDimensions(
      imageMedia.length > 0 ? imageMedia[0]?.url : null,
      isWeb()
    );

  // 현재 사용자 정보 가져오기
  useEffect(() => {
    const loadCurrentUser = async () => {
      const { user } = await getSession();
      setCurrentUser(user);
    };
    loadCurrentUser();
  }, []);

  // 게시물 상호작용 훅 사용
  const {
    isLiked,
    likeCount,
    isLikeProcessing,
    isLikeError,
    handleLike,
    isBookmarked,
    isBookmarkProcessing,
    handleBookmark,
    isFollowing,
    handleFollowToggle,
    followLoading,
  } = usePostInteractions({
    postId: post.id,
    authorId: post.author.id,
    authorName: post.author.nickname,
    initialLikeCount: post.likeCount,
    initialIsLiked: post.isLiked,
    initialIsFollowing: post.author.isFollowing || false,
    initialIsBookmarked: post.isBookmarked || false,
  });

  // 게시물 상세 페이지로 이동하는 함수
  const handlePostPress = useCallback(() => {
    router.push({
      pathname: "/post/[postId]",
      params: { postId: post.id },
    });
  }, [post.id, router]);

  // 비디오 터치 핸들러
  const handleVideoPress = useCallback(() => {
    setVideoTouched(true);
    setShowVideoControls(!showVideoControls);

    if (isWeb() && videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsVideoPlaying(true);
      } else {
        videoRef.current.pause();
        setIsVideoPlaying(false);
      }
    }
  }, [showVideoControls]);

  // 컨텍스트 메뉴 핸들러
  const handleMorePress = useCallback((e: any) => {
    e.stopPropagation();
    setShowContextMenu(true);
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setShowContextMenu(false);
  }, []);

  // 디버깅용 - post 데이터 구조 확인 (개발 중에만 사용)
  useEffect(() => {
    if (__DEV__) {
      // 게시물 디버깅 로그를 한 줄로 통합
      console.log(
        `PostCard - post.id: ${post.id}, post.title: ${post.title || "제목 없음"}, post.content: ${post.content.substring(0, 20)}...`
      );
    }
  }, [post.id]);

  // 비디오 가시성 감지 및 자동 재생 처리
  useEffect(() => {
    if (videoMedia.length === 0) return;

    // 웹 환경: IntersectionObserver 사용
    if (isWeb()) {
      const handleVisibilityChange = (entries: IntersectionObserverEntry[]) => {
        const [entry] = entries;
        const isVisible = entry.isIntersecting;

        setIsVideoVisible(isVisible);

        // 자동 재생 표시기 상태 업데이트
        if (isVisible) {
          setShowAutoplayIndicator(true);
          setTimeout(() => setShowAutoplayIndicator(false), 3000);
        } else {
          setShowAutoplayIndicator(false);
        }

        // 화면에 보일 때 자동 재생 시작, 화면에서 벗어나면 일시 정지
        if (isVisible) {
          if (videoRef.current) {
            videoRef.current
              .play()
              .catch((err) => console.log("비디오 자동 재생 실패:", err));
          }
        } else {
          if (videoRef.current && !videoRef.current.paused) {
            videoRef.current.pause();
          }
        }
      };

      const observer = new IntersectionObserver(handleVisibilityChange, {
        threshold: 0.5,
      });

      // 비디오 컨테이너 관찰 시작
      if (videoContainerRef.current && typeof window !== "undefined") {
        // @ts-ignore - React Native의 View 타입과 DOM Element 타입 간의 호환성 이슈
        observer.observe(videoContainerRef.current);
      }

      return () => {
        observer.disconnect();
      };
    }
  }, [videoMedia.length]);

  // 팀별 카테고리 정보 (예시)
  const getCategoryInfo = (teamId: string) => {
    const categories: Record<string, any> = {
      baseball: {
        name: "야구",
        icon: "baseball",
        colors: {
          primary: "#FF6B35",
          secondary: "#FFE5D9",
          border: "#FF6B35",
          glow: "#FF6B35",
        },
      },
      soccer: {
        name: "축구",
        icon: "football",
        colors: {
          primary: "#4ECDC4",
          secondary: "#E8F8F7",
          border: "#4ECDC4",
          glow: "#4ECDC4",
        },
      },
      basketball: {
        name: "농구",
        icon: "basketball",
        colors: {
          primary: "#FFD93D",
          secondary: "#FFF8E1",
          border: "#FFD93D",
          glow: "#FFD93D",
        },
      },
    };

    return (
      categories[teamId] || {
        name: "스포츠1",
        icon: "trophy",
        colors: {
          primary: "#6C7CE7",
          secondary: "#E8EAFF",
          border: "#6C7CE7",
          glow: "#6C7CE7",
        },
      }
    );
  };

  const categoryInfo = getCategoryInfo(post.teamId);

  // 팀 이름 유도: 우선순위
  // 1) post.team?.name
  // 2) post.teamName
  // 3) author.myTeams에서 post.teamId에 해당하는 팀의 name
  // 4) fallback: "팀"
  const deriveTeamName = (): string => {
    const anyPost: any = post as any;
    if (anyPost?.team?.name && typeof anyPost.team.name === "string") {
      return anyPost.team.name as string;
    }
    if (typeof anyPost?.teamName === "string" && anyPost.teamName) {
      return anyPost.teamName as string;
    }
    const authorMyTeams = anyPost?.author?.myTeams;
    if (Array.isArray(authorMyTeams)) {
      const found = authorMyTeams.find(
        (ut: any) => ut?.team?.id === post.teamId
      );
      if (found?.team?.name) return found.team.name as string;
    }
    return "팀";
  };
  const teamName = deriveTeamName();

  return (
    <View style={themed($outerContainer)}>
      {/* 외부 글로우 효과 */}
      <View
        style={[
          themed($outerGlow),
          {
            shadowColor: categoryInfo.colors.glow,
          },
        ]}
      >
        {/* 글로우 배경 레이어 */}
        <View
          style={[
            themed($glowBackground),
            {
              backgroundColor: categoryInfo.colors.glow + "05",
            },
          ]}
        />

        {/* 테두리 레이어 */}
        <View
          style={[
            themed($borderLayer),
            {
              borderColor: categoryInfo.colors.border,
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
              {videoMedia.length > 0 ? (
                // 동영상이 있는 경우
                <Pressable
                  ref={videoContainerRef}
                  onPress={handleVideoPress}
                  style={{
                    aspectRatio: 16 / 9,
                    maxHeight:
                      screenHeight *
                      (isWeb()
                        ? IMAGE_CONSTANTS.WEB.MAX_HEIGHT_RATIO
                        : IMAGE_CONSTANTS.MOBILE.MAX_HEIGHT_RATIO),
                    minHeight: isWeb()
                      ? IMAGE_CONSTANTS.WEB.MIN_HEIGHT
                      : IMAGE_CONSTANTS.MOBILE.MIN_HEIGHT,
                    backgroundColor: themed($mediaContainer).backgroundColor,
                    position: "relative",
                    overflow: "hidden",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                  onLayout={() => {
                    if (!isWeb() && videoMedia.length > 0) {
                      setIsVideoVisible(true);
                    }
                  }}
                >
                  {isWeb() ? (
                    <video
                      ref={videoRef}
                      src={videoMedia[0]?.url}
                      style={{
                        height: "100%",
                        width: "100%",
                        objectFit: "cover",
                        cursor: "pointer",
                      }}
                      muted={true}
                      loop={false}
                      controls={videoTouched || showVideoControls}
                      onClick={handleVideoPress}
                      onPlay={() => setIsVideoPlaying(true)}
                      onPause={() => setIsVideoPlaying(false)}
                    />
                  ) : Video ? (
                    <Video
                      source={{ uri: videoMedia[0]?.url }}
                      style={{ height: "100%", width: "100%" }}
                      useNativeControls={videoTouched || showVideoControls}
                      resizeMode="cover"
                      isLooping={false}
                      isMuted={true}
                      shouldPlay={isVideoVisible}
                      positionMillis={0}
                      progressUpdateIntervalMillis={500}
                      onPlaybackStatusUpdate={(status: any) => {
                        if (status.isLoaded) {
                          setIsVideoPlaying(status.isPlaying);
                        }
                      }}
                    />
                  ) : (
                    <View style={themed($videoPlaceholder)}>
                      <Ionicons name="videocam" size={48} color="white" />
                      <Text style={themed($videoPlaceholderText)}>
                        동영상을 재생할 수 없습니다
                      </Text>
                    </View>
                  )}

                  {/* 재생 버튼 (일시정지 상태일 때만) */}
                  {!isVideoPlaying && (
                    <TouchableOpacity
                      style={themed($videoPlayButton)}
                      onPress={handleVideoPress}
                    >
                      <Ionicons name="play" size={32} color="white" />
                    </TouchableOpacity>
                  )}

                  {/* 자동 재생 표시기 */}
                  {showAutoplayIndicator && (
                    <View style={themed($autoplayIndicator)}>
                      <Text style={themed($autoplayIndicatorText)}>
                        자동 재생 중
                      </Text>
                    </View>
                  )}

                  {/* 동영상 정보 표시 */}
                  <View style={themed($videoDurationBadge)}>
                    <Ionicons name="videocam" size={12} color="white" />
                    <Text style={themed($videoDurationText)}>
                      {videoMedia[0]
                        ? `${Math.floor(((videoMedia[0] as any).duration || 0) / 60)}:${Math.floor(
                            ((videoMedia[0] as any).duration || 0) % 60
                          )
                            .toString()
                            .padStart(2, "0")}`
                        : "00:00"}
                    </Text>
                  </View>
                </Pressable>
              ) : imageMedia.length > 0 ? (
                imageLoading ? (
                  // 이미지 로딩 중
                  <View style={themed($loadingContainer)}>
                    <ActivityIndicator size="large" color={theme.colors.text} />
                  </View>
                ) : (
                  // 이미지가 있고 로딩 완료된 상태
                  <Pressable
                    style={{
                      aspectRatio:
                        imageAspectRatio ||
                        IMAGE_CONSTANTS.DEFAULT_ASPECT_RATIO,
                      maxHeight: screenHeight,
                      minHeight: isWeb()
                        ? IMAGE_CONSTANTS.WEB.MIN_HEIGHT
                        : IMAGE_CONSTANTS.MOBILE.MIN_HEIGHT,
                      backgroundColor: themed($mediaContainer).backgroundColor,
                      position: "relative",
                      overflow: "hidden",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Image
                      source={{
                        uri: selectOptimizedImageUrl(
                          imageMedia[0],
                          isDesktop ? "desktop" : "mobile"
                        ),
                      }}
                      style={{
                        ...(imageHeight &&
                        imageHeight <
                          (isWeb()
                            ? IMAGE_CONSTANTS.WEB.MIN_HEIGHT
                            : IMAGE_CONSTANTS.MOBILE.MIN_HEIGHT)
                          ? {
                              height: imageHeight,
                              width:
                                imageHeight *
                                (imageAspectRatio ||
                                  IMAGE_CONSTANTS.DEFAULT_ASPECT_RATIO),
                              alignSelf: "center",
                            }
                          : { height: "100%", width: "100%" }),
                      }}
                      resizeMode={
                        imageHeight &&
                        imageHeight <
                          (isWeb()
                            ? IMAGE_CONSTANTS.WEB.MIN_HEIGHT
                            : IMAGE_CONSTANTS.MOBILE.MIN_HEIGHT)
                          ? "contain"
                          : "cover"
                      }
                    />
                  </Pressable>
                )
              ) : (
                // 미디어가 없는 경우
                <View style={themed($emptyMediaContainer)}>
                  <Ionicons name="image" size={48} color="#gray" />
                </View>
              )}

              {/* 그라디언트 오버레이 */}
              <View style={themed($gradientOverlay)} />
            </View>

            {/* 프로필 정보 컨테이너 */}
            <View style={themed($profileContainer)}>
              <UserAvatar
                imageUrl={post.author.profileImageUrl}
                name={post.author.nickname}
                size={32}
              />
              <View style={themed($profileInfo)}>
                <Text style={themed($profileName)}>{post.author.nickname}</Text>
                <Text style={themed($profileTime)}>
                  {formatTimeAgo(post.createdAt)}
                </Text>
              </View>

              {/* 팔로우 버튼 - 자신의 게시물이 아닌 경우에만 표시 */}
              {currentUser && currentUser.id !== post.author.id && (
                <TouchableOpacity
                  style={[
                    themed($followButton),
                    isFollowing && themed($followButtonActive),
                  ]}
                  onPress={handleFollowToggle}
                  disabled={followLoading}
                  activeOpacity={0.8}
                >
                  {followLoading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Ionicons
                        name={isFollowing ? "person-remove" : "person-add"}
                        size={12}
                        color="white"
                      />
                      <Text style={themed($followButtonText)}>
                        {isFollowing ? "언팔로우" : "팔로우"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* 카테고리 배지와 더보기 버튼을 포함하는 컨테이너 */}
            <View style={themed($topRightContainer)}>
              {/* 더보기 버튼 */}
              <TouchableOpacity
                style={themed($moreButton)}
                onPress={handleMorePress}
              >
                <Ionicons name="ellipsis-horizontal" size={20} color="white" />
              </TouchableOpacity>

              {/* 팀 로고 목록 */}
              <View style={themed($teamLogoStack)}>
                {myTeamsData?.myTeams?.slice(0, 3).map(({ team }) => (
                  <View key={team.id} style={themed($teamLogoWrapper)}>
                    <TeamLogo
                      logoUrl={team.logoUrl}
                      fallbackIcon={team.icon}
                      teamName={team.name}
                      size={28}
                    />
                  </View>
                ))}
              </View>
            </View>

            {/* 제목과 콘텐츠를 묶는 컨테이너 */}
            <View style={themed($textContainer)}>
              {/* 제목 표시 */}
              {post.title && post.title.trim() && (
                <View style={themed($titleContainer)}>
                  {renderStrokedText({
                    content: post.title,
                    themed: themed,
                    fontSize: 24,
                    lineHeight: 42,
                    numberOfLines: 2,
                  })}
                </View>
              )}

              {/* 콘텐츠 표시 */}
              {renderContentText({
                content: post.content,
                themed: themed,
                containerStyle: themed($contentContainer),
                fontSize: 14,
                lineHeight: 32,
                numberOfLines: 2,
              })}
            </View>
          </TouchableOpacity>

          {/* 게시물 액션 버튼들 */}
          <PostActions
            isLiked={isLiked}
            likeCount={likeCount}
            isBookmarked={isBookmarked}
            commentCount={post.commentCount || 0}
            onLike={handleLike}
            onBookmark={handleBookmark}
            onComment={handlePostPress}
            onShare={() => {}}
            isLikeProcessing={isLikeProcessing}
            isBookmarkProcessing={isBookmarkProcessing}
            isLikeError={isLikeError}
            variant="feed"
          />
        </View>
      </View>

      {/* 컨텍스트 메뉴 */}
      <PostContextMenu
        visible={showContextMenu}
        onClose={handleCloseContextMenu}
        post={{
          id: post.id,
          title: post.title,
          content: post.content,
          teamId: post.teamId,
          author: {
            id: post.author.id,
            nickname: post.author.nickname,
          },
        }}
        currentUserId={currentUser?.id}
        onPostUpdated={onPostUpdated}
        isBookmarked={isBookmarked}
      />
    </View>
  );
});

export default PostCard;

// --- 스타일 정의 ---

const $outerContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
  paddingHorizontal: spacing.md,
});

const $outerGlow: ThemedStyle<ViewStyle> = () => ({
  borderRadius: 20,
  shadowOffset: {
    width: 0,
    height: 8,
  },
  shadowOpacity: 0.15,
  shadowRadius: 10,
  elevation: 6,
});

const $glowBackground: ThemedStyle<ViewStyle> = () => ({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  borderRadius: 20,
});

const $borderLayer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  borderRadius: 20,
  borderWidth: 1,
  overflow: "hidden",
  backgroundColor: colors.background,
});

const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  borderRadius: 20,
  marginBottom: spacing.lg,
  paddingHorizontal: spacing.md,
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

const $loadingContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  height: isWeb()
    ? IMAGE_CONSTANTS.WEB.MIN_HEIGHT
    : IMAGE_CONSTANTS.MOBILE.MIN_HEIGHT,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: colors.backgroundDim,
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
  top: spacing.sm,
  left: spacing.sm,
  flexDirection: "row",
  alignItems: "center",
  zIndex: 2,
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
  fontWeight: "bold",
});

const $autoplayIndicator: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  position: "absolute",
  top: spacing.sm,
  right: spacing.sm,
  backgroundColor: "rgba(0, 0, 0, 0.8)",
  borderRadius: 12,
  paddingHorizontal: spacing.xs,
  paddingVertical: 4,
  zIndex: 3,
});

const $autoplayIndicatorText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 12,
});

const $profileTime: ThemedStyle<TextStyle> = () => ({
  color: "rgba(255, 255, 255, 0.8)",
  fontSize: 12,
});

// 팔로우 버튼 스타일들
const $followButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: colors.tint,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 16,
  marginLeft: spacing.sm,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 4,
  elevation: 3,
  gap: spacing.xxxs,
});

const $followButtonActive: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.textDim,
});

const $followButtonText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 11,
  fontWeight: "600",
  letterSpacing: 0.2,
});

// 카테고리 배지와 더보기 버튼 컨테이너 - 오른쪽 위
const $topRightContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  position: "absolute",
  top: spacing.sm,
  right: spacing.sm,
  flexDirection: "column", // 세로 정렬을 위해 column으로 변경
  alignItems: "flex-end", // 오른쪽 정렬
  zIndex: 2,
  gap: spacing.sm,
});

const $teamLogoStack: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "column",
  alignItems: "center",
  gap: spacing.sm,
});

const $teamLogoWrapper: ThemedStyle<ViewStyle> = ({ colors }) => ({
  borderWidth: 2,
  borderColor: colors.background, // 로고 간 경계선 효과
  borderRadius: 16,
  backgroundColor: colors.background,
});

const $categoryBadge: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  borderRadius: 16,
  paddingHorizontal: spacing.xs,
  paddingVertical: 4,
  borderWidth: 1,
  marginRight: spacing.xs,
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
  fontSize: 12,
});

const $categoryText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 12,
  fontWeight: "600",
});

// 제목 컨테이너
const $textContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  position: "absolute",
  bottom: "25%",
  left: spacing.sm,
  right: spacing.sm,
  zIndex: 2,
  gap: spacing.xxs,
});

// 제목 컨테이너
const $titleContainer: ThemedStyle<ViewStyle> = () => ({
  // position, bottom 속성 제거
});

// 콘텐츠 컨테이너
const $contentContainer: ThemedStyle<ViewStyle> = () => ({
  // position, bottom 속성 제거
});

// 텍스트 스트로크 스타일들
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
});

const $emptyMediaContainer: ThemedStyle<ViewStyle> = () => ({
  height: 200,
  justifyContent: "center",
  alignItems: "center",
});

// 더보기 버튼
const $moreButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  width: 32,
  height: 32,
  borderRadius: 16,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  justifyContent: "center",
  alignItems: "center",
  marginLeft: spacing.xs,
});

// 동영상 관련 스타일들
const $videoPlayButton: ThemedStyle<ViewStyle> = () => ({
  position: "absolute",
  top: "50%",
  left: "50%",
  marginLeft: -40,
  marginTop: -40,
  width: 80,
  height: 80,
  borderRadius: 40,
  backgroundColor: "rgba(0, 0, 0, 0.6)",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 2,
});

const $videoDurationBadge: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  position: "absolute",
  bottom: spacing.sm,
  right: spacing.sm,
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "rgba(0, 0, 0, 0.8)",
  borderRadius: 12,
  paddingHorizontal: spacing.xs,
  paddingVertical: 4,
  zIndex: 3,
});

const $videoDurationText: ThemedStyle<TextStyle> = ({ spacing }) => ({
  color: "white",
  fontSize: 12,
  fontWeight: "600",
  marginLeft: spacing.xxxs,
});

const $videoPlaceholder: ThemedStyle<ViewStyle> = ({ colors }) => ({
  height: "100%",
  width: "100%",
  backgroundColor: colors.backgroundDim,
  justifyContent: "center",
  alignItems: "center",
});

const $videoPlaceholderText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 14,
  marginTop: 8,
  textAlign: "center",
});
