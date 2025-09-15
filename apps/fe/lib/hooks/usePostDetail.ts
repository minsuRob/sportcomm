import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@apollo/client";
import { GET_POST_DETAIL } from "@/lib/graphql";
import { getSession } from "@/lib/auth";

// --- 타입 정의 ---
interface PostDetailUser {
  id: string;
  nickname: string;
  profileImageUrl?: string;
  role: string;
}

interface PostDetailMedia {
  id: string;
  url: string;
  type: "image" | "video";
}

interface PostDetailComment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    nickname: string;
    profileImageUrl?: string;
  };
}

interface PostDetailTeam {
  id: string;
  name: string;
  code: string;
  color: string;
  mainColor: string;
  subColor: string;
  darkMainColor: string;
  darkSubColor: string;
  sport: {
    id: string;
    name: string;
    icon: string;
  };
}

interface PostDetailData {
  id: string;
  title?: string;
  content: string;
  createdAt: string;
  teamId?: string;
  team?: PostDetailTeam;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  isPinned: boolean;
  isPublic: boolean;
  isLiked: boolean;
  isBookmarked: boolean;
  author: PostDetailUser;
  media: PostDetailMedia[];
  comments: PostDetailComment[];
  tags: Array<{
    id: string;
    name: string;
    color: string;
  }>;
}

interface PostDetailResponse {
  post: PostDetailData;
}

interface UsePostDetailProps {
  postId: string;
}

interface UsePostDetailReturn {
  post: PostDetailData | null;
  currentUser: PostDetailUser | null;
  loading: boolean;
  error: Error | null;
  refetch: (options?: { fetchPolicy?: string }) => Promise<any>;
}

/**
 * 게시물 상세 정보를 가져오는 간단하고 안정적인 커스텀 훅
 */
export function usePostDetail({
  postId,
}: UsePostDetailProps): UsePostDetailReturn {
  const mountedRef = useRef(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // 현재 사용자 확인 (한 번만 실행)
  useEffect(() => {
    const checkCurrentUser = async () => {
      try {
        const { user } = await getSession();
        if (mountedRef.current) {
          setCurrentUserId(user?.id || null);
        }
      } catch (error) {
        console.error("사용자 세션 확인 실패:", error);
      }
    };

    checkCurrentUser();

    return () => {
      mountedRef.current = false;
    };
  }, []); // 빈 의존성 배열로 한 번만 실행

  // GraphQL 쿼리 실행
  const {
    data,
    loading,
    error,
    refetch: apolloRefetch,
  } = useQuery<PostDetailResponse>(GET_POST_DETAIL, {
    variables: { id: postId },
    skip: !postId,
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
    notifyOnNetworkStatusChange: false,
    onError: (error) => {
      console.error("게시물 상세 정보 조회 실패:", error);
    },
  });

  // refetch 함수 래핑
  const refetch = useCallback(
    async (options?: { fetchPolicy?: string }) => {
      if (!postId) return;

      return apolloRefetch({
        id: postId,
        fetchPolicy: options?.fetchPolicy || "network-only",
      });
    },
    [apolloRefetch, postId]
  );

  // 현재 사용자 정보 생성 (간단하게)
  const currentUser = currentUserId ? {
    id: currentUserId,
    nickname: "",
    profileImageUrl: "",
    role: "USER" as const
  } : null;

  return {
    post: data?.post || null,
    currentUser,
    loading,
    error: error || null,
    refetch,
  };
}

// 캐시 정리 유틸리티 함수 (필요 시 사용)
export const clearPostDetailCache = () => {
  // Apollo Client 캐시는 자동으로 관리됨
  //console.log("Post detail cache cleared");
};
