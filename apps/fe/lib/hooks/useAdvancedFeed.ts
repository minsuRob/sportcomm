import { useCallback, useEffect, useRef, useState } from "react";
import { useLazyQuery } from "@apollo/client";
import {
  GET_FEED_DATA,
  GET_POSTS,
  GET_BLOCKED_USERS_LAZY,
} from "@/lib/graphql";
import type { Post } from "@/components/PostCard";
import { PostType } from "@/components/PostCard";
import { feedAdvancedCache, buildFeedKey } from "@/lib/state/feedAdvancedCache";
import { getCurrentSession, isTokenValid } from "@/lib/auth/token-manager";

/* =========================================================
 * GraphQL 응답 타입 (필요한 부분만 정의)
 * =======================================================*/
interface GqlFeedPostsWrapper {
  posts: {
    posts: Array<GqlPost>;
    hasNext: boolean;
    page: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
  myTeams?: any[];
  blockedUsers?: string[];
}

interface GqlPost {
  id: string;
  title?: string;
  content: string;
  createdAt: string;
  type?: PostType | string; // 서버에서 type이 안 올 수 있어 optional 처리
  teamId: string;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  isLiked: boolean;
  isBookmarked?: boolean;
  author: {
    id: string;
    nickname: string;
    profileImageUrl?: string;
  };
  media: {
    id: string;
    url: string;
    type: "image" | "video" | "IMAGE" | "VIDEO";
  }[];
  team?: {
    id: string;
    name: string;
    mainColor?: string;
    subColor?: string;
    darkMainColor?: string;
    darkSubColor?: string;
    sport?: {
      id: string;
      name: string;
      icon: string;
    };
  };
  tags?: { id: string; name: string }[];
}

/* =========================================================
 * 훅 옵션 / 반환 타입
 * =======================================================*/
interface UseAdvancedFeedOptions {
  teamIds?: string[] | null; // 팀 필터
  pageSize?: number; // 페이지 당 개수
  autoLoad?: boolean; // 마운트 시 자동 로드
  includeBlockedUsers?: boolean; // 차단 사용자 로드 여부
  enableGuestMode?: boolean; // 비로그인 모드 허용 여부
}

interface UseAdvancedFeedResult {
  posts: Post[];
  loadingInitial: boolean;
  loadingMore: boolean;
  refreshing: boolean;
  hasNext: boolean;
  currentPage: number;
  error: Error | null;
  teamIds: string[] | null;
  setTeamFilter: (teamIds: string[] | null) => void;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  updateLocalPost: (post: Partial<Post> & { id: string }) => void;
  removeLocalPost: (postId: string) => void;
  blockedUserIds: string[];
  debugSnapshot: () => any;
  needsInitialRefetch: boolean; // 최초 마운트 시 캐시가 있지만 TTL 만료 등으로 네트워크 필요 여부
}

/* =========================================================
 * 유틸: GQL → Post 매핑
 * =======================================================*/
const mapGqlPostToPost = (p: GqlPost): Post => {
  // Post 인터페이스에서 team.sport 는 필수이므로 누락 시 안전한 기본값을 주입
  const safeTeam = p.team
    ? {
        id: p.team.id,
        name: p.team.name,
        mainColor: p.team.mainColor,
        subColor: p.team.subColor,
        darkMainColor: p.team.darkMainColor,
        darkSubColor: p.team.darkSubColor,
        sport: p.team.sport
          ? p.team.sport
          : { id: "unknown", name: "Unknown", icon: "❔" },
      }
    : {
        id: "unknown",
        name: "Unknown",
        mainColor: undefined,
        subColor: undefined,
        darkMainColor: undefined,
        darkSubColor: undefined,
        sport: { id: "unknown", name: "Unknown", icon: "❔" },
      };

  return {
    ...p,
    team: safeTeam,
    media: p.media || [],
    // 서버 쿼리에 type 필드 누락 가능성 → 안전한 기본값 부여
    type: ((): PostType => {
      const raw = (p as any).type;
      if (raw && Object.values(PostType).includes(raw)) return raw as PostType;
      return PostType.CHEERING; // 기본 타입
    })(),
    isMock: false,
  };
};

/* =========================================================
 * useAdvancedFeed 훅
 * - 고급 캐시(feedAdvancedCache)와 GraphQL 연동
 * - 팀 필터별 캐시 분리 / 차단 사용자 반영 / 페이지네이션 / TTL
 * =======================================================*/
export function useAdvancedFeed(
  options: UseAdvancedFeedOptions = {},
): UseAdvancedFeedResult {
  const {
    teamIds: initialTeamIds = null,
    pageSize = 10,
    autoLoad = true,
    includeBlockedUsers = true,
    enableGuestMode = true,
  } = options;

  // 로컬 상태
  const [teamIds, setTeamIds] = useState<string[] | null>(initialTeamIds);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);

  // 참조 값
  const mountedRef = useRef(true);
  const keyRef = useRef(buildFeedKey(teamIds));
  const isAuthRef = useRef<boolean>(isTokenValid());
  const firstLoadDoneRef = useRef(false);

  /* ---------------------------------------------------------
   * GraphQL Lazy Queries
   *  - 필요 시에만 네트워크 요청
   * -------------------------------------------------------*/
  const [execFeedQuery] = useLazyQuery<GqlFeedPostsWrapper>(GET_FEED_DATA, {
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (!mountedRef.current) return;
      applyFeedResponse(data, true);
    },
    onError: (e) => {
      if (!mountedRef.current) return;
      setError(e as Error);
      setLoadingInitial(false);
      setRefreshing(false);
      setLoadingMore(false);
    },
  });

  // 게스트 / 공개 피드
  const [execGuestQuery] = useLazyQuery<GqlFeedPostsWrapper>(GET_POSTS, {
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (!mountedRef.current) return;
      applyFeedResponse(data, true);
    },
    onError: (e) => {
      if (!mountedRef.current) return;
      setError(e as Error);
      setLoadingInitial(false);
      setRefreshing(false);
      setLoadingMore(false);
    },
  });

  // 차단 사용자
  const [execBlockedQuery] = useLazyQuery<{ getBlockedUsers: string[] }>(
    GET_BLOCKED_USERS_LAZY,
    {
      fetchPolicy: "cache-first",
      onCompleted: (data) => {
        if (!mountedRef.current) return;
        if (data?.getBlockedUsers) {
          setBlockedUserIds(data.getBlockedUsers);
          feedAdvancedCache.setBlockedUsers(data.getBlockedUsers);
        }
      },
    },
  );

  /* ---------------------------------------------------------
   * 응답 적용 헬퍼
   * -------------------------------------------------------*/
  const applyFeedResponse = useCallback(
    (data: GqlFeedPostsWrapper | undefined, isFirst: boolean) => {
      if (!data?.posts?.posts) {
        if (isFirst) setLoadingInitial(false);
        setLoadingMore(false);
        setRefreshing(false);
        return;
      }
      const pageInfo = data.posts;
      const mapped = pageInfo.posts.map(mapGqlPostToPost);
      const cacheKey = keyRef.current;

      if (isFirst || pageInfo.page === 1) {
        feedAdvancedCache.setFirstPage(cacheKey, {
          posts: mapped,
          hasNext: pageInfo.hasNext,
          total: pageInfo.total,
          totalPages: pageInfo.totalPages,
          limit: pageInfo.limit,
        });
        setCurrentPage(1);
      } else {
        feedAdvancedCache.appendPage(cacheKey, pageInfo.page, {
          posts: mapped,
          hasNext: pageInfo.hasNext,
          total: pageInfo.total,
          totalPages: pageInfo.totalPages,
          limit: pageInfo.limit,
        });
        setCurrentPage(pageInfo.page);
      }

      const snapshot = feedAdvancedCache.getBucketSnapshot(cacheKey);
      setPosts(snapshot?.posts || []);
      setLoadingInitial(false);
      setLoadingMore(false);
      setRefreshing(false);
      firstLoadDoneRef.current = true;
    },
    [],
  );

  /* ---------------------------------------------------------
   * 캐시 구독 (동일 필터 key 변경 시 자동 반영)
   * -------------------------------------------------------*/
  useEffect(() => {
    mountedRef.current = true;
    const unsubscribe = feedAdvancedCache.subscribe(keyRef.current, (snap) => {
      if (!mountedRef.current || !snap) return;
      setPosts(snap.posts);
    });
    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, []);

  /* ---------------------------------------------------------
   * 팀 필터 변경 감지
   *  - 캐시 존재 + 유효: 즉시 반영
   *  - 없거나 stale: 재로딩
   * (loadInitial 사용 전 forward 선언 필요 → loadInitial 정의를 본 블록 위로 이동)
   * -------------------------------------------------------*/
  // loadInitial 선언(호이스팅 불가한 const 사용으로 인한 TDZ 오류 방지를 위해 함수 표현식 정의부를 위로 이동)
  // 아래에서 useCallback 버전으로 재선언하지 않고 여기서 useCallback 감싸 구현
  const loadInitial = useCallback(
    async (forced: boolean) => {
      setError(null);
      const key = keyRef.current;
      const auth = isTokenValid();
      isAuthRef.current = auth;
      const need = forced || feedAdvancedCache.needsRefresh(key);

      // 캐시 재사용: stale 아님 + 존재 시 즉시 반환
      if (!need) {
        const snap = feedAdvancedCache.getBucketSnapshot(key);
        if (snap) {
          setPosts(snap.posts);
          setCurrentPage(
            snap.pageCount ? snap.pageCount : snap.posts.length > 0 ? 1 : 0,
          );
          return;
        }
      }

      setLoadingInitial(true);
      const variables: any = {
        input: {
          page: 1,
          limit: pageSize,
          teamIds: teamIds,
        },
        includeBlockedUsers: includeBlockedUsers,
      };

      if (auth) {
        execFeedQuery({ variables });
        if (includeBlockedUsers) {
          execBlockedQuery();
        }
      } else if (enableGuestMode) {
        execGuestQuery({ variables: { input: variables.input } });
      } else {
        setLoadingInitial(false);
        setError(new Error("인증이 필요합니다."));
      }
    },
    [
      execFeedQuery,
      execGuestQuery,
      execBlockedQuery,
      pageSize,
      teamIds,
      includeBlockedUsers,
      enableGuestMode,
    ],
  );

  useEffect(() => {
    const newKey = buildFeedKey(teamIds);
    if (newKey === keyRef.current) return;

    keyRef.current = newKey;
    const snap = feedAdvancedCache.getBucketSnapshot(newKey);

    if (snap && !feedAdvancedCache.needsRefresh(newKey)) {
      setPosts(snap.posts);
      setCurrentPage(
        snap.pageCount ? snap.pageCount : snap.posts.length > 0 ? 1 : 0,
      );
      return;
    }
    if (autoLoad) {
      void loadInitial(true);
    }
  }, [teamIds, autoLoad, loadInitial]);

  /* ---------------------------------------------------------
   * 초기 로드
   * -------------------------------------------------------*/
  useEffect(() => {
    if (!autoLoad) return;
    void loadInitial(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* duplicate loadInitial 정의 제거됨 (상단 loadInitial 유지) */

  /* ---------------------------------------------------------
   * 추가 페이지 로드 (페이지네이션)
   * -------------------------------------------------------*/
  const loadMore = useCallback(async () => {
    if (loadingMore || loadingInitial) return;
    const key = keyRef.current;
    const snap = feedAdvancedCache.getBucketSnapshot(key);
    if (!snap || !snap.hasNext) return;

    const nextPage = currentPage + 1;
    setLoadingMore(true);
    const auth = isAuthRef.current;

    const variables: any = {
      input: {
        page: nextPage,
        limit: pageSize,
        teamIds: teamIds,
      },
      includeBlockedUsers: false,
    };

    if (auth) {
      execFeedQuery({
        variables,
        onCompleted: (d) => applyFeedResponse(d, false),
        onError: (e) => {
          setError(e as Error);
          setLoadingMore(false);
        },
      });
    } else if (enableGuestMode) {
      execGuestQuery({
        variables: { input: variables.input },
        onCompleted: (d) => applyFeedResponse(d, false),
        onError: (e) => {
          setError(e as Error);
          setLoadingMore(false);
        },
      });
    } else {
      setLoadingMore(false);
    }
  }, [
    loadingMore,
    loadingInitial,
    currentPage,
    pageSize,
    teamIds,
    execFeedQuery,
    execGuestQuery,
    applyFeedResponse,
    enableGuestMode,
  ]);

  /* ---------------------------------------------------------
   * 새로고침
   * -------------------------------------------------------*/
  const refresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    feedAdvancedCache.markStale(keyRef.current);
    await loadInitial(true);
  }, [refreshing, loadInitial]);

  /* ---------------------------------------------------------
   * 팀 필터 Setter
   * -------------------------------------------------------*/
  const setTeamFilter = useCallback((ids: string[] | null) => {
    setTeamIds(ids && ids.length ? ids : null);
  }, []);

  /* ---------------------------------------------------------
   * 로컬 포스트 업데이트 / 제거 (낙관적 UI)
   * -------------------------------------------------------*/
  const updateLocalPost = useCallback(
    (partial: Partial<Post> & { id: string }) => {
      const existing = posts.find((p) => p.id === partial.id);
      if (!existing) return;
      const updated: Post = { ...existing, ...partial };
      feedAdvancedCache.updatePostAcrossBuckets(updated);
    },
    [posts],
  );

  const removeLocalPost = useCallback((postId: string) => {
    feedAdvancedCache.removePostEverywhere(postId);
  }, []);

  /* ---------------------------------------------------------
   * 디버그 스냅샷
   * -------------------------------------------------------*/
  const debugSnapshot = useCallback(
    () => feedAdvancedCache.debugSnapshot(),
    [],
  );

  /* ---------------------------------------------------------
   * hasNext / needsInitialRefetch 파생 값
   * -------------------------------------------------------*/
  const hasNext = (() => {
    const snap = feedAdvancedCache.getBucketSnapshot(keyRef.current);
    return snap?.hasNext || false;
  })();

  const needsInitialRefetch =
    !firstLoadDoneRef.current && feedAdvancedCache.needsRefresh(keyRef.current);

  /* ---------------------------------------------------------
   * 반환
   * -------------------------------------------------------*/
  return {
    posts,
    loadingInitial,
    loadingMore,
    refreshing,
    hasNext,
    currentPage,
    error,
    teamIds,
    setTeamFilter,
    loadMore,
    refresh,
    updateLocalPost,
    removeLocalPost,
    blockedUserIds,
    debugSnapshot,
    needsInitialRefetch,
  };
}

export default useAdvancedFeed;

/**
 * 사용 예시:
 *
 * const {
 *   posts,
 *   loadingInitial,
 *   loadMore,
 *   refresh,
 *   hasNext,
 *   setTeamFilter
 * } = useAdvancedFeed({
 *   teamIds: selectedTeamIds,
 *   pageSize: 12,
 *   includeBlockedUsers: true,
 * });
 *
 * <FlatList
 *   data={posts}
 *   onEndReached={loadMore}
 *   refreshing={loadingInitial || refreshing}
 *   onRefresh={refresh}
 * />
 *
 * 주요 특징:
 *  - 팀 필터별 캐시 버킷 분리 (buildFeedKey)
 *  - TTL(1분) + 앱 foreground 복귀 후 경과 시 자동 stale
 *  - 차단 사용자 목록 동기화 시 자동 재필터
 *  - 페이지네이션 appendPage / setFirstPage 기반
 *  - 낙관적 업데이트: updateLocalPost / removeLocalPost
 *
 * TODO(확장 아이디어):
 *  - 팀 필터별 LRU 전략 고도화
 *  - prefetch(다음 페이지 사전 로드)
 *  - offline persistence (AsyncStorage)
 *  - 뉴스/스토리 통합 캐시 계층 추가
 *
 * 성능 고려:
 *  - 동일 필터 재방문 시 즉시 메모리 반환 → UX 향상
 *  - 네트워크 최소화를 위한 feedAdvancedCache.needsRefresh 판단
 *
 * 오류 처리:
 *  - GraphQL onError 시 error state 업데이트
 *  - refresh / loadMore 실패 시 상태 플래그 reset
 *
 * commit message suggestion is at the bottom of this file.
 */
//
// commit: feat(hook): add useAdvancedFeed with advanced cache (team filters, blocked users, pagination, TTL)
