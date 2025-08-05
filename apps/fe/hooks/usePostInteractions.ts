import { useState, useEffect, useRef } from "react";
import { useMutation, useApolloClient } from "@apollo/client";
import {
  TOGGLE_LIKE,
  TOGGLE_FOLLOW,
  TOGGLE_BOOKMARK,
  GET_POSTS,
} from "@/lib/graphql";
import { showToast } from "@/components/CustomToast";
import { getSession } from "@/lib/auth";
import { useTranslation, TRANSLATION_KEYS } from "@/lib/i18n/useTranslation";

interface UsePostInteractionsProps {
  postId: string;
  authorId: string;
  authorName: string;
  initialLikeCount: number;
  initialIsLiked: boolean;
  initialIsFollowing: boolean;
  initialIsBookmarked?: boolean;
}

/**
 * 게시물 상호작용 로직을 관리하는 커스텀 훅
 * 좋아요, 팔로우 기능을 포함
 */
export function usePostInteractions({
  postId,
  authorId,
  authorName,
  initialLikeCount,
  initialIsLiked,
  initialIsFollowing,
  initialIsBookmarked = false,
}: UsePostInteractionsProps) {
  const { t } = useTranslation();
  const apolloClient = useApolloClient();

  // 상태 관리
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked);
  const [isLikeProcessing, setIsLikeProcessing] = useState(false);
  const [isBookmarkProcessing, setIsBookmarkProcessing] = useState(false);
  const [isLikeError, setIsLikeError] = useState(false);

  // GraphQL 뮤테이션
  const [executeLike, { loading: likeLoading }] = useMutation(TOGGLE_LIKE);
  const [toggleFollow, { loading: followLoading }] = useMutation(TOGGLE_FOLLOW);
  const [toggleBookmark, { loading: bookmarkLoading }] =
    useMutation(TOGGLE_BOOKMARK);

  // 현재 사용자 확인
  useEffect(() => {
    const checkCurrentUser = async () => {
      const { user } = await getSession();
      setCurrentUserId(user?.id || null);
    };
    checkCurrentUser();
  }, []);

  // 초기값이 한 번만 설정되도록 useRef 사용
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (!isInitializedRef.current) {
      setIsLiked(initialIsLiked);
      setLikeCount(initialLikeCount);
      setIsFollowing(initialIsFollowing);
      setIsBookmarked(initialIsBookmarked);
      isInitializedRef.current = true;

      // 개발 환경에서만 디버깅 로그
      if (process.env.NODE_ENV === "development") {
        console.log(
          `[DEBUG] usePostInteractions 초기화 - isLiked: ${initialIsLiked}, isBookmarked: ${initialIsBookmarked}`,
        );
      }
    }
  }, [
    initialIsLiked,
    initialLikeCount,
    initialIsFollowing,
    initialIsBookmarked,
  ]);

  /**
   * 좋아요 토글 핸들러
   */
  const handleLike = () => {
    if (isLikeProcessing) return;

    if (!currentUserId) {
      showToast({
        type: "error",
        title: "로그인 필요",
        message: "좋아요를 누르려면 로그인이 필요합니다.",
        duration: 3000,
      });
      return;
    }

    setIsLikeProcessing(true);
    setIsLikeError(false);

    const originalLikedStatus = isLiked;
    const originalLikeCount = likeCount;

    // 낙관적 업데이트
    const newLikedStatus = !isLiked;
    const newLikeCount = newLikedStatus ? likeCount + 1 : likeCount - 1;
    setIsLiked(newLikedStatus);
    setLikeCount(newLikeCount);

    executeLike({
      variables: { postId },
      // Apollo Client 캐시 업데이트 설정
      update: (cache, { data }) => {
        if (data?.likePost !== undefined) {
          // GET_POSTS 쿼리의 캐시 업데이트
          try {
            const existingData = cache.readQuery({
              query: GET_POSTS,
              variables: { input: { page: 1, limit: 10 } }, // TODO: PAGE_SIZE 상수 사용 고려
            });

            if (existingData?.posts?.posts) {
              const updatedPosts = existingData.posts.posts.map((post: any) => {
                if (post.id === postId) {
                  return {
                    ...post,
                    isLiked: data.likePost,
                    likeCount: data.likePost
                      ? post.likeCount + 1
                      : Math.max(0, post.likeCount - 1),
                  };
                }
                return post;
              });

              cache.writeQuery({
                query: GET_POSTS,
                variables: { input: { page: 1, limit: 10 } }, // TODO: PAGE_SIZE 상수 사용 고려
                data: {
                  ...existingData,
                  posts: {
                    ...existingData.posts,
                    posts: updatedPosts,
                  },
                },
              });
            }
          } catch (error) {
            // 캐시 업데이트 실패 시 로그만 출력 (정상 동작에는 영향 없음)
            console.warn("Apollo 캐시 업데이트 실패:", error);
          }
        }
      },
    })
      .then(({ data, errors }) => {
        if (errors) {
          console.error("좋아요 처리 실패:", errors);
          setIsLiked(originalLikedStatus);
          setLikeCount(originalLikeCount);
          setIsLikeError(true);
          showToast({
            type: "error",
            title: t(TRANSLATION_KEYS.POST_LIKE_ERROR),
            message:
              errors[0]?.message || "좋아요 처리 중 오류가 발생했습니다.",
            duration: 3000,
          });
          return;
        }

        const likeSuccessful = data?.likePost;

        // 개발 환경에서만 디버깅 로그
        if (process.env.NODE_ENV === "development") {
          console.log(
            `[DEBUG] 좋아요 응답 - postId: ${postId}, likeSuccessful: ${likeSuccessful}, 예상값: ${newLikedStatus}`,
          );
        }

        if (likeSuccessful !== undefined && likeSuccessful !== newLikedStatus) {
          setIsLiked(likeSuccessful);
          setLikeCount(
            likeSuccessful ? originalLikeCount + 1 : originalLikeCount - 1,
          );
        }
      })
      .finally(() => {
        setTimeout(() => {
          setIsLikeProcessing(false);
        }, 300);
      });
  };

  /**
   * 팔로우 토글 핸들러
   */
  const handleFollowToggle = async () => {
    if (!currentUserId) {
      showToast({
        type: "error",
        title: "로그인 필요",
        message: "팔로우하려면 로그인이 필요합니다.",
        duration: 3000,
      });
      return;
    }

    if (currentUserId === authorId) return;

    const previousIsFollowing = isFollowing;
    setIsFollowing(!previousIsFollowing);

    try {
      const result = await toggleFollow({
        variables: { userId: authorId },
      });

      if (result.errors || !result.data) {
        setIsFollowing(previousIsFollowing);
        showToast({
          type: "error",
          title: t(TRANSLATION_KEYS.POST_FOLLOW_ERROR),
          message: result.errors?.[0]?.message || "An unknown error occurred.",
          duration: 3000,
        });
        return;
      }

      const newIsFollowing = result.data.toggleFollow;
      setIsFollowing(newIsFollowing);

      showToast({
        type: "success",
        title: "Success",
        message: newIsFollowing
          ? t(TRANSLATION_KEYS.POST_FOLLOW_SUCCESS)
          : t(TRANSLATION_KEYS.POST_UNFOLLOW_SUCCESS),
        duration: 2000,
      });
    } catch (error) {
      setIsFollowing(previousIsFollowing);
      showToast({
        type: "error",
        title: t(TRANSLATION_KEYS.POST_FOLLOW_ERROR),
        message: "An unexpected error occurred while processing your request.",
        duration: 3000,
      });
    }
  };

  /**
   * 북마크 토글 핸들러
   */
  const handleBookmark = async () => {
    if (isBookmarkProcessing) return;

    if (!currentUserId) {
      showToast({
        type: "error",
        title: "로그인 필요",
        message: "북마크하려면 로그인이 필요합니다.",
        duration: 3000,
      });
      return;
    }

    setIsBookmarkProcessing(true);
    const previousIsBookmarked = isBookmarked;

    // 낙관적 업데이트
    setIsBookmarked(!previousIsBookmarked);

    try {
      const { data } = await toggleBookmark({
        variables: { postId },
      });

      if (data?.toggleBookmark !== undefined) {
        const newIsBookmarked = data.toggleBookmark;
        setIsBookmarked(newIsBookmarked);

        showToast({
          type: "success",
          title: newIsBookmarked ? "북마크 추가" : "북마크 제거",
          message: newIsBookmarked
            ? "게시물이 북마크에 추가되었습니다."
            : "게시물이 북마크에서 제거되었습니다.",
          duration: 2000,
        });
      }
    } catch (error) {
      // 실패 시 원래 상태로 복원
      setIsBookmarked(previousIsBookmarked);
      console.error("북마크 토글 오류:", error);
      showToast({
        type: "error",
        title: "오류",
        message: "북마크 처리 중 문제가 발생했습니다. 다시 시도해주세요.",
        duration: 3000,
      });
    } finally {
      setIsBookmarkProcessing(false);
    }
  };

  return {
    // 상태
    currentUserId,
    isLiked,
    likeCount,
    isFollowing,
    isBookmarked,
    isLikeProcessing,
    isBookmarkProcessing,
    isLikeError,

    // 핸들러
    handleLike,
    handleFollowToggle,
    handleBookmark,
  };
}
