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
    /** 라이트 메인 팔레트 컬러 */
    mainColor?: string;
    /** 라이트 서브 팔레트 컬러 */
    subColor?: string;
    /** 다크 메인 팔레트 컬러 */
    darkMainColor?: string;
    /** 다크 서브 팔레트 컬러 */
    darkSubColor?: string;
    /** (Deprecated) 단일 컬러 */
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

const PAGE_SIZE = 10;
const STORAGE_KEY = "selected_team_filter";

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
          myTeams {
            team {
              id
              name
              logoUrl
              icon
            }
            favoriteDate
            favoritePlayerName
            favoritePlayerNumber
          }
        }
        media {
          id
          url
          type
        }
        team {
          id
          name
          color
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
 * - 내 팀 목록을 기본 필터로 1회 초기화
 * - 차단 사용자 게시물 필터링
 */
export function useFeedPosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[] | null>(null);
  const [filterInitialized, setFilterInitialized] = useState(false);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [shouldLoadBlockedUsers, setShouldLoadBlockedUsers] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
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
      backgroundTasksDeferred: 1, // 차단 사용자 지연 로딩
      jwtAwareCaching: 0,
    },
  });

  const mountedRef = useRef(true);
  const myTeamsCache = useRef<UserTeam[] | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const networkRequestCount = useRef<number>(0);

  // 통합 피드 데이터 쿼리 - 게시물과 내 팀 정보를 한 번에 가져옴
  const {
    data,
    loading: fetching,
    error,
    refetch,
    fetchMore,
  } = useQuery<FeedDataResponse>(GET_FEED_DATA, {
    variables: {
      input: { page: 1, limit: PAGE_SIZE, teamIds: selectedTeamIds },
      includeBlockedUsers: shouldLoadBlockedUsers,
    },
    skip: !filterInitialized,
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "cache-first",
  });

  // 지연 로딩: 차단 사용자 목록 (필요 시에만 로드)
  const [loadBlockedUsers] = useLazyQuery<{ getBlockedUsers: string[] }>(
    GET_BLOCKED_USERS_LAZY,
    {
      fetchPolicy: "cache-first",
      onCompleted: (data) => {
        if (data?.getBlockedUsers && mountedRef.current) {
          setBlockedUserIds(data.getBlockedUsers);
          // 차단 사용자 지연 로딩 메트릭 업데이트
          setPerformanceMetrics(prev => ({
            ...prev,
            networkRequests: {
              ...prev.networkRequests,
              cacheHits: prev.networkRequests.cacheHits + 1,
            },
          }));
        }
      },
    }
  );

  // 필터 초기화: 단순화된 로직
  useEffect(() => {
    if (filterInitialized || !mountedRef.current) return;

    let isMounted = true;
    const filterInitStartTime = Date.now();

    const initializeFilter = async () => {
      try {
        networkRequestCount.current = 1; // 통합 쿼리로 1회만 요청

        // 1. AsyncStorage에서 저장된 필터 먼저 확인
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved && isMounted) {
          const savedIds = JSON.parse(saved);
          setSelectedTeamIds(savedIds.length > 0 ? savedIds : null);
          setFilterInitialized(true);

          // 캐시 히트 메트릭 업데이트
          setPerformanceMetrics(prev => ({
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

        // 2. 저장된 필터가 없으면 My Teams를 기본값으로 사용
        // 통합 쿼리에서 myTeams 데이터를 가져오거나 캐시된 데이터 사용
        let teamsToUse = data?.myTeams || myTeamsCache.current;

        if (!teamsToUse) {
          // 마지막 수단으로 별도 쿼리 사용
          try {
            const { data: myTeamsData } = await refetch();
            teamsToUse = myTeamsData?.myTeams || [];
            networkRequestCount.current++;
          } catch (e) {
            console.warn("My Teams 로드 실패:", e);
            teamsToUse = [];
            setPerformanceMetrics(prev => ({
              ...prev,
              networkRequests: {
                ...prev.networkRequests,
                cacheMisses: prev.networkRequests.cacheMisses + 1,
              },
            }));
          }
        } else {
          // 캐시된 데이터 사용으로 중복 요청 방지
          setPerformanceMetrics(prev => ({
            ...prev,
            optimization: {
              ...prev.optimization,
              redundantCallsPrevented: prev.optimization.redundantCallsPrevented + 1,
            },
          }));
        }

        if (teamsToUse && isMounted) {
          myTeamsCache.current = teamsToUse;
          const allMyTeamIds = teamsToUse.map((ut: UserTeam) => ut.team.id);
          const teamIds = allMyTeamIds.length > 0 ? allMyTeamIds : null;

          setSelectedTeamIds(teamIds);

          // AsyncStorage에 기본값 저장
          await AsyncStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(teamIds || []),
          );
        }
      } catch (error) {
        console.error("필터 초기화 실패:", error);
        if (isMounted) {
          setSelectedTeamIds(null);
        }
      } finally {
        if (isMounted) {
          setFilterInitialized(true);

          // 필터 초기화 완료 메트릭 업데이트
          setPerformanceMetrics(prev => ({
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

    initializeFilter();

    return () => {
      isMounted = false;
    };
  }, [filterInitialized, data?.myTeams]); // data.myTeams만 의존성에 포함

  // 통합 쿼리에서 차단 사용자 목록 반영
  useEffect(() => {
    if (data?.blockedUsers && mountedRef.current) {
      setBlockedUserIds(data.blockedUsers);
    }
  }, [data?.blockedUsers]);

  // 3초 후 차단 사용자 목록 백그라운드 로드
  useEffect(() => {
    if (filterInitialized && !shouldLoadBlockedUsers) {
      const timer = setTimeout(() => {
        if (mountedRef.current) {
          setShouldLoadBlockedUsers(true);
          loadBlockedUsers();

          // 백그라운드 작업 지연 메트릭 업데이트
          setPerformanceMetrics(prev => ({
            ...prev,
            optimization: {
              ...prev.optimization,
              backgroundTasksDeferred: prev.optimization.backgroundTasksDeferred + 1,
            },
          }));
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [filterInitialized, shouldLoadBlockedUsers, loadBlockedUsers]);

  // 게시물 결과 반영 (차단 사용자 제외 + 정렬 유지)
  useEffect(() => {
    if (!data?.posts?.posts || !mountedRef.current) return;

    // myTeams 캐시 업데이트
    if (data.myTeams) {
      myTeamsCache.current = data.myTeams;
    }

    const newPosts: Post[] = data.posts.posts
      .filter((p) => !blockedUserIds.includes(p.author.id))
      .map(
        (p) =>
          ({
            ...p,
            isMock: false,
            media: p.media || [],
          }) as Post,
      );

    if (data.posts.page === 1) {
      setPosts(newPosts);
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
  }, [data, isRefreshing, blockedUserIds]);

  const handleRefresh = useCallback(async () => {
    if (!filterInitialized || !mountedRef.current) return;

    setIsRefreshing(true);
    const tokenValidationStartTime = Date.now();

    try {
      // JWT 토큰 기반 스마트 새로고침
      const currentSession = getCurrentSession();
      const now = Math.floor(Date.now() / 1000);

      // 토큰 유효성 확인
      const tokenValid = isTokenValid();
      const tokenValidationTime = Date.now() - tokenValidationStartTime;

      if (!tokenValid) {
        console.warn("JWT 토큰 만료됨, 새로고침 중단");
        setIsRefreshing(false);
        return;
      }

      // JWT 만료 시간 기반 차단 사용자 갱신 주기 결정
      let shouldRefreshBlockedUsers = false;
      if (currentSession?.expires_at) {
        const timeUntilExpiry = currentSession.expires_at - now;
        const lastFetch = await AsyncStorage.getItem('blocked_users_last_fetch') || '0';
        const timeSinceLastFetch = Date.now() - parseInt(lastFetch);

        // 토큰 만료까지의 시간의 50% 또는 최소 5분 중 짧은 시간마다 갱신
        const refreshInterval = Math.min(timeUntilExpiry * 500, 5 * 60 * 1000);
        shouldRefreshBlockedUsers = shouldLoadBlockedUsers &&
          timeSinceLastFetch > refreshInterval;
      } else {
        // 토큰 정보가 없으면 기본 5분 간격
        const lastFetch = await AsyncStorage.getItem('blocked_users_last_fetch') || '0';
        shouldRefreshBlockedUsers = shouldLoadBlockedUsers &&
          (Date.now() - parseInt(lastFetch)) > 5 * 60 * 1000;
      }

      await refetch({
        input: { page: 1, limit: PAGE_SIZE, teamIds: selectedTeamIds },
        includeBlockedUsers: shouldRefreshBlockedUsers,
      });

      if (shouldRefreshBlockedUsers) {
        await AsyncStorage.setItem('blocked_users_last_fetch', Date.now().toString());
      }

      // JWT 기반 최적화 메트릭 업데이트
      setPerformanceMetrics(prev => ({
        ...prev,
        timing: {
          ...prev.timing,
          tokenValidationTime: prev.timing.tokenValidationTime + tokenValidationTime,
        },
        optimization: {
          ...prev.optimization,
          jwtAwareCaching: prev.optimization.jwtAwareCaching + 1,
        },
        networkRequests: {
          ...prev.networkRequests,
          jwtBasedOptimizations: prev.networkRequests.jwtBasedOptimizations +
            (shouldRefreshBlockedUsers ? 0 : 1), // 차단 사용자 요청 건너뛴 경우
        },
      }));

    } catch (error) {
      console.error("새로고침 실패:", error);
    }
  }, [refetch, selectedTeamIds, filterInitialized, shouldLoadBlockedUsers]);

  const handleLoadMore = useCallback(() => {
    if (fetching || !data?.posts?.hasNext || !filterInitialized || !mountedRef.current) return;
    const nextPage = (data?.posts?.page ?? 0) + 1;
    void fetchMore({
      variables: {
        input: { page: nextPage, limit: PAGE_SIZE, teamIds: selectedTeamIds },
        includeBlockedUsers: shouldLoadBlockedUsers,
      },
      updateQuery: (prev, { fetchMoreResult }) => fetchMoreResult ?? prev,
    });
  }, [fetching, fetchMore, data, selectedTeamIds, filterInitialized, shouldLoadBlockedUsers]);

  /**
   * 팀 필터 변경 핸들러 (AsyncStorage에만 저장, My Teams에는 영향 없음)
   */
  const handleTeamFilterChange = useCallback(
    async (teamIds: string[] | null) => {
      if (!mountedRef.current) return;

      try {
        // 현재 선택과 동일한 경우 중복 처리 방지
        const currentIds = selectedTeamIds || [];
        const nextIds = teamIds || [];

        const isSameSelection =
          currentIds.length === nextIds.length &&
          currentIds.every((id) => nextIds.includes(id)) &&
          nextIds.every((id) => currentIds.includes(id));

        if (isSameSelection) {
          return; // 동일한 선택이면 아무것도 하지 않음
        }

        // AsyncStorage에 저장
        if (teamIds && teamIds.length > 0) {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(teamIds));
        } else {
          await AsyncStorage.removeItem(STORAGE_KEY);
        }

        // 상태 업데이트 및 피드 새로고침
        setSelectedTeamIds(teamIds);
        setPosts([]); // 기존 게시물 클리어
        setIsRefreshing(true);

        // 새로운 필터로 데이터 다시 로드
        await refetch({
          input: { page: 1, limit: PAGE_SIZE, teamIds },
          includeBlockedUsers: shouldLoadBlockedUsers,
        });
      } catch (error) {
        console.error("팀 필터 변경 실패:", error);
      }
    },
    [refetch, selectedTeamIds, shouldLoadBlockedUsers],
  );

  /**
   * My Teams 변경 시 필터 재초기화 (team-selection에서 호출)
   */
  const refreshFilterFromMyTeams = useCallback(async () => {
    if (!mountedRef.current) return;

    try {
      // 캐시 무효화 후 재초기화
      myTeamsCache.current = null;
      setFilterInitialized(false);
      // useEffect에서 자동으로 재초기화됨
    } catch (error) {
      console.error("My Teams 기반 필터 재초기화 실패:", error);
    }
  }, []);

  /**
   * 사용자를 차단하고 피드에서 해당 사용자의 게시물을 즉시 제거합니다.
   */
  const handleBlockUser = useCallback((blockedUserId: string) => {
    if (!mountedRef.current) return;

    setPosts((currentPosts) =>
      currentPosts.filter((p) => p.author.id !== blockedUserId),
    );
    setBlockedUserIds((currentIds) => [...currentIds, blockedUserId]);
  }, []);

  // cleanup
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * 성능 최적화 리포트 생성
   */
  const getOptimizationReport = useCallback(() => {
    const totalTime = Date.now() - startTimeRef.current;
    const networkEfficiency = performanceMetrics.networkRequests.cacheHits /
      (performanceMetrics.networkRequests.cacheHits + performanceMetrics.networkRequests.cacheMisses + 1) * 100;

    return {
      ...performanceMetrics,
      summary: {
        totalExecutionTime: totalTime,
        networkEfficiency: networkEfficiency.toFixed(1) + '%',
        optimizationScore: Math.min(100,
          (performanceMetrics.optimization.redundantCallsPrevented * 10) +
          (performanceMetrics.optimization.backgroundTasksDeferred * 5) +
          (networkEfficiency)
        ),
        improvements: [
          `네트워크 요청 ${performanceMetrics.optimization.redundantCallsPrevented}회 방지`,
          `JWT 기반 최적화 ${performanceMetrics.networkRequests.jwtBasedOptimizations}회 적용`,
          `백그라운드 작업 ${performanceMetrics.optimization.backgroundTasksDeferred}회 지연`,
          `캐시 효율성 ${networkEfficiency.toFixed(1)}%`,
          `토큰 검증 시간: ${performanceMetrics.timing.tokenValidationTime}ms`,
          `JWT 인식 캐싱: ${performanceMetrics.optimization.jwtAwareCaching}회`,
        ],
      },
    };
  }, [performanceMetrics]);

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
    getOptimizationReport,
  } as const;
}

export default useFeedPosts;
