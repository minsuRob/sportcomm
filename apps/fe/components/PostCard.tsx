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
import { PostDetailModal } from "@/components/posts/PostDetailModal";
import { useQuery, useApolloClient } from "@apollo/client";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { getTeamColors } from "@/lib/theme/teams/teamColor";
import { usePostInteractions } from "../hooks/usePostInteractions";
import { GET_MY_TEAMS, type GetMyTeamsResult } from "@/lib/graphql/teams";
import TeamLogo from "./TeamLogo";
import PostActions from "./shared/PostActions";
import PostContextMenu from "./shared/PostContextMenu";
import { TeamDecorationRenderer } from "@/lib/team-customization/components/TeamDecorationRenderer";
import { isWeb } from "@/lib/platform";
import {
  usePostImageDimensions,
  IMAGE_CONSTANTS,
  selectOptimizedImageUrl,
} from "@/lib/image";
import { getSession } from "@/lib/auth";
import { GET_USER_PROFILE, GET_USER_POSTS } from "@/lib/graphql";

import { useResponsive } from "@/lib/hooks/useResponsive";
import UserAvatar from "@/components/users/UserAvatar";
import { extractTeams, createUserMeta } from "@/lib/utils/userMeta";
import { StrokedText } from "@/lib/utils/StrokedText";
import { UniformPlaceholder } from "@/lib/team-customization/common/uniform/UniformPlaceholder";
import { useTeamCustomization } from "@/lib/team-customization";
import { formatDateTime } from "@/lib/utils/dateUtils";


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
    // 백엔드 UserTeam.favoritePlayerName / favoritePlayerNumber 매핑
    favoritePlayerName?: string;
    favoritePlayerNumber?: number;
  }[];
  // 호환성을 위한 추가 필드들
  authorTeams?: {
    id: string;
    name: string;
    logoUrl?: string;
    icon: string;
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
  team: {
    id: string;
    name: string;
    logoUrl?: string;
    // 팀 팔레트 컬러 (DB에서 로드)
    mainColor?: string;
    subColor?: string;
    darkMainColor?: string;
    darkSubColor?: string;
    sport: {
      id: string;
      name: string;
      icon: string;
    };
  };
  tags?: {
    id: string;
    name: string;
  }[];
  media: Media[];
  author: User;
  likeCount: number;
  isLiked: boolean;
  isBookmarked?: boolean;
  createdAt: string;
  commentCount?: number;
  viewCount?: number;
  isMock?: boolean;
  authorTeams?: {
    id: string;
    name: string;
    logoUrl?: string;
    icon: string;
  }[];
}

export interface PostCardProps {
  post: Post;
  onPostUpdated?: (post: Post) => void;
  onRefresh?: () => void;
}

// --- 유틸리티 함수 ---


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
  teamColors,
}: {
  content: string;
  themed: any;
  containerStyle?: ViewStyle;
  fontSize?: number;
  lineHeight?: number;
  numberOfLines?: number;
  teamColors: any;
}) => {
  return (
    <View style={[themed($contentContainer), containerStyle]}>
      <StrokedText
        content={content}
        fontSize={fontSize}
        lineHeight={lineHeight}
        numberOfLines={numberOfLines}
        borderThickness={1.3}
        teamColors={teamColors}
        mainColor={"white"}
      />
    </View>
  );
};

// --- 메인 컴포넌트 ---
const PostCard = React.memo(function PostCard({
  post,
  onPostUpdated,
  onRefresh,
}: PostCardProps) {
  const { themed, theme } = useAppTheme();
  const router = useRouter();
  const { height: screenHeight } = useWindowDimensions();
  const [postCardWidth, setPostCardWidth] = useState(0);
  const [postCardHeight, setPostCardHeight] = useState(0);
  const postCardRef = useRef<View>(null);
  // 상세 모달 표시 상태
  const [detailVisible, setDetailVisible] = useState(false);

  useEffect(() => {
    const measurePostCardDimensions = () => {
      if (postCardRef.current) {
        postCardRef.current.measure((_x, _y, width, height) => {
          setPostCardWidth(width);
          setPostCardHeight(height);
        });
      }
    };

    measurePostCardDimensions();
  }, []);

  // 컨텍스트 메뉴 상태 관리
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // 개발 환경 체크
  const __DEV__ = process.env.NODE_ENV === "development";

  // 미디어 타입별 필터링 (media가 null일 수 있음)
  const imageMedia = (post.media || []).filter(
    (item) => item.type === "image" || item.type === "IMAGE",
  );
  const videoMedia = (post.media || []).filter(
    (item) => item.type === "video" || item.type === "VIDEO",
  );

  /**
   * 태그 클릭 시 검색 화면으로 이동
   */
  const handleTagPress = (tagName: string) => {
    router.push({
      pathname: "/(app)/search",
      params: {
        query: tagName,
        autoSearch: "true",
      },
    });
  };

  // 동영상 재생 상태 관리
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [showVideoControls, setShowVideoControls] = useState(false);
  const [isVideoVisible, setIsVideoVisible] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number>(0);
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
      isWeb(),
    );

  // 미디어 컨테이너의 실제 너비 계산 (화면 너비 - 좌우 패딩)
  const mediaContainerWidth = postCardWidth - 32; // 좌우 패딩 16px씩 제외 (총 32px)
  const mediaContainerHeight = screenHeight; // 좌우 패딩 16px씩 제외 (총 32px)

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
  // 게시물 카드 클릭 시: 모달 형태 상세 열기
  const handlePostPress = useCallback(() => {
    setDetailVisible(true);
  }, []);

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
      //console.log("post", post);
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
              .catch((err) => console.error("비디오 자동 재생 실패:", err));
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
        (ut: any) => ut?.team?.id === post.teamId,
      );
      if (found?.team?.name) return found.team.name as string;
    }
    return "팀";
  };
  const teamName = deriveTeamName();

  // 디버깅을 위한 로그 (개발 환경에서만)
  // if (__DEV__) {
  //   console.log("PostCard 팀 정보:", {
  //     teamId: post.teamId,
  //     teamName,
  //     postTeamName: (post as any)?.team?.name,
  //     postTeamNameField: (post as any)?.teamName,
  //   });
  // }

  // --- 팀 팔레트 유틸 사용: DB 확장 컬러(main/sub/dark) 기반 ---
  // 동적 import (정적 import 추가 수정 없이 교체, Metro/Web 번들 모두 호환)
  const { getTeamPalette } = require("@/lib/team/palette");

  const palette = getTeamPalette(
    {
      mainColor: (post.team as any)?.mainColor,
      subColor: (post.team as any)?.subColor,
      darkMainColor: (post.team as any)?.darkMainColor,
      darkSubColor: (post.team as any)?.darkSubColor,
      name: teamName,
    },
    {
      // 테마 모드: 현재 전역 테마에 따라 동적 설정
      themeMode: theme.isDark ? "dark" : "light",
    },
  );

  // 팀별 색상 가져오기 (다크모드/라이트모드 구분)
  const teamColors = getTeamColors(post.teamId, theme.isDark, teamName);

  // 기존 teamPalette 구조에 맞춘 매핑 (팀별 색상 적용)
  const teamPalette = {
    cardBg: teamColors.uniformBackground,
    overlayGradient: teamColors.uniformBackground + "88", // 반투명 오버레이
    badgeBg: teamColors.postActionsBackground + "CC",
    iconBadgeBg: teamColors.postActionsBackground + "99",
    moreButtonBg: teamColors.postActionsBackground + "CC",
    glowColor: teamColors.uniformDecoration,
    borderColor: teamColors.cardBorder,
  };

  // 팀 커스터마이징 시스템 적용

  const teamCustomization = useTeamCustomization(post.teamId, {
    id: post.teamId,
    name: teamName,
    mainColor: (post.team as any)?.mainColor,
    subColor: (post.team as any)?.subColor,
    darkMainColor: (post.team as any)?.darkMainColor,
    darkSubColor: (post.team as any)?.darkSubColor,
    sport: (post.team as any)?.sport,
  });

  return (
    <View style={themed($outerContainer)} ref={postCardRef}>
      {/* 외부 글로우 효과 - 팀 색상 반영 */}
      <View
        style={[
          themed($outerGlow),
          {
            shadowColor: teamPalette.glowColor || categoryInfo.colors.glow,
          },
        ]}
      >
        {/* 글로우 배경 레이어 */}
        <View
          style={[
            themed($glowBackground),
            {
              backgroundColor:
                (teamPalette.glowColor || categoryInfo.colors.glow) + "10",
            },
          ]}
        />

        {/* 테두리/배경 레이어 (팀 팔레트 적용) */}
        <View
          style={[
            themed($borderLayer),
            {
              borderColor:
                teamPalette.borderColor || categoryInfo.colors.border,
              borderLeftColor:
                teamPalette.borderColor || categoryInfo.colors.border,
              borderTopColor:
                (teamPalette.borderColor || categoryInfo.colors.border) + "15",
              borderRightColor:
                teamPalette.borderColor || categoryInfo.colors.border,
              borderBottomColor:
                (teamPalette.borderColor || categoryInfo.colors.border) + "15",
              shadowColor: teamPalette.glowColor || categoryInfo.colors.glow,
              backgroundColor: teamPalette.cardBg,
            },
          ]}
        >
          <TouchableOpacity onPress={handlePostPress} activeOpacity={0.9}>
            <View
              style={[
                themed($mediaContainer),
                { backgroundColor: teamColors.uniformBackground },
              ]}
            >
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
                      onLoadedMetadata={(e) => {
                        const duration = (e.target as HTMLVideoElement).duration;
                        setVideoDuration(duration);
                      }}
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
                      onLoad={(status) => {
                        if (status.durationMillis) {
                          setVideoDuration(status.durationMillis / 1000);
                        }
                      }}
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
                      {videoDuration > 0
                        ? `${Math.floor(videoDuration / 60)}:${Math.floor(videoDuration % 60)
                            .toString()
                            .padStart(2, "0")}`
                        : "00:00"}
                    </Text>
                  </View>
                </Pressable>
              ) : imageMedia.length > 0 ? (
                imageLoading ? (
                  // 이미지 로딩 중
                  <View
                    style={[
                      themed($loadingContainer),
                      { backgroundColor: teamColors.uniformBackground },
                    ]}
                  >
                    <ActivityIndicator
                      size="large"
                      color={teamColors.uniformText}
                    />
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
                          isDesktop ? "desktop" : "mobile",
                        ) || imageMedia[0]?.url, // fallback to original URL
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
                // 미디어가 없는 경우 - 유니폼 스타일 플레이스홀더 (최애 선수 정보 동적 반영)
                <UniformPlaceholder
                  text={
                    post.author.myTeams?.find((t) => t.team.id === post.teamId)
                      ?.favoritePlayerName || "니퍼트"
                  }
                  number={String(
                    post.author.myTeams?.find((t) => t.team.id === post.teamId)
                      ?.favoritePlayerNumber ?? "40",
                  )}
                  mainColor={teamColors.uniformText}
                  subColor={teamColors.uniformNumberText}
                  outlineColor={teamColors.uniformDecoration}
                  style={$uniformPlaceholder}
                  teamColors={teamColors} // 팀별 커스텀 색상 전달
                  containerWidth={postCardWidth - 32} // PostCard 너비에서 좌우 패딩 제외
                  containerHeight={postCardHeight || 350} // PostCard 실제 측정된 높이 또는 기본값
                />
              )}

              {/* 그라디언트 오버레이 - 팀 색상 기반 반투명 오버레이 */}
              <View
                style={[
                  themed($gradientOverlay),
                  // 이미지가 없으면 투명도 제거
                  videoMedia.length === 0 &&
                    imageMedia.length === 0 && {
                      backgroundColor: "rgba(0, 0, 0, 0)",
                    },
                  // { backgroundColor: teamPalette.overlayGradient },
                ]}
              />
            </View>

            {/* 프로필 정보 컨테이너 */}
            <View style={themed($profileContainer)}>
              <TouchableOpacity
                onPress={() => {
                  router.push(
                    `/(modals)/user-profile?userId=${post.author.id}`,
                  );
                }}
                activeOpacity={0.7}
              >
                {/* UserAvatar: 프로필 이미지가 비어있으면 해당 게시물 teamId에 매칭되는 팀 로고를 fallback으로 사용 */}
                <UserAvatar
                  imageUrl={
                    (post.author.profileImageUrl &&
                      post.author.profileImageUrl.trim() !== "" &&
                      post.author.profileImageUrl) ||
                    (() => {
                      const anyPost: any = post as any;

                      // 1) post.team.logoUrl (정식 타입 정의엔 없지만 확장 필드 고려)
                      if (anyPost?.team?.logoUrl) return anyPost.team.logoUrl;

                      // 2) author.myTeams 내부 team.id 매칭
                      const myTeams = anyPost?.author?.myTeams;
                      if (Array.isArray(myTeams)) {
                        const found = myTeams.find(
                          (ut: any) =>
                            ut?.team?.id === post.teamId && ut?.team?.logoUrl,
                        );
                        if (found?.team?.logoUrl) return found.team.logoUrl;
                      }

                      // 3) author.authorTeams (백워드 호환)
                      const authorTeams = anyPost?.author?.authorTeams;
                      if (Array.isArray(authorTeams)) {
                        const found2 = authorTeams.find(
                          (t: any) => t?.id === post.teamId && t?.logoUrl,
                        );
                        if (found2?.logoUrl) return found2.logoUrl;
                      }

                      // 4) 모든 경로 실패 시 undefined -> UserAvatar 내부 기본 person 아이콘
                      return undefined;
                    })()
                  }
                  name={post.author.nickname}
                  size={40}
                />
              </TouchableOpacity>

              {/* 닉네임/시간 세로 정렬, 팔로우 버튼을 날짜 아래에 배치 */}
              <View style={themed($profileInfoColumn)}>
                <TouchableOpacity
                  onPress={() =>
                    router.push(
                      `/(modals)/user-profile?userId=${post.author.id}`,
                    )
                  }
                  activeOpacity={0.7}
                  style={themed($nicknameTap)}
                >
                  <StrokedText
                    content={post.author.nickname}
                    fontSize={15}
                    lineHeight={18}
                    numberOfLines={1}
                    borderThickness={0.5}
                    mainColor={teamColors?.profileText || theme.colors.text}
                    strokeColor={
                      teamColors?.profileStroke || theme.colors.background
                    }
                    teamColors={teamColors}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    router.push(
                      `/(modals)/user-profile?userId=${post.author.id}`,
                    )
                  }
                  activeOpacity={0.7}
                  style={themed($timeTap)}
                >
                  <StrokedText
                    content={formatDateTime(post.createdAt)}
                    fontSize={13}
                    lineHeight={16}
                    numberOfLines={1}
                    borderThickness={0.3}
                    mainColor={teamColors?.profileTime || theme.colors.textDim}
                    strokeColor={
                      teamColors?.profileStroke || theme.colors.background
                    }
                    teamColors={teamColors}
                  />
                </TouchableOpacity>
                {/* 팔로우 버튼을 날짜 아래에 배치 */}
                {currentUser && currentUser.id !== post.author.id && (
                  <TouchableOpacity
                    style={[
                      themed($followButtonCompact),
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
                          size={10}
                          color="white"
                        />
                        <Text style={themed($followButtonTextCompact)}>
                          {isFollowing ? "언팔로우" : "팔로우"}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* 카테고리 배지와 더보기 버튼을 포함하는 컨테이너 */}
            <View style={themed($topRightContainer)}>
              <View style={themed($topRightIcons)}>
                {/* Tags */}
                {post.tags?.slice(0, 2).map((tag) => (
                  <TouchableOpacity
                    key={tag.id}
                    style={[
                      themed($tagBadge),
                      { backgroundColor: teamPalette.badgeBg },
                    ]}
                    onPress={() => handleTagPress(tag.name)}
                    activeOpacity={0.7}
                  >
                    <Text style={themed($tagText)}>#{tag.name}</Text>
                  </TouchableOpacity>
                ))}
                {/* Sport Icon */}
                <View
                  style={[
                    themed($sportIconBadge),
                    { backgroundColor: teamPalette.iconBadgeBg },
                  ]}
                >
                  <Text style={themed($sportIconText)}>
                    {post.team?.sport?.icon || "🏆"}
                  </Text>
                </View>

                {/* 더보기 버튼 */}
                <TouchableOpacity
                  style={[
                    themed($moreButton),
                    { backgroundColor: teamPalette.moreButtonBg },
                  ]}
                  onPress={handleMorePress}
                >
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={20}
                    color="white"
                  />
                </TouchableOpacity>
              </View>

              {/* 팀 로고 목록 */}
              <View style={themed($teamLogoStack)}>
                {(() => {
                  // 작성자 팀 정보 추출 (우선순위: myTeams > authorTeams)
                  const authorTeams = extractTeams(post.author, 3);

                  // 팀 정보가 없으면 post.authorTeams 사용 (기존 호환성)
                  const teamsToShow =
                    authorTeams.length > 0
                      ? authorTeams
                      : post.authorTeams?.slice(0, 3) || [];

                  return teamsToShow.map((team) => (
                    <View key={team.id} style={themed($teamLogoWrapper)}>
                      <TeamLogo
                        logoUrl={team.logoUrl}
                        fallbackIcon={team.icon}
                        teamName={team.name}
                        size={28}
                      />
                    </View>
                  ));
                })()}
              </View>
            </View>

            {/* 팀별 커스터마이징 장식 요소 - 미디어가 없을 때(uniformPlaceholder 사용 시)만 표시 */}
            {teamCustomization.hasDecoration &&
              videoMedia.length === 0 &&
              imageMedia.length === 0 && (
                <TeamDecorationRenderer
                  teamId={post.teamId}
                  teamData={{
                    id: post.teamId,
                    name: teamName,
                    mainColor: (post.team as any)?.mainColor,
                    subColor: (post.team as any)?.subColor,
                    darkMainColor: (post.team as any)?.darkMainColor,
                    darkSubColor: (post.team as any)?.darkSubColor,
                    sport: (post.team as any)?.sport,
                    // 팀별 커스텀 색상 추가
                    decorationBorder: teamColors.decorationBorder,
                    cardBorder: teamColors.cardBorder,
                    // 기존 색상들도 유지
                    ...teamColors,
                  }}
                  decorations={teamCustomization.decorations}
                  color={
                    teamColors.decorationBorder ||
                    teamPalette.borderColor ||
                    categoryInfo.colors.border
                  }
                  teamPalette={teamPalette}
                  categoryInfo={categoryInfo}
                />
              )}

            {/* 제목과 콘텐츠를 묶는 컨테이너 */}
            <View style={themed($textContainer)}>
              {/* 제목 표시 */}
              {post.title && post.title.trim() && (
                <View>
                  <StrokedText
                    content={post.title}
                    fontSize={24}
                    lineHeight={42}
                    numberOfLines={2}
                    borderThickness={1.5}
                    teamColors={teamColors}
                    mainColor={"white"}
                  />
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
                teamColors: teamColors,
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
            teamColors={{
              actionButtonActive: teamColors.actionButtonActive,
              actionButtonInactive: teamColors.actionButtonInactive,
              postActionsBackground: teamColors.postActionsBackground,
            }}
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
        onRefresh={onRefresh}
      />
      {/* 게시물 상세 하단 모달 */}
      <PostDetailModal
        visible={detailVisible}
        postId={post.id}
        onClose={() => setDetailVisible(false)}
        onPostUpdated={() => onPostUpdated?.(post)}
        initialPost={{
          id: post.id,
          title: post.title,
          content: post.content,
          author: {
            id: post.author.id,
            nickname: post.author.nickname,
            profileImageUrl: post.author.profileImageUrl,
          },
          createdAt: post.createdAt,
          teamId: post.teamId,
          likeCount: likeCount,
          commentCount: post.commentCount || 0,
          viewCount: post.viewCount || 0,
          isLiked: isLiked,
          isBookmarked: isBookmarked,
          media: post.media?.map((m) => ({
            id: m.id,
            url: m.url,
            type:
              m.type === "IMAGE" || m.type === "image"
                ? "image"
                : m.type === "VIDEO" || m.type === "video"
                  ? "video"
                  : (m.type as any),
          })),
          tags: post.tags?.map((tag) => ({
            id: tag.id,
            name: tag.name,
          })),
        }}
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
  borderWidth: 1.5,
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

const $mediaContainer: ThemedStyle<ViewStyle> = () => ({
  position: "relative",
  width: "100%",
  borderRadius: 16,
  overflow: "hidden",
});

const $loadingContainer: ThemedStyle<ViewStyle> = () => ({
  height: isWeb()
    ? IMAGE_CONSTANTS.WEB.MIN_HEIGHT
    : IMAGE_CONSTANTS.MOBILE.MIN_HEIGHT,
  justifyContent: "center",
  alignItems: "center",
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
  gap: spacing.xs,
});

const $profileImage: ThemedStyle<ImageStyle> = () => ({
  width: 40,
  height: 40,
  borderRadius: 16,
  marginRight: 8,
  borderWidth: 2,
  borderColor: "rgba(255, 255, 255, 0.3)",
});

const $profileInfo: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "column",
  justifyContent: "center",
  flexShrink: 0,
  gap: 2,
  marginRight: spacing.xxxs,
});

/* 닉네임/시간 전용 컬럼 (팔로우 버튼은 형제 요소로 분리) */
const $profileInfoColumn: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "column",
  justifyContent: "center",
  flexShrink: 0,
  gap: 2,
  marginRight: spacing.xxxs,
});

const $profileName: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 14,
  fontWeight: "bold",
});

const $autoplayIndicator: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  position: "absolute",
  bottom: spacing.sm,
  left: '50%',
  transform: [{ translateX: -50 }],
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
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 4,
  elevation: 3,
  gap: spacing.xxxs,
});

const $followButtonCompact: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: colors.tint,
  paddingHorizontal: spacing.xs,
  paddingVertical: 2,
  borderRadius: 12,
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.15,
  shadowRadius: 2,
  elevation: 2,
  gap: spacing.xxxs,
  marginTop: 4,
  alignSelf: "flex-start",
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

const $followButtonTextCompact: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 12,
  fontWeight: "600",
  letterSpacing: 0.1,
});

// 카테고리 배지와 더보기 버튼 컨테이너 - 오른쪽 위
const $topRightContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  position: "absolute",
  top: spacing.sm,
  right: spacing.sm,
  flexDirection: "column",
  alignItems: "flex-end",
  zIndex: 2,
  gap: spacing.sm,
});

const $topRightIcons: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
});

const $sportIconBadge: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 28,
  height: 28,
  borderRadius: 14,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  justifyContent: "center",
  alignItems: "center",
});

const $sportIconText: ThemedStyle<TextStyle> = () => ({
  fontSize: 16,
});

const $tagBadge: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xxs,
  borderRadius: 12,
});

const $tagText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 12,
  fontWeight: "600",
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
  left: spacing.xl + spacing.xs,
  right: spacing.sm,
  zIndex: 4, // 스트라이프(zIndex: 1.5)와 다른 UI 요소들(zIndex: 2, 3)보다 앞에 위치하여 텍스트가 가려지지 않도록 설정
  gap: spacing.xxs,
});

// 콘텐츠 컨테이너
const $contentContainer: ThemedStyle<ViewStyle> = () => ({
  // position, bottom 속성 제거
});

// 유니폼 플레이스홀더 스타일 (350px 고정 높이)
const $uniformPlaceholder: ThemedStyle<ViewStyle> = () => ({
  height: 350,
  justifyContent: "center",
  alignItems: "center",
  borderRadius: 8,
  paddingBottom: 120,
});

// 더보기 버튼
const $moreButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  width: 32,
  height: 32,
  borderRadius: 16,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  justifyContent: "center",
  alignItems: "center",
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

/* 추가 스타일 - 닉네임/팔로우 한 줄 배치 */
const $nameRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
});

const $nicknameTap: ThemedStyle<ViewStyle> = () => ({
  flexShrink: 1,
});

const $timeTap: ThemedStyle<ViewStyle> = () => ({
  flexShrink: 1,
  marginTop: 2,
});
