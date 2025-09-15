/**
 * 스토리 데이터 관리 훅
 * 다양한 소스(인기 게시물, MyTeams, 뉴스 크롤링)에서 데이터를 가져와 통합 관리
 */

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@apollo/client";
import { StoryItem, StoryType } from "@/components/StorySection";
import { GET_STORY_POSTS } from "@/lib/graphql";
import { selectOptimizedImageUrl } from "@/lib/image";
import { newsService } from "@/lib/services/newsService";

// GraphQL 쿼리들 (추가 구현 필요)
const GET_POPULAR_POSTS = GET_STORY_POSTS; // 임시로 동일한 쿼리 사용
const GET_MYTEAMS_POSTS = GET_STORY_POSTS; // 임시로 동일한 쿼리 사용

interface UseStoryDataProps {
  storyTypes: StoryType[];
  maxItems?: number;
  userId?: string; // MyTeams 데이터를 위한 사용자 ID
  teamIds?: string[] | null; // 팀 필터 (null이면 모든 팀, 빈 배열이면 필터 없음)
}

interface StoryDataResult {
  stories: StoryItem[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
}

/**
 * 게시물 데이터를 StoryItem으로 변환
 */
const transformPostToStory = (post: any, type: StoryType): StoryItem => {
  const imageMedia = post.media?.find(
    (item: any) => item.type === "IMAGE" || item.type === "image",
  );

  return {
    id: post.id,
    type,
    title: post.title || post.content.substring(0, 30) + "...",
    content: post.content,
    createdAt: post.createdAt,
    thumbnailUrl: imageMedia
      ? selectOptimizedImageUrl(imageMedia, "thumbnails")
      : post.author.profileImageUrl,
    author: {
      id: post.author.id,
      nickname: post.author.nickname,
      profileImageUrl: post.author.profileImageUrl,
    },
    teamId: post.teamId,
    media: post.media || [],
    metadata: {
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      viewCount: post.viewCount,
      isPopular: post.likeCount > 10,
      teamName: post.team?.name,
    },
  } as StoryItem;
};

/**
 * 뉴스 기사 데이터를 StoryItem으로 변환
 */
const transformNewsToStory = (article: any, index: number): StoryItem => {
  return {
    id: `news_${article.url || index}`,
    type: "news",
    title: article.title,
    content: article.description || article.content?.substring(0, 100) + "...",
    createdAt: article.publishedAt || new Date().toISOString(),
    thumbnailUrl: article.imageUrl || article.thumbnail,
    url: article.url,
    source: article.source,
    category: article.category,
    author: {
      id: "news_author",
      nickname: article.source || "뉴스",
      profileImageUrl: article.sourceIcon,
    },
    metadata: {
      source: article.source,
      viewCount: article.viewCount,
    },
  } as StoryItem;
};

/**
 * 뉴스 기사 데이터 가져오기 (실제 뉴스 서비스 사용)
 */
const fetchNewsArticles = async (limit: number = 5): Promise<any[]> => {
  try {
    const response = await newsService.fetchPopularNews(limit);
    return response;
  } catch (error) {
    console.error("뉴스 기사 로드 실패:", error);
    return [];
  }
};

export const useStoryData = ({
  storyTypes,
  maxItems = 10,
  userId,
  teamIds,
}: UseStoryDataProps): StoryDataResult => {
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // 인기 게시물 쿼리
  const {
    data: popularData,
    loading: popularLoading,
    error: popularError,
    refetch: refetchPopular,
  } = useQuery(GET_POPULAR_POSTS, {
    variables: {
      input: {
        page: 1,
        limit: 3,
        sortBy: "likeCount",
        sortOrder: "DESC",
        teamIds: teamIds, // 팀 필터 적용
      },
    },
    skip: !storyTypes.includes("popular"),
    fetchPolicy: "cache-first", // 캐시 우선으로 변경하여 중복 네트워크 요청 방지
  });

  // MyTeams 게시물 쿼리
  const {
    data: myTeamsData,
    loading: myTeamsLoading,
    error: myTeamsError,
    refetch: refetchMyTeams,
  } = useQuery(GET_MYTEAMS_POSTS, {
    variables: {
      input: {
        page: 1,
        limit: 3,
        sortBy: "createdAt",
        sortOrder: "DESC",
        teamIds: teamIds, // 팀 필터 적용
      },
    },
    skip: !storyTypes.includes("myteams") || !userId,
    fetchPolicy: "cache-first", // 캐시 우선으로 변경하여 중복 네트워크 요청 방지
  });

  /**
   * 모든 데이터 소스를 통합하여 스토리 배열 생성
   */
  // 데이터 변경 시 스토리 재구성
  useEffect(() => {
    const fetchAndCombineStories = async () => {
      // 데이터 로딩이 완료되지 않았으면 실행하지 않음
      if (popularLoading || myTeamsLoading) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const combinedStories: StoryItem[] = [];

        // 1. 인기 게시물 추가
        if (storyTypes.includes("popular") && popularData?.posts?.posts) {
          const popularStories = popularData.posts.posts
            .slice(0, 2)
            .map((post: any) => transformPostToStory(post, "popular"));
          combinedStories.push(...popularStories);
        }

        // 2. MyTeams 게시물 추가
        if (storyTypes.includes("myteams") && myTeamsData?.posts?.posts) {
          const myTeamsStories = myTeamsData.posts.posts
            .slice(0, 2)
            .map((post: any) => transformPostToStory(post, "myteams"));
          combinedStories.push(...myTeamsStories);
        }

        // 3. 뉴스 기사 추가
        // 크롤링 보완 후 다시 작업.
        if (storyTypes.includes("news")) {
          // try {
          //   const newsArticles = await fetchNewsArticles(3);
          //   const newsStories = newsArticles.map((article, index) =>
          //     transformNewsToStory(article, index)
          //   );
          //   combinedStories.push(...newsStories);
          // } catch (newsError) {
          //   console.warn("뉴스 기사 로드 실패:", newsError);
          // }
        }

        // 4. 중복 제거 및 정렬
        const uniqueStories = Array.from(
          new Map(combinedStories.map((story) => [story.id, story])).values(),
        );

        // 5. 생성 시간 기준으로 정렬 및 제한
        const sortedStories = uniqueStories
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )
          .slice(0, maxItems);

        setStories(sortedStories);
        setHasMore(sortedStories.length >= maxItems);
      } catch (err) {
        setError(err as Error);
        console.error("스토리 데이터 로드 실패:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAndCombineStories();
  }, [
    popularData,
    myTeamsData,
    popularLoading,
    myTeamsLoading,
    JSON.stringify(storyTypes),
    maxItems,
    userId,
  ]);

  /**
   * 데이터 새로고침
   */
  const refresh = useCallback(async () => {
    await Promise.all([
      storyTypes.includes("popular") ? refetchPopular() : Promise.resolve(),
      storyTypes.includes("myteams") ? refetchMyTeams() : Promise.resolve(),
    ]);
  }, [storyTypes, refetchPopular, refetchMyTeams]);

  /**
   * 더 많은 데이터 로드 (페이지네이션)
   */
  const loadMore = useCallback(async () => {
    // TODO: 페이지네이션 구현
    //console.log("더 많은 스토리 로드 (구현 예정)");
  }, []);

  return {
    stories,
    loading: loading || popularLoading || myTeamsLoading,
    error: error || popularError || myTeamsError,
    refresh,
    loadMore,
    hasMore,
  };
};
