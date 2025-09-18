import { useCallback, useEffect, useState, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useLazyQuery } from "@apollo/client";
import { gql } from "@apollo/client";
import { GET_FEED_DATA, GET_BLOCKED_USERS_LAZY } from "@/lib/graphql";
import {
  GET_MY_TEAMS,
  type GetMyTeamsResult,
  type UserTeam,
} from "@/lib/graphql/teams";
import type { Post } from "@/components/PostCard";
import type { PostType } from "@/lib/supabase/types";
import { getCurrentSession, isTokenValid } from "@/lib/auth/token-manager";

/**
 * 변경 요약 (게스트 지원):
 * 1) 비로그인(게스트) 상태에서도 전체 공개 피드 로딩 지원
 * 2) 기존 GET_FEED_DATA (myTeams, blockedUsers 포함)는 인증 사용자에게만 실행
 * 3) 게스트는 간소화된 GET_POSTS 쿼리 사용 (teamIds 필터 없이)
 * 4) handleRefresh / handleLoadMore 에서 토큰 유효성에 따른 분기 처리
 * 5) 토큰 만료 시 기존 '중단' 경고 대신 공개 피드 재로딩 허용 (경고 제거)
 */

interface PerformanceMetrics {
  networkRequests: {
    initial: number;
    duplicatesPrevented: number;
    cacheMisses: number;
    cacheHits: number;
    jwtBasedOptimizations: number;
  };
  timing: {
    filterInitTime: number;
    initialLoadTime: number;
    userSyncTime: number;
    totalOptimizationTime: number;
    tokenValidationTime: number;
  };
  optimization: {
    redundantCallsPrevented: number;
    memoryUsageReduction: number;
    backgroundTasksDeferred: number;
    jwtAwareCaching: number;
  };
}

interface GqlPost {
  id: string;
  title?: string;
  content: string;
  createdAt: string;
  type: PostType;
  teamId: string;
  team: {
    id: string;
    name: string;
    logoUrl?: string;
    mainColor?: string;
    subColor?: string;
    darkMainColor?: string;
    darkSubColor?: string;
    color?: string;
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
  isLiked: boolean;
  isBookmarked?: boolean;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  author: {
    id: string;
    nickname: string;
    profileImageUrl?: string;
  };
  media: Array<{ id: string; url: string; type: "image" | "video" }>;
  comments: Array<{ id: string }>;
}

interface PostsQueryResponse {
  posts: {
    posts: GqlPost[];
    hasNext: boolean;
    page: number;
  };
}

interface FeedDataResponse {
  posts: {
    posts: GqlPost[];
    hasNext: boolean;
    page: number;
  };
  myTeams: UserTeam[];
  blockedUsers?: string[];
}

const PAGE_SIZE = 5;
const STORAGE_KEY = "selected_team_filter";

/**
 * 공개 피드(게스트 포함)용 쿼리
 */
const GET_POSTS = gql`
  query GetPosts($input: FindPostsInput) {
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
          logoUrl
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

/**
 * 피드 게시물/필터/페이지네이션 전담 훅
 * - 팀 필터를 AsyncStorage로 영속화
 * - 내 팀 목록을 기본 필터로 1회 초기화 (로그인 사용자)
 * - 차단 사용자 게시물 필터링 (로그인 사용자)
 * - 게스트: 팀 필터/차단 목록 없이 전체 공개 게시물
 */
export function useFeedPosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[] | null>(null);
  const [filterInitialized, setFilterInitialized] = useState(false);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [shouldLoadBlockedUsers, setShouldLoadBlockedUsers] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] =
    useState<PerformanceMetrics>({
      networkRequests: {
        initial: 0,
        duplicatesPrevented: 0,
        cacheMisses: 0,
        cacheHits: 0,
        jwtBasedOptimizations: 0,
      },
      timing: {
        filterInitTime: 0,
        initialLoadTime: 0,
        userSyncTime: 0,
        totalOptimizationTime: 0,
        tokenValidationTime: 0,
      },
      optimization: {
        redundantCallsPrevented: 0,
        memoryUsageReduction: 0,
        backgroundTasksDeferred: 1,
        jwtAwareCaching: 0,
      },
    });

  const mountedRef = useRef(true);
  const myTeamsCache = useRef<UserTeam[] | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const networkRequestCount = useRef<number>(0);

  // 인증 여부 판단 (렌더마다 최신)
  const isAuthenticated = isTokenValid();

  // (로그인 사용자) 통합 피드 쿼리 - 커서 기반 페이지네이션 적용
  const {
    data: authData,
    loading: authFetching,
    error: authError,
    refetch: authRefetch,
    fetchMore: authFetchMore,
  } = useQuery<FeedDataResponse>(GET_FEED_DATA, {
    variables: {
      input: { page: 1, limit: PAGE_SIZE, teamIds: selectedTeamIds },
      includeBlockedUsers: shouldLoadBlockedUsers,
    },
    skip: !filterInitialized || !isAuthenticated,
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "cache-first", // 캐시 우선 사용
    nextFetchPolicy: "cache-first", // 다음 요청도 캐시 우선
  });

  // (게스트) 공개 피드 쿼리 - 커서 기반 페이지네이션 적용
  const {
    data: publicData,
    loading: publicFetching,
    error: publicError,
    refetch: publicRefetch,
    fetchMore: publicFetchMore,
  } = useQuery<PostsQueryResponse>(GET_POSTS, {
    variables: {
      input: { page: 1, limit: PAGE_SIZE, teamIds: null },
    },
    skip: !filterInitialized || isAuthenticated,
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "cache-first", // 캐시 우선 사용
    nextFetchPolicy: "cache-first", // 다음 요청도 캐시 우선
  });

  // 차단 사용자 지연 로딩 (로그인 사용자에게만 의미)
  const [loadBlockedUsers] = useLazyQuery<{ getBlockedUsers: string[] }>(
    GET_BLOCKED_USERS_LAZY,
    {
      fetchPolicy: "cache-first",
      onCompleted: (data) => {
        if (!isAuthenticated) return; // 게스트 무시
        if (data?.getBlockedUsers && mountedRef.current) {
          setBlockedUserIds(data.getBlockedUsers);
          setPerformanceMetrics((prev) => ({
            ...prev,
            networkRequests: {
              ...prev.networkRequests,
              cacheHits: prev.networkRequests.cacheHits + 1,
            },
          }));
        }
      },
    },
  );

  /**
   * 필터 초기화
   * - 게스트: 즉시 초기화 (teamIds = null)
   * - 로그인: AsyncStorage / myTeams 기반 로직 수행
   */
  useEffect(() => {
    if (filterInitialized || !mountedRef.current) return;

    let isMounted = true;
    const filterInitStartTime = Date.now();

    const initializeFilter = async () => {
      try {
        // 게스트: 단순 초기화
        if (!isAuthenticated) {
          setSelectedTeamIds(null);
          networkRequestCount.current = 1;
          return;
        }

        networkRequestCount.current = 1;

        // 1. 저장된 팀 필터
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved && isMounted) {
          const savedIds = JSON.parse(saved);
          setSelectedTeamIds(savedIds.length > 0 ? savedIds : null);
          setPerformanceMetrics((prev) => ({
            ...prev,
            networkRequests: {
              ...prev.networkRequests,
              cacheHits: prev.networkRequests.cacheHits + 1,
            },
            timing: {
              ...prev.timing,
              filterInitTime: Date.now() - filterInitStartTime,
            },
          }));
          return;
        }

        // 2. myTeams 사용
        let teamsToUse = authData?.myTeams || myTeamsCache.current;
        if (!teamsToUse) {
          try {
            const { data: re } = await authRefetch();
            teamsToUse = re?.myTeams || [];
            networkRequestCount.current++;
          } catch (e) {
            console.warn("My Teams 로드 실패:", e);
            teamsToUse = [];
            setPerformanceMetrics((prev) => ({
              ...prev,
              networkRequests: {
                ...prev.networkRequests,
                cacheMisses: prev.networkRequests.cacheMisses + 1,
              },
            }));
          }
        } else {
          setPerformanceMetrics((prev) => ({
            ...prev,
            optimization: {
              ...prev.optimization,
              redundantCallsPrevented:
                prev.optimization.redundantCallsPrevented + 1,
            },
          }));
        }

        if (teamsToUse && isMounted) {
          myTeamsCache.current = teamsToUse;
          const ids = teamsToUse.map((ut) => ut.team.id);
          const teamIds = ids.length > 0 ? ids : null;
          setSelectedTeamIds(teamIds);
          await AsyncStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(teamIds || []),
          );
        }
      } catch (e) {
        console.error("필터 초기화 실패:", e);
        if (isMounted) setSelectedTeamIds(null);
      } finally {
        if (isMounted) {
          setFilterInitialized(true);
          setPerformanceMetrics((prev) => ({
            ...prev,
            timing: {
              ...prev.timing,
              filterInitTime: Date.now() - filterInitStartTime,
              totalOptimizationTime: Date.now() - startTimeRef.current,
            },
            networkRequests: {
              ...prev.networkRequests,
              initial: networkRequestCount.current,
            },
          }));
        }
      }
    };

    void initializeFilter();
    return () => {
      isMounted = false;
    };
  }, [filterInitialized, authData?.myTeams, isAuthenticated, authRefetch]);

  useEffect(() => {
    if (!filterInitialized || !mountedRef.current) return;
    (async () => {
      try {
        const teamKey =
          selectedTeamIds && selectedTeamIds.length > 0
            ? selectedTeamIds.slice().sort().join(",")
            : "ALL";
        const scope = isAuthenticated ? "auth" : "guest";
        const key = `feed_snapshot_v1:${scope}:${teamKey}`;
        const snap = await AsyncStorage.getItem(key);
        if (snap) {
          const parsed = JSON.parse(snap) as { posts: GqlPost[]; ts: number };
          if (parsed?.posts?.length) {
            setPosts(
              parsed.posts.map(
                (p) =>
                  ({
                    ...p,
                    isMock: false,
                    media: p.media || [],
                  }) as Post,
              ),
            );
          }
        }
      } catch {
        // 스냅샷 로드 실패는 무시 (네트워크 응답으로 대체됨)
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterInitialized, isAuthenticated, selectedTeamIds]);

  // 인증 사용자: 통합 쿼리 차단 사용자 목록 반영
  useEffect(() => {
    if (!isAuthenticated) return;
    if (authData?.blockedUsers && mountedRef.current) {
      setBlockedUserIds(authData.blockedUsers);
    }
  }, [authData?.blockedUsers, isAuthenticated]);

  // 3초 후 차단 사용자 목록 로드 (인증 사용자 전용)
  useEffect(() => {
    if (!isAuthenticated) return;
    if (filterInitialized && !shouldLoadBlockedUsers) {
      const timer = setTimeout(() => {
        if (mountedRef.current) {
          setShouldLoadBlockedUsers(true);
          loadBlockedUsers();
          setPerformanceMetrics((prev) => ({
            ...prev,
            optimization: {
              ...prev.optimization,
              backgroundTasksDeferred:
                prev.optimization.backgroundTasksDeferred + 1,
            },
          }));
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [
    filterInitialized,
    shouldLoadBlockedUsers,
    loadBlockedUsers,
    isAuthenticated,
  ]);

  /**
   * 게시물 결과 반영
   * - 인증: authData
   * - 게스트: publicData
   */
  useEffect(() => {
    const source = isAuthenticated ? authData?.posts : publicData?.posts;

    if (!source?.posts || !mountedRef.current) return;

    if (isAuthenticated && authData?.myTeams) {
      myTeamsCache.current = authData.myTeams;
    }

    const newPosts: Post[] = source.posts
      .filter((p) =>
        isAuthenticated ? !blockedUserIds.includes(p.author.id) : true,
      )
      .map(
        (p) =>
          ({
            ...p,
            isMock: false,
            media: p.media || [],
          }) as Post,
      );

    if (source.page === 1) {
      setPosts(newPosts);
      // 첫 페이지 결과는 AsyncStorage에 스냅샷으로 보관하여 초기 페인트 가속화 (stale-while-revalidate)
      try {
        const teamKey =
          selectedTeamIds && selectedTeamIds.length > 0
            ? selectedTeamIds.slice().sort().join(",")
            : "ALL";
        const scope = isAuthenticated ? "auth" : "guest";
        const key = `feed_snapshot_v1:${scope}:${teamKey}`;
        void AsyncStorage.setItem(
          key,
          JSON.stringify({ posts: source.posts, ts: Date.now() }),
        );
      } catch {
        // 스냅샷 저장 실패는 무시 (기능상 치명적이지 않음)
      }
    } else {
      setPosts((current) => {
        const map = new Map(current.map((p) => [p.id, p] as const));
        newPosts.forEach((p) => map.set(p.id, p));
        const merged = Array.from(map.values());
        return merged.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      });
    }

    if (isRefreshing) setIsRefreshing(false);
  }, [authData, publicData, isRefreshing, blockedUserIds, isAuthenticated]);

  /**
   * 새로고침
   * - 게스트: 공개 피드 재로딩
   * - 인증: 기존 JWT 기반 최적화
   */
  const handleRefresh = useCallback(async () => {
    if (!filterInitialized || !mountedRef.current) return;
    setIsRefreshing(true);

    if (!isAuthenticated) {
      try {
        await publicRefetch({
          input: { page: 1, limit: PAGE_SIZE, teamIds: null },
        });
      } catch (e) {
        console.error("게스트 새로고침 실패:", e);
      } finally {
        if (mountedRef.current) setIsRefreshing(false);
      }
      return;
    }

    // 이하 인증 사용자 로직 (기존)
    const tokenValidationStartTime = Date.now();
    try {
      const currentSession = getCurrentSession();
      const now = Math.floor(Date.now() / 1000);
      const tokenValid = isTokenValid();
      const tokenValidationTime = Date.now() - tokenValidationStartTime;

      // 토큰 유효하지 않아도 공개 피드로 폴백하지 않고 여기서는 단순 재시도 가능
      if (!tokenValid) {
        // 공개 피드 시나리오로 전환
        setIsRefreshing(false);
        return;
      }

      let shouldRefreshBlockedUsers = false;
      if (currentSession?.expires_at) {
        const timeUntilExpiry = currentSession.expires_at - now;
        const lastFetch =
          (await AsyncStorage.getItem("blocked_users_last_fetch")) || "0";
        const timeSinceLastFetch = Date.now() - parseInt(lastFetch);
        const refreshInterval = Math.min(timeUntilExpiry * 500, 5 * 60 * 1000);
        shouldRefreshBlockedUsers =
          shouldLoadBlockedUsers && timeSinceLastFetch > refreshInterval;
      } else {
        const lastFetch =
          (await AsyncStorage.getItem("blocked_users_last_fetch")) || "0";
        shouldRefreshBlockedUsers =
          shouldLoadBlockedUsers &&
          Date.now() - parseInt(lastFetch) > 5 * 60 * 1000;
      }

      await authRefetch({
        input: { page: 1, limit: PAGE_SIZE, teamIds: selectedTeamIds },
        includeBlockedUsers: shouldRefreshBlockedUsers,
      });

      if (shouldRefreshBlockedUsers) {
        await AsyncStorage.setItem(
          "blocked_users_last_fetch",
          Date.now().toString(),
        );
      }

      setPerformanceMetrics((prev) => ({
        ...prev,
        timing: {
          ...prev.timing,
          tokenValidationTime:
            prev.timing.tokenValidationTime + tokenValidationTime,
        },
        optimization: {
          ...prev.optimization,
          jwtAwareCaching: prev.optimization.jwtAwareCaching + 1,
        },
        networkRequests: {
          ...prev.networkRequests,
          jwtBasedOptimizations:
            prev.networkRequests.jwtBasedOptimizations +
            (shouldRefreshBlockedUsers ? 0 : 1),
        },
      }));
    } catch (error) {
      console.error("새로고침 실패:", error);
      if (mountedRef.current) setIsRefreshing(false);
    } finally {
      if (mountedRef.current && isRefreshing) {
        setIsRefreshing(false);
      }
    }
  }, [
    authRefetch,
    publicRefetch,
    selectedTeamIds,
    filterInitialized,
    shouldLoadBlockedUsers,
    isRefreshing,
    isAuthenticated,
  ]);

  /**
   * 추가 로드 (커서 기반 페이지네이션)
   */
  const handleLoadMore = useCallback(() => {
    if (!filterInitialized || !mountedRef.current) return;

    if (isAuthenticated) {
      if (authFetching || !authData?.posts?.hasNext) return;

      // 커서 기반 페이지네이션 사용 (nextCursor가 있으면 사용)
      const nextCursor = authData.posts.nextCursor;
      if (nextCursor) {
        console.log('🔄 [LoadMore] Using cursor-based pagination:', nextCursor);
        void authFetchMore({
          variables: {
            input: {
              cursor: nextCursor,
              limit: PAGE_SIZE,
              teamIds: selectedTeamIds,
            },
            includeBlockedUsers: shouldLoadBlockedUsers,
          },
          updateQuery: (prev, { fetchMoreResult }) => {
            if (!fetchMoreResult) return prev;
            return {
              ...fetchMoreResult,
              posts: {
                ...fetchMoreResult.posts,
                posts: [
                  ...(prev.posts?.posts || []),
                  ...(fetchMoreResult.posts?.posts || []),
                ],
              },
            };
          },
        });
      } else {
        // 레거시 페이지네이션 fallback
        const nextPage = (authData?.posts?.page ?? 0) + 1;
        console.log('📄 [LoadMore] Using legacy pagination:', nextPage);
        void authFetchMore({
          variables: {
            input: {
              page: nextPage,
              limit: PAGE_SIZE,
              teamIds: selectedTeamIds,
            },
            includeBlockedUsers: shouldLoadBlockedUsers,
          },
          updateQuery: (prev, { fetchMoreResult }) => fetchMoreResult ?? prev,
        });
      }
    } else {
      if (publicFetching || !publicData?.posts?.hasNext) return;

      // 커서 기반 페이지네이션 사용
      const nextCursor = publicData.posts.nextCursor;
      if (nextCursor) {
        console.log('🔄 [LoadMore] Using cursor-based pagination for guest:', nextCursor);
        void publicFetchMore({
          variables: {
            input: { cursor: nextCursor, limit: PAGE_SIZE, teamIds: null },
          },
          updateQuery: (prev, { fetchMoreResult }) => {
            if (!fetchMoreResult) return prev;
            return {
              ...fetchMoreResult,
              posts: {
                ...fetchMoreResult.posts,
                posts: [
                  ...(prev.posts?.posts || []),
                  ...(fetchMoreResult.posts?.posts || []),
                ],
              },
            };
          },
        });
      } else {
        // 레거시 페이지네이션 fallback
        const nextPage = (publicData?.posts?.page ?? 0) + 1;
        console.log('📄 [LoadMore] Using legacy pagination for guest:', nextPage);
        void publicFetchMore({
          variables: {
            input: { page: nextPage, limit: PAGE_SIZE, teamIds: null },
          },
          updateQuery: (prev, { fetchMoreResult }) => fetchMoreResult ?? prev,
        });
      }
    }
  }, [
    authData,
    publicData,
    authFetching,
    publicFetching,
    authFetchMore,
    publicFetchMore,
    selectedTeamIds,
    filterInitialized,
    shouldLoadBlockedUsers,
    isAuthenticated,
  ]);

  /**
   * 팀 필터 변경 (게스트는 무시)
   */
  const handleTeamFilterChange = useCallback(
    async (teamIds: string[] | null) => {
      if (!mountedRef.current) return;
      if (!isAuthenticated) return; // 게스트는 필터 기능 없음

      try {
        const currentIds = selectedTeamIds || [];
        const nextIds = teamIds || [];

        const isSame =
          currentIds.length === nextIds.length &&
          currentIds.every((id) => nextIds.includes(id)) &&
          nextIds.every((id) => currentIds.includes(id));

        if (isSame) return;

        if (teamIds && teamIds.length > 0) {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(teamIds));
        } else {
          await AsyncStorage.removeItem(STORAGE_KEY);
        }

        setSelectedTeamIds(teamIds);
        setPosts([]);
        setIsRefreshing(true);

        await authRefetch({
          input: { page: 1, limit: PAGE_SIZE, teamIds },
          includeBlockedUsers: shouldLoadBlockedUsers,
        });
      } catch (error) {
        console.error("팀 필터 변경 실패:", error);
        if (mountedRef.current) setIsRefreshing(false);
      }
    },
    [authRefetch, selectedTeamIds, shouldLoadBlockedUsers, isAuthenticated],
  );

  /**
   * My Teams 기반 필터 재초기화 (로그인 사용자 전용)
   */
  const refreshFilterFromMyTeams = useCallback(async () => {
    if (!mountedRef.current) return;
    if (!isAuthenticated) return;
    try {
      myTeamsCache.current = null;
      setFilterInitialized(false);
    } catch (error) {
      console.error("My Teams 기반 필터 재초기화 실패:", error);
    }
  }, [isAuthenticated]);

  /**
   * 사용자 차단 (로그인 사용자 전용)
   */
  const handleBlockUser = useCallback(
    (blockedUserId: string) => {
      if (!mountedRef.current) return;
      if (!isAuthenticated) return;
      setPosts((cur) => cur.filter((p) => p.author.id !== blockedUserId));
      setBlockedUserIds((ids) => [...ids, blockedUserId]);
    },
    [isAuthenticated],
  );

  // cleanup
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 통합된 상태/에러/로딩
  const fetching = isAuthenticated ? authFetching : publicFetching;
  const error = isAuthenticated ? authError : publicError;

  return {
    posts,
    fetching,
    error,
    isRefreshing,
    handleRefresh,
    handleLoadMore,
    selectedTeamIds,
    handleTeamFilterChange,
    refreshFilterFromMyTeams,
    filterInitialized,
    handleBlockUser,
    performanceMetrics,
    isAuthenticated,
  } as const;
}

export default useFeedPosts;
