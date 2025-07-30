import { useState, useEffect } from "react";
import { useMutation } from "@apollo/client";
import { TOGGLE_LIKE, TOGGLE_FOLLOW } from "@/lib/graphql";
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
}: UsePostInteractionsProps) {
  const { t } = useTranslation();

  // 상태 관리
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isLikeProcessing, setIsLikeProcessing] = useState(false);
  const [isLikeError, setIsLikeError] = useState(false);

  // GraphQL 뮤테이션
  const [executeLike, { loading: likeLoading }] = useMutation(TOGGLE_LIKE);
  const [toggleFollow, { loading: followLoading }] = useMutation(TOGGLE_FOLLOW);

  // 현재 사용자 확인
  useEffect(() => {
    const checkCurrentUser = async () => {
      const { user } = await getSession();
      setCurrentUserId(user?.id || null);
    };
    checkCurrentUser();
  }, []);

  // Props 변경 시 상태 동기화
  useEffect(() => {
    setIsLiked(initialIsLiked);
    setLikeCount(initialLikeCount);
    setIsFollowing(initialIsFollowing);
  }, [initialIsLiked, initialLikeCount, initialIsFollowing]);

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

    executeLike({ variables: { postId } })
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

      if (result.error || !result.data) {
        setIsFollowing(previousIsFollowing);
        showToast({
          type: "error",
          title: t(TRANSLATION_KEYS.POST_FOLLOW_ERROR),
          message: result.error?.message || "An unknown error occurred.",
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

  return {
    // 상태
    currentUserId,
    isLiked,
    likeCount,
    isFollowing,
    isLikeProcessing,
    isLikeError,

    // 핸들러
    handleLike,
    handleFollowToggle,
  };
}
