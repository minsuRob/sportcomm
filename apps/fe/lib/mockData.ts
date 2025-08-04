// sportcomm/apps/fe/lib/mockData.ts

/**
 * This file provides functions to generate mock data for UI development and testing.
 * It's particularly useful when the backend API is unavailable or returns empty data.
 */

// --- Type Definitions ---
// These types should align with the main application's types (e.g., in PostCard.tsx or a shared types file).
// 게시물은 teamId로 분류됩니다.

// 팀 ID 타입 정의
export type TeamId = string; // 실제 구현에서는 더 구체적인 팀 ID 형식으로 제한할 수 있습니다.

export interface User {
  id: string;
  nickname: string;
  profileImageUrl?: string;
}

export interface Media {
  id: string;
  url: string;
  type: "image" | "video";
}

export interface Comment {
  id: string;
}

export interface Post {
  id: string;
  content: string;
  author: User;
  media: Media[];
  comments: Comment[];
  createdAt: string;
  teamId: TeamId; // 팀 ID로 분류
  viewCount: number;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  isMock?: boolean; // Flag to identify mock data
}

/**
 * Generates an array of mock post objects for the feed.
 * @param count - The number of mock posts to generate.
 * @returns An array of mock `Post` objects.
 */
export const createMockFeedData = (count = 5): Post[] => {
  const mockPosts: Post[] = Array.from({ length: count }, (_, i) => {
    const postId = `mock_post_${i}`;
    return {
      id: postId,
      content: `This is a mock post #${
        i + 1
      }. Welcome to Sportcomm! This is where you'll see live discussions, highlights, and analysis from fellow sports fans.`,
      author: {
        id: `mock_user_${i % 2}`,
        nickname: i % 2 === 0 ? "SportyFan" : "TeamGinger",
        profileImageUrl: `https://i.pravatar.cc/150?u=mock_user_${i % 2}`,
      },
      media: [
        {
          id: `mock_media_${postId}`,
          url: `https://picsum.photos/seed/${postId}/400/300`,
          type: "image",
        },
      ],
      comments: Array.from(
        { length: Math.floor(Math.random() * 5) + 1 },
        (_, c) => ({
          id: `mock_comment_${postId}_${c}`,
        }),
      ),
      createdAt: new Date(Date.now() - i * 1000 * 60 * 60 * 3).toISOString(),
      teamId: `team_${(i % 5) + 1}`, // 5개 팀 ID 중 하나로 랜덤 할당
      viewCount: Math.floor(Math.random() * 1200) + 50,
      likesCount: Math.floor(Math.random() * 250) + 10,
      commentsCount: Math.floor(Math.random() * 5) + 1,
      isLiked: Math.random() > 0.6,
      isMock: true,
    };
  });
  return mockPosts;
};

/**
 * 실제 팀 ID 목록에서 랜덤하게 하나의 팀 ID를 선택합니다.
 * @param seed - 선택의 일관성을 위한 시드 값
 * @returns 팀 ID
 */
const getRandomTeamId = (seed: number): TeamId => {
  // 실제 구현에서 사용될 팀 ID 목록
  const teamIds: TeamId[] = [
    "tottenham-id",
    "newcastle-id",
    "atletico-id",
    "mancity-id",
    "liverpool-id",
    "doosan-id",
    "hanwha-id",
    "lg-id",
    "samsung-id",
    "kia-id",
    "t1-id",
    "geng-id",
    "drx-id",
    "kt-id",
    "damwon-id",
  ];

  return teamIds[seed % teamIds.length];
};
