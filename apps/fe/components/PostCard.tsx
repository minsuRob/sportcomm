import React, { useState, useEffect, useRef } from "react";
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
import { useQuery } from "@apollo/client";
// expo-video는 조건부로 import (웹에서 문제 발생 방지)
let Video: any = null;
try {
  if (!isWeb()) {
    Video = require("expo-video").Video;
  }
} catch (error) {
  console.warn("expo-video를 로드할 수 없습니다:", error);
}
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { usePostInteractions } from "../hooks/usePostInteractions";
import { Media } from "./shared/PostMedia";
import PostActions from "./shared/PostActions";
import PostContextMenu from "./shared/PostContextMenu";
import { isWeb } from "@/lib/platform";
import { usePostImageDimensions, IMAGE_CONSTANTS } from "@/lib/image";
import { getSession } from "@/lib/auth";
import { useTeams } from "@/hooks/useTeams";
import { type UserTeam } from "@/lib/graphql/teams";
import TeamLogo from "./TeamLogo";

// --- Type Definitions ---
export { Media };

export interface User {
  id: string;
  nickname: string;
  profileImageUrl?: string;
  isFollowing?: boolean;
  myTeams?: UserTeam[];
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
  teamId: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  isBookmarked?: boolean; // 북마크 상태 추가
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
  const { getTeamById } = useTeams();

  // 컨텍스트 메뉴 상태 관리
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // __DEV__ 상수 선언 (React Native에서는 기본 제공되지만 웹에서는 아닐 수 있음)
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
  const [showVideoControls, setShowVideoControls] = useState(false); // 기본적으로 컨트롤 숨김
  const [isVideoVisible, setIsVideoVisible] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoContainerRef = useRef<View | null>(null);
  const [videoTouched, setVideoTouched] = useState(false); // 사용자가 비디오를 터치했는지 여부
  const [autoPlayAttempted, setAutoPlayAttempted] = useState(false); // 자동재생 시도 여부
  const [showAutoplayIndicator, setShowAutoplayIndicator] = useState(false); // 자동 재생 표시기 표시 여부

  // 공통 이미지 최적화 훅 사용
  const { imageAspectRatio, imageHeight, imageLoading } =
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
  const {
    isLiked,
    likeCount,
    isLikeProcessing,
    isLikeError,
    handleLike,
    isBookmarked,
    isBookmarkProcessing,
    handleBookmark,
  } = usePostInteractions({
    postId: post.id,
    authorId: post.author.id,
    authorName: post.author.nickname,
    initialLikeCount: post.likeCount,
    initialIsLiked: post.isLiked,
    initialIsFollowing: post.author.isFollowing || false,
    initialIsBookmarked: post.isBookmarked || false, // 실제 북마크 상태 사용
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
          // 3초 후 표시기 숨기기
          setTimeout(() => setShowAutoplayIndicator(false), 3000);
        } else {
          setShowAutoplayIndicator(false);
        }

        // 화면에 보일 때 자동 재생 시작, 화면에서 벗어나면 일시 정지
        if (isVisible) {
          if (videoRef.current) {
            // 자동 재생 시도
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
        threshold: 0.5, // 50% 이상 보일 때 감지
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
    // 모바일 환경: 간단히 항상 보이는 것으로 처리
    else {
      setIsVideoVisible(true);
      setShowAutoplayIndicator(true);
      // 3초 후 표시기 숨기기
      const timer = setTimeout(() => setShowAutoplayIndicator(false), 3000);

      return () => {
        setIsVideoVisible(false);
        setShowAutoplayIndicator(false);
        clearTimeout(timer);
      };
    }
  }, [videoMedia.length, isWeb]);

  // 비디오 가시성 감지 및 자동 재생 처리는 위에서 구현되었음

  // 팀별 색상 및 텍스트 매핑
  const getCategoryInfo = (teamId: string) => {
    // teamId가 없는 경우 기본 정보 반환
    if (!teamId) {
      return {
        text: "팀 없음",
        icon: "",
        logoUrl: "",
        colors: {
          border: "#888888",
          glow: "#888888",
        },
      };
    }

    const team = getTeamById(teamId);

    if (team) {
      return {
        text: team.name,
        icon: team.icon,
        logoUrl: team.logoUrl,
        colors: {
          border: team.color,
          glow: team.color,
          badge: team.color,
        },
      };
    }

    // Fallback for unknown team
    return {
      text: "팀",
      icon: "🏆",
      logoUrl: undefined,
      colors: {
        border: "#6366f1",
        glow: "#6366f1",
        badge: "#6366f1",
      },
    };
  };

  // 게시글의 팀 정보 가져오기
  const postTeamInfo = getCategoryInfo(post.teamId);
  const categoryInfo = postTeamInfo; // 기존 코드 호환성을 위해 유지

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
            {videoMedia.length > 0 ? (
              // 동영상이 있는 경우
              <View
                ref={videoContainerRef}
                style={{
                  aspectRatio: 16 / 9, // 동영상 기본 비율
                  maxHeight: screenHeight * IMAGE_CONSTANTS.MAX_HEIGHT_RATIO,
                  minHeight: IMAGE_CONSTANTS.MIN_HEIGHT,
                  backgroundColor: themed($mediaContainer).backgroundColor,
                  position: "relative",
                  overflow: "hidden",
                  justifyContent: "center",
                  alignItems: "center",
                }}
                onLayout={() => {
                  // 모바일 환경에서 비디오가 레이아웃에 배치되면 가시성 체크
                  if (!isWeb() && videoMedia.length > 0) {
                    setIsVideoVisible(true);
                  }
                }}
              >
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={() => {
                    setVideoTouched(true);
                    setShowVideoControls(true);
                    // 터치 시 비디오 재생/일시정지 토글
                    if (isWeb() && videoRef.current) {
                      if (videoRef.current.paused) {
                        videoRef.current.play();
                      } else {
                        videoRef.current.pause();
                      }
                    }
                  }}
                  style={{ width: "100%", height: "100%" }}
                >
                  {isWeb() ? (
                    // 웹 환경에서는 HTML5 video 태그 사용
                    <video
                      ref={videoRef}
                      src={videoMedia[0]?.url}
                      style={{
                        height: "100%",
                        width: "100%",
                        objectFit: "cover",
                        cursor: "pointer",
                      }}
                      controls={videoTouched || showVideoControls}
                      loop={true}
                      muted={!videoTouched}
                      playsInline={true}
                      autoPlay={isVideoVisible}
                      onPlay={() => setIsVideoPlaying(true)}
                      onPause={() => setIsVideoPlaying(false)}
                      onClick={() => {
                        setVideoTouched(true);
                        setShowVideoControls(true);
                      }}
                    />
                  ) : Video ? (
                    // 모바일 환경에서는 expo-video 사용
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
                          setIsVideoPlaying(status.isPlaying || false);
                        }
                      }}
                    />
                  ) : (
                    // Video 컴포넌트를 로드할 수 없는 경우 플레이스홀더 표시
                    <View style={themed($videoPlaceholder)}>
                      <Ionicons name="videocam" size={48} color="white" />
                      <Text style={themed($videoPlaceholderText)}>
                        동영상을 재생할 수 없습니다
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* 동영상 컨트롤 오버레이 (웹에서는 네이티브 컨트롤 사용) */}
                {!isWeb() && !isVideoPlaying && !videoTouched && (
                  <TouchableOpacity
                    style={themed($videoPlayButton)}
                    onPress={(e) => {
                      e.stopPropagation();
                      setIsVideoPlaying(true);
                      setVideoTouched(true);
                    }}
                  >
                    <Ionicons name="play" size={48} color="white" />
                  </TouchableOpacity>
                )}

                {/* 자동 재생 상태 표시 */}
                {isVideoPlaying && !videoTouched && showAutoplayIndicator && (
                  <View style={themed($autoplayIndicator)}>
                    <Ionicons
                      name="play-circle-outline"
                      size={14}
                      color="white"
                      style={{ marginRight: 4 }}
                    />
                    <Text style={themed($autoplayIndicatorText)}>
                      자동 재생 중
                    </Text>
                  </View>
                )}

                {/* 동영상 정보 표시 */}
                {videoMedia[0] && (
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
                )}

                {/* 그라데이션 오버레이 */}
                <View style={themed($gradientOverlay)} />
              </View>
            ) : imageMedia.length > 0 ? (
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
              // 미디어가 없는 경우 빈 컨테이너 표시
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
              <TeamLogo
                logoUrl={categoryInfo.logoUrl}
                teamName={categoryInfo.text}
                size={36}
                style={{ marginLeft: 8 }}
              />
            </View>

            {/* 카테고리 배지와 더보기 버튼을 포함하는 컨테이너 */}
            <View style={themed($topRightContainer)}>
              <View style={themed($topRightRow)}>
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
                      {categoryInfo.icon}
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
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={20}
                    color="white"
                  />
                </TouchableOpacity>
              </View>
              {/* Post Team */}
              <View style={themed($postTeamContainer)}>
                {/* 내 게시글이면 나의 팀 목록 최대 3개 표시, 아니면 게시글의 팀만 표시 */}
                {currentUser?.id === post.author.id ? (
                  // 내 게시글인 경우 내 팀 목록 표시 (최대 3개)
                  <View style={themed($postTeamContainer)}>
                    {(currentUser?.myTeams || [])
                      .slice(0, 3)
                      .map((userTeam: UserTeam) => (
                        <TeamLogo
                          key={userTeam.team.id}
                          logoUrl={userTeam.team.logoUrl}
                          teamName={userTeam.team.name}
                          size={36}
                          style={{ marginBottom: 4, marginRight: 4 }}
                        />
                      ))}
                  </View>
                ) : (
                  // 타인의 게시글인 경우 해당 게시글 작성자의 팀 목록 표시 (최대 3개)
                  <View style={themed($postTeamContainer)}>
                    {(post.author.myTeams || [])
                      .slice(0, 3)
                      .map((userTeam: UserTeam) => (
                        <TeamLogo
                          key={userTeam.team.id}
                          logoUrl={userTeam.team.logoUrl}
                          teamName={userTeam.team.name}
                          size={36}
                          style={{ marginBottom: 4, marginRight: 4 }}
                        />
                      ))}
                  </View>
                )}
              </View>
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

        {/* 액션 버튼 - 좋아요, 댓글, 북마크 */}
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
          // @ts-ignore - PostActions 컴포넌트 타입 정의에 onBookmark가 없음
          onBookmark={handleBookmark}
          // @ts-ignore - PostActions 컴포넌트 타입 정의에 isBookmarked가 없음
          isBookmarked={isBookmarked}
          // @ts-ignore - PostActions 컴포넌트 타입 정의에 isBookmarkProcessing이 없음
          isBookmarkProcessing={isBookmarkProcessing}
          variant="feed"
          likeCount={likeCount}
          commentCount={post.commentCount}
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

// 자동 재생 표시기
const $autoplayIndicator: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  position: "absolute",
  bottom: spacing.md,
  left: spacing.md,
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "rgba(0, 0, 0, 0.7)",
  borderRadius: 12,
  paddingHorizontal: spacing.xs,
  paddingVertical: 4,
  zIndex: 3,
});

const $autoplayIndicatorText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 11,
  fontWeight: "500",
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
  flexDirection: "column",
  alignItems: "flex-end",
  zIndex: 3,
});

const $topRightRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
  marginBottom: spacing.sm,
});

const $postTeamContainer: ThemedStyle<ViewStyle> = () => ({
  alignItems: "flex-end",
  justifyContent: "flex-end",
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

// --- 동영상 관련 스타일 ---
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

// 스타일 정의 완료
