import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gql, useLazyQuery } from "@apollo/client";
import type { Post } from "@/components/PostCard";
import type { StoryItem, StoryType } from "@/components/StorySection";
import { feedStoryCache } from "@/lib/state/feedStoryCache";

/**
 * useFeedStoryData 훅
 *
 * 목표:
 *  - 피드(게시물) + 스토리 데이터를 1분 TTL 캐시에 저장/재사용
 *  - 화면 전환(프로필, 슬라이더, 기타 탭) 후 복귀 시 즉시 캐시 표시 → 네트워크 지연 최소화
 *  - 앱/탭 비활성화 후 1분 이상 경과하여 돌아오면 다음 접근 시 자동 새로고침 유도
 *  - 수동 새로고침은 refreshFeed / refreshStories / refreshAll 사용
 *
 * 특징:
 *  - 캐시가 최신이면 네트워크 호출 자체를 건너뜀 (LazyQuery + 조건부 trigger)
 *  - 캐시 즉시 반영 → 로딩 스피너 최소화 (UX 향상)
 *  - 필요 시에만 refetch → 불필요한 데이터 트래픽 절감
 *
 * 사용 예시:
 *  const {
 *    posts, stories, loadingFeed, loadingStories,
 *    refreshAll, needsFeedRefresh
 *  } = useFeedStoryData();
 *
 *  // 화면 마운트 시 자동으로 캐시 검사 및 필요한 경우만 fetch 수행
 *
 * 주의:
 *  - 기존 useFeedPosts / useStoryData 대체 용도로 설계됨 (동일한 필드를 모두 제공하지는 않음)
 *  - 추가 필터/페이지네이션이 필요하다면 확장 또는 기존 훅과 혼용
 */

// ---------------------- GraphQL 쿼리 (중복 정의: 기존 useFeedPosts 내부 쿼리 export 아님) ----------------------

const FEED_PAGE_SIZE = 10;

const GET_POSTS_MIN = gql`
  query GetPostsForCache($input: FindPostsInput) {
    posts(input: $input) {
      posts {
        id
        title
        content
        createdAt
        type
        teamId
        isLiked
        isBookmarked
        viewCount
        likeCount
        commentCount
        author {
          id
          nickname
          profileImageUrl
        }
        media {
          id
          url
          type
        }
        team {
          id
          name
          mainColor
          subColor
          darkMainColor
          darkSubColor
          sport {
            id
            name
            icon
          }
        }
        tags {
          id
          name
        }
      }
      hasNext
      page
    }
  }
`;

const GET_STORY_POST_BLOCK = gql`
  query GetStoryPosts($input: FindPostsInput) {
    posts(input: $input) {
      posts {
        id
        title
        content
        createdAt
        likeCount
        commentCount
        viewCount
        teamId
        media {
          id
          url
          type
        }
        author {
          id
          nickname
          profileImageUrl
        }
        team {
          id
          name
        }
      }
      page
      hasNext
    }
  }
`;

// ---------------------- 타입 정의 ----------------------

interface UseFeedStoryDataOptions {
  /**
   * 스토리를 사용할지 여부 (기본 true)
   */
  enableStories?: boolean;
  /**
   * 스토리 타입 (향후 확장; 현재는 popular/myteams 혼합 단일 fetch 로직)
   */
  storyTypes?: StoryType[];
  /**
   * 기본 팀 필터 (null이면 전체)
   */
  teamIds?: string[] | null;
  /**
   * TTL 강제 무시하고 최초 한 번은 항상 새로고침할지 여부
   */
  forceInitialNetwork?: boolean;
}

interface UseFeedStoryDataResult {
  posts: Post[];
  stories: StoryItem[];
  loadingFeed: boolean;
  loadingStories: boolean;
  refreshing: boolean;
  refreshFeed: () => Promise<void>;
  refreshStories: () => Promise<void>;
  refreshAll: () => Promise<void>;
  needsFeedRefresh: boolean;
  needsStoryRefresh: boolean;
  lastFeedLoadedAt?: number;
  lastStoriesLoadedAt?: number;
  setPostsToCache: (posts: Post[]) => void;
  setStoriesToCache: (stories: StoryItem[]) => void;
}

// ---------------------- 유틸 ----------------------

/**
 * GraphQL Post → PostCard.Post (이미 거의 동일 구조)
 */
const mapRawPosts = (raw: any[]): Post[] =>
  raw.map(
    (p) =>
      ({
        ...p,
        media: p.media || [],
        isMock: false,
      }) as Post,
  );

/**
 * Post → StoryItem 변환 (간단 버전)
 * - 인기/내팀을 구분하기 위한 타입은 storyTypes 안에서 순서대로 배분할 수 있지만
 *   여기서는 단일 요청으로 가져온 것을 popular/myteams 혼합처럼 취급 (확장 용)
 */
const mapPostsToStories = (raw: any[]): StoryItem[] =>
  raw.slice(0, 4).map(
    (p) =>
      ({
        id: p.id,
        type: "popular", // 우선 popular 태그 (필요 시 조건부 분기)
        title: p.title || p.content?.slice(0, 30) || "",
        content: p.content,
        createdAt: p.createdAt,
        thumbnailUrl:
          p.media?.find(
            (m: any) => m.type === "image" || m.type === "IMAGE",
          )?.url || p.author?.profileImageUrl,
        author: {
          id: p.author?.id,
            nickname: p.author?.nickname,
          profileImageUrl: p.author?.profileImageUrl,
        },
        teamId: p.teamId,
        media: p.media || [],
        metadata: {
          likeCount: p.likeCount,
          commentCount: p.commentCount,
          viewCount: p.viewCount,
          teamName: p.team?.name,
          isPopular: p.likeCount > 10,
        },
      }) as StoryItem,
  );

// ---------------------- 훅 구현 ----------------------

export function useFeedStoryData(
  options: UseFeedStoryDataOptions = {},
): UseFeedStoryDataResult {
  const {
    enableStories = true,
    storyTypes = ["popular", "myteams"],
    teamIds = null,
    forceInitialNetwork = false,
  } = options;

  // 로컬 상태 (UI 반영용)
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [loadingStories, setLoadingStories] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // 최초 마운트 여부
  const mountedRef = useRef(true);
  const firstNetworkAttemptedRef = useRef(false);

  // Lazy Query (필요 시에만 호출) - Feed
  const [execFeedQuery] = useLazyQuery(GET_POSTS_MIN, {
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (!mountedRef.current) return;
      const newPosts = mapRawPosts(data?.posts?.posts || []);
      feedStoryCache.setFeed(newPosts);
      setPosts(newPosts);
      setLoadingFeed(false);
      setRefreshing(false);
    },
    onError: (e) => {
      console.warn("피드 로드 실패:", e);
      if (!mountedRef.current) return;
      setLoadingFeed(false);
      setRefreshing(false);
    },
  });

  // Lazy Query - Stories
  const [execStoryQuery] = useLazyQuery(GET_STORY_POST_BLOCK, {
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (!mountedRef.current) return;
      const mapped = mapPostsToStories(data?.posts?.posts || []);
      feedStoryCache.setStories(mapped);
      setStories(mapped);
      setLoadingStories(false);
      setRefreshing(false);
    },
    onError: (e) => {
      console.warn("스토리 로드 실패:", e);
      if (!mountedRef.current) return;
      setLoadingStories(false);
      setRefreshing(false);
    },
  });

  // 캐시 구독 (다른 곳에서 갱신될 경우 즉시 반영)
  useEffect(() => {
    const unsubFeed = feedStoryCache.subscribeFeed((c) => {
      if (!mountedRef.current || !c) return;
      setPosts(c.posts);
    });
    const unsubStory = feedStoryCache.subscribeStories((c) => {
      if (!mountedRef.current || !c) return;
      setStories(c.stories);
    });
    return () => {
      unsubFeed();
      unsubStory();
    };
  }, []);

  // 초기 로드: 캐시 검사 후 필요 시 fetch
  useEffect(() => {
    mountedRef.current = true;

    const feedStale = feedStoryCache.needsFeedRefresh();
    const storyStale =
      enableStories && feedStoryCache.needsStoryRefresh();

    // 캐시 즉시 반영
    const cachedFeed = feedStoryCache.getFeed(true);
    if (cachedFeed) setPosts(cachedFeed.posts);

    if (enableStories) {
      const cachedStories = feedStoryCache.getStories(true);
      if (cachedStories) setStories(cachedStories.stories);
    }

    // 네트워크 조건
    const shouldFetchFeed =
      forceInitialNetwork ||
      feedStale ||
      !cachedFeed ||
      cachedFeed.posts.length === 0;

    const shouldFetchStories =
      enableStories &&
      (forceInitialNetwork ||
        storyStale ||
        !feedStoryCache.getStories(true) ||
        stories.length === 0);

    if (shouldFetchFeed) {
      setLoadingFeed(true);
      firstNetworkAttemptedRef.current = true;
      execFeedQuery({
        variables: {
          input: {
            page: 1,
            limit: FEED_PAGE_SIZE,
            teamIds,
          },
        },
      });
    }

    if (shouldFetchStories) {
      setLoadingStories(true);
      execStoryQuery({
        variables: {
          input: {
            page: 1,
            limit: 4,
            teamIds,
            sortBy: "likeCount",
            sortOrder: "DESC",
          },
        },
      });
    }

    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableStories, teamIds, forceInitialNetwork]);

  // 새로고침 (피드만)
  const refreshFeed = useCallback(async () => {
    if (!mountedRef.current) return;
    setRefreshing(true);
    setLoadingFeed(true);
    feedStoryCache.markFeedStale(); // 강제 stale 처리 (의미상)
    execFeedQuery({
      variables: {
        input: {
          page: 1,
          limit: FEED_PAGE_SIZE,
          teamIds,
        },
      },
    });
  }, [execFeedQuery, teamIds]);

  // 새로고침 (스토리만)
  const refreshStories = useCallback(async () => {
    if (!mountedRef.current || !enableStories) return;
    setRefreshing(true);
    setLoadingStories(true);
    feedStoryCache.markStoriesStale();
    execStoryQuery({
      variables: {
        input: {
          page: 1,
          limit: 4,
          teamIds,
          sortBy: "likeCount",
          sortOrder: "DESC",
        },
      },
    });
  }, [execStoryQuery, teamIds, enableStories]);

  // 새로고침 (전체)
  const refreshAll = useCallback(async () => {
    await Promise.all([refreshFeed(), enableStories && refreshStories()]);
  }, [refreshFeed, refreshStories, enableStories]);

  // 외부에서 수동으로 캐시에 반영하고 싶을 때 제공
  const setPostsToCache = useCallback((newPosts: Post[]) => {
    feedStoryCache.setFeed(newPosts);
    setPosts(newPosts);
  }, []);

  const setStoriesToCache = useCallback((newStories: StoryItem[]) => {
    feedStoryCache.setStories(newStories);
    setStories(newStories);
  }, []);

  // 메타/상태
  const feedMeta = feedStoryCache.getFeed(true);
  const storyMeta = feedStoryCache.getStories(true);

  const needsFeedRefresh = feedStoryCache.needsFeedRefresh();
  const needsStoryRefresh = enableStories
    ? feedStoryCache.needsStoryRefresh()
    : false;

  // 메모이제이션 (불필요한 재렌더 최소화)
  const result: UseFeedStoryDataResult = useMemo(
    () => ({
      posts,
      stories,
      loadingFeed,
      loadingStories,
      refreshing,
      refreshFeed,
      refreshStories,
      refreshAll,
      needsFeedRefresh,
      needsStoryRefresh,
      lastFeedLoadedAt: feedMeta?.lastLoadedAt,
      lastStoriesLoadedAt: storyMeta?.lastLoadedAt,
      setPostsToCache,
      setStoriesToCache,
    }),
    [
      posts,
      stories,
      loadingFeed,
      loadingStories,
      refreshing,
      refreshFeed,
      refreshStories,
      refreshAll,
      needsFeedRefresh,
      needsStoryRefresh,
      feedMeta?.lastLoadedAt,
      storyMeta?.lastLoadedAt,
      setPostsToCache,
      setStoriesToCache,
    ],
  );

  return result;
}

export default useFeedStoryData;

/**
 * 추가 개선 아이디어 (필요 시):
 * 1. 페이지네이션 지원: feedStoryCache 에 page/hasNext 메타 추가
 * 2. 팀 필터별 캐시 분리: key => JSON.stringify(teamIds) 로 맵 구조 확장
 * 3. Story 타입별 다중 쿼리: popular/myteams/news 각각 TTL 관리
 * 4. SSR/Web 환경: localStorage 기반 Persist Layer (현재는 메모리 한정)
 */

/* commit: feat(hook): add useFeedStoryData integrating feed & story cache with 1min TTL */
