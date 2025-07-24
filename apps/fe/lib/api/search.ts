import { client } from "@/lib/urql-client";
import { SearchTabType } from "@/components/search/SearchTabs";
import { SearchResultItem } from "@/components/search/SearchResults";
import { PostItemType } from "@/components/posts/PostItem";
import { UserItemType } from "@/components/users/UserItem";

/**
 * 검색 API를 호출하는 함수들이 포함된 모듈입니다.
 * GraphQL을 사용하여 백엔드 API와 통신합니다.
 */

// 검색 쿼리 정의
const SEARCH_QUERY = `
  query Search($input: SearchInput!) {
    search(input: $input) {
      posts {
        id
        title
        content
        type
        viewCount
        likeCount
        commentCount
        createdAt
        isLiked
        author {
          id
          nickname
          profileImageUrl
        }
      }
      users {
        id
        nickname
        profileImageUrl
        bio
        role
        followers {
          id
        }
        following {
          id
        }
      }
      metadata {
        totalCount
        currentPage
        pageSize
        totalPages
        hasNextPage
        hasPreviousPage
      }
    }
  }
`;

// 인기 검색어 쿼리 정의
const POPULAR_SEARCH_TERMS_QUERY = `
  query PopularSearchTerms($limit: Float = 10) {
    popularSearchTerms(limit: $limit)
  }
`;

/**
 * 검색 API 파라미터 타입
 */
export interface SearchParams {
  query: string;
  page: number;
  pageSize: number;
  type?: "ALL" | "POSTS" | "USERS";
  sortBy?: "POPULAR" | "RECENT" | "RELEVANCE";
}

/**
 * 검색 탭에 해당하는 정렬 방식 반환
 *
 * @param tab 검색 탭
 * @returns 정렬 방식
 */
const getSortByFromTab = (
  tab: SearchTabType
): "POPULAR" | "RECENT" | "RELEVANCE" => {
  switch (tab) {
    case "popular":
      return "POPULAR";
    case "recent":
      return "RECENT";
    case "profile":
      return "RELEVANCE";
    default:
      return "RELEVANCE";
  }
};

/**
 * 검색 API 호출 함수
 *
 * @param params 검색 파라미터
 * @param tab 현재 선택된 탭
 * @returns 검색 결과와 메타데이터
 */
export const searchApi = async (
  params: SearchParams,
  tab: SearchTabType
): Promise<{
  items: SearchResultItem[];
  metadata: {
    totalCount: number;
    currentPage: number;
    pageSize: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}> => {
  try {
    // 탭에 따라 검색 파라미터 조정
    let searchParams: SearchParams = {
      ...params,
      sortBy: getSortByFromTab(tab),
    };

    if (tab === "profile") {
      searchParams.type = "USERS";
    }

    // GraphQL 쿼리 실행
    const { data } = await client
      .query(
        SEARCH_QUERY,
        {
          input: {
            query: searchParams.query,
            type: searchParams.type || "ALL",
            sortBy: searchParams.sortBy,
            page: searchParams.page,
            pageSize: searchParams.pageSize,
          },
        },
        {
          requestPolicy: "network-only", // 항상 최신 데이터 가져오기
          fetchOptions: { cache: "no-store" }, // 캐시 사용 안함
        }
      )
      .toPromise();

    // 반환된 데이터를 프론트엔드 형식으로 변환
    const items: SearchResultItem[] = [];

    // 게시물 데이터 변환
    if (data.search.posts) {
      data.search.posts.forEach((post: any) => {
        const postItem: SearchResultItem = {
          id: `post-${post.id}`,
          type: "post",
          data: {
            ...post,
            authorId: post.author.id, // author.id를 authorId로 매핑
            // mediaUrl이 없는 경우 임시 이미지 추가 (UI 표시용)
            mediaUrl:
              post.media && post.media.length > 0
                ? post.media[0].url
                : undefined,
          } as PostItemType,
        };
        items.push(postItem);
      });
    }

    // 사용자 데이터 변환
    if (data.search.users) {
      data.search.users.forEach((user: any) => {
        const userItem: SearchResultItem = {
          id: `user-${user.id}`,
          type: "user",
          data: {
            ...user,
            followersCount: user.followers?.length || 0,
            followingCount: user.following?.length || 0,
            // isFollowing은 백엔드에서 계산된 값 사용 또는 임시로 false 설정
            isFollowing: false,
          } as UserItemType,
        };
        items.push(userItem);
      });
    }

    return {
      items,
      metadata: data.search.metadata,
    };
  } catch (error) {
    console.error("검색 API 오류:", error);
    throw error;
  }
};

/**
 * 인기 검색어 API 호출 함수
 *
 * @param limit 가져올 검색어 개수
 * @returns 인기 검색어 목록
 */
export const getPopularSearchTerms = async (limit = 10): Promise<string[]> => {
  try {
    const { data } = await client
      .query(
        POPULAR_SEARCH_TERMS_QUERY,
        { limit },
        { requestPolicy: "cache-first" } // 캐싱 활용
      )
      .toPromise();
    return data.popularSearchTerms;
  } catch (error) {
    console.error("인기 검색어 API 오류:", error);
    return [];
  }
};
