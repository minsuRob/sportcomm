import { useCallback, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@apollo/client";
import { GET_POSTS, GET_BLOCKED_USERS } from "@/lib/graphql";
import { GET_MY_TEAMS, type GetMyTeamsResult } from "@/lib/graphql/teams";
import type { Post } from "@/components/PostCard";

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

  // 게시물 목록
  const {
    data,
    loading: fetching,
    error,
    refetch,
    fetchMore,
  } = useQuery<PostsQueryResponse>(GET_POSTS, {
    variables: {
      input: { page: 1, limit: PAGE_SIZE, teamIds: selectedTeamIds },
    },
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "cache-and-network",
  });

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

  // 최초: 저장된 팀 필터 로드 및 채택
  useEffect(() => {
    const loadTeamFilter = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          setSelectedTeamIds(JSON.parse(saved));
          setFilterInitialized(true);
        }
      } catch (e) {
        // 무시: 필터 로드 실패는 기능에 치명적이지 않음
      }
    };
    void loadTeamFilter();
  }, []);

  // 저장된 필터가 없을 경우, 내 팀 전체 선택을 기본값으로 1회 설정
  useEffect(() => {
    if (filterInitialized) return;
    if (!myTeamsData?.myTeams) return;
    const allMyTeamIds = myTeamsData.myTeams.map((ut) => ut.team.id);
    setSelectedTeamIds(allMyTeamIds.length > 0 ? allMyTeamIds : null);
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(allMyTeamIds.length > 0 ? allMyTeamIds : [])
    ).catch(() => {});
    setFilterInitialized(true);
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
      .map((p) => ({ ...p, isMock: false }) as unknown as Post);

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

  // 팀 필터가 변경될 때 첫 페이지를 네트워크로 재조회
  useEffect(() => {
    (async () => {
      setPosts([]);
      setIsRefreshing(true);
      try {
        await refetch({
          input: { page: 1, limit: PAGE_SIZE, teamIds: selectedTeamIds },
        });
      } finally {
        setIsRefreshing(false);
      }
    })();
    // stringify로 의존성 안정화
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(selectedTeamIds)]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    void refetch({
      input: { page: 1, limit: PAGE_SIZE, teamIds: selectedTeamIds },
    });
  }, [refetch, selectedTeamIds]);

  const handleLoadMore = useCallback(() => {
    if (fetching || !data?.posts?.hasNext) return;
    const nextPage = (data?.posts?.page ?? 0) + 1;
    void fetchMore({
      variables: {
        input: { page: nextPage, limit: PAGE_SIZE, teamIds: selectedTeamIds },
      },
      updateQuery: (prev, { fetchMoreResult }) => fetchMoreResult ?? prev,
    });
  }, [fetching, fetchMore, data, selectedTeamIds]);

  return {
    posts,
    fetching,
    error,
    isRefreshing,
    handleRefresh,
    handleLoadMore,
    selectedTeamIds,
    setSelectedTeamIds,
  } as const;
}

export default useFeedPosts;
