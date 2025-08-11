import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@apollo/client";
import {
  GET_POSTS_WITH_MEDIA_THUMBNAILS,
  GET_BLOCKED_USERS,
} from "@/lib/graphql";
import {
  GET_MY_TEAMS,
  type GetMyTeamsResult,
  type UserTeam,
} from "@/lib/graphql/teams";
import type { Post } from "@/components/PostCard";
import type { PostType } from "@/lib/supabase/types";

interface GqlPost {
  id: string;
  title?: string;
  content: string;
  createdAt: string;
  teamId: string;
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
  media: Array<{
    id: string;
    originalName?: string;
    url: string;
    type: "image" | "video";
    status?: string;
    fileSize?: number;
    mimeType?: string;
    width?: number;
    height?: number;
    duration?: number;
    thumbnails?: Array<{
      id: string;
      size: string;
      url: string;
      width: number;
      height: number;
      fileSize?: number;
      quality?: number;
    }>;
  }>;
  comments: Array<{ id: string }>;
}

interface PostsQueryResponse {
  posts: {
    posts: GqlPost[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasPrevious: boolean;
    hasNext: boolean;
  };
}

const PAGE_SIZE = 10;
const STORAGE_KEY = "selected_team_filter";

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

  // 내 팀 목록 (기본 필터 초기화에 사용)
  const { data: myTeamsData } = useQuery<GetMyTeamsResult>(GET_MY_TEAMS, {
    fetchPolicy: "cache-and-network",
  });

  // 차단 사용자 목록
  const { data: blockedUsersData, error: blockedUsersError } = useQuery<{
    getBlockedUsers: string[];
  }>(GET_BLOCKED_USERS, {
    errorPolicy: "all",
    notifyOnNetworkStatusChange: false,
  });

  // 게시물 목록 - selectedTeamIds가 준비된 후에만 실행
  const {
    data,
    loading: fetching,
    error,
    refetch,
    fetchMore,
  } = useQuery<PostsQueryResponse>(GET_POSTS_WITH_MEDIA_THUMBNAILS, {
    variables: {
      input: { page: 1, limit: PAGE_SIZE, teamIds: selectedTeamIds },
    },
    skip: !filterInitialized, // 필터가 초기화되기 전까지는 쿼리 실행하지 않음
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "cache-and-network",
  });

  // 필터 초기화: AsyncStorage -> My Teams 순서로 처리
  useEffect(() => {
    const initializeFilter = async () => {
      try {
        // 1. AsyncStorage에서 저장된 필터 확인
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const savedIds = JSON.parse(saved);
          setSelectedTeamIds(savedIds.length > 0 ? savedIds : null);
          setFilterInitialized(true);
          return;
        }

        // 2. 저장된 필터가 없으면 My Teams를 기본값으로 사용
        if (myTeamsData?.myTeams) {
          const allMyTeamIds = myTeamsData.myTeams.map(
            (ut: UserTeam) => ut.team.id
          );
          setSelectedTeamIds(allMyTeamIds.length > 0 ? allMyTeamIds : null);

          // AsyncStorage에 기본값 저장
          await AsyncStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(allMyTeamIds.length > 0 ? allMyTeamIds : [])
          );
          setFilterInitialized(true);
        }
      } catch (error) {
        console.error("필터 초기화 실패:", error);
        // 실패해도 빈 필터로라도 초기화
        setSelectedTeamIds(null);
        setFilterInitialized(true);
      }
    };

    if (!filterInitialized) {
      initializeFilter();
    }
  }, [filterInitialized, myTeamsData]);

  // 차단 사용자 목록 반영
  useEffect(() => {
    if (blockedUsersData?.getBlockedUsers) {
      setBlockedUserIds(blockedUsersData.getBlockedUsers);
    } else if (blockedUsersError) {
      setBlockedUserIds([]);
    }
  }, [blockedUsersData, blockedUsersError]);

  // 게시물 결과 반영 (차단 사용자 제외 + 정렬 유지)
  useEffect(() => {
    if (!data?.posts?.posts) return;

    const newPosts: Post[] = data.posts.posts
      .filter((p) => !blockedUserIds.includes(p.author.id))
      .map(
        (p) =>
          ({
            ...p,
            isMock: false,
            media: p.media || [],
          }) as Post
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
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
    }

    if (isRefreshing) setIsRefreshing(false);
  }, [data, isRefreshing, blockedUserIds]);

  const handleRefresh = useCallback(() => {
    if (!filterInitialized) return;
    setIsRefreshing(true);
    void refetch({
      input: { page: 1, limit: PAGE_SIZE, teamIds: selectedTeamIds },
    });
  }, [refetch, selectedTeamIds, filterInitialized]);

  const handleLoadMore = useCallback(() => {
    if (fetching || !data?.posts?.hasNext || !filterInitialized) return;
    const nextPage = (data?.posts?.page ?? 0) + 1;
    void fetchMore({
      variables: {
        input: { page: nextPage, limit: PAGE_SIZE, teamIds: selectedTeamIds },
      },
      updateQuery: (prev, { fetchMoreResult }) => fetchMoreResult ?? prev,
    });
  }, [fetching, fetchMore, data, selectedTeamIds, filterInitialized]);

  /**
   * 팀 필터 변경 핸들러 (AsyncStorage에만 저장, My Teams에는 영향 없음)
   */
  const handleTeamFilterChange = useCallback(
    async (teamIds: string[] | null) => {
      try {
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
        });
      } catch (error) {
        console.error("팀 필터 변경 실패:", error);
      }
    },
    [refetch]
  );

  /**
   * My Teams 변경 시 필터 재초기화 (team-selection에서 호출)
   */
  const refreshFilterFromMyTeams = useCallback(async () => {
    try {
      // My Teams 데이터 다시 조회 후 필터 재설정
      setFilterInitialized(false);
      // useEffect에서 자동으로 재초기화됨
    } catch (error) {
      console.error("My Teams 기반 필터 재초기화 실패:", error);
    }
  }, []);

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
  } as const;
}

export default useFeedPosts;
