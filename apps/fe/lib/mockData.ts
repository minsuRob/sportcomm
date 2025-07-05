// sportcomm/apps/fe/lib/mockData.ts

/**
 * This file provides functions to generate mock data for UI development and testing.
 * It's particularly useful when the backend API is unavailable or returns empty data.
 */

// --- Type Definitions ---
// These types should align with the main application's types (e.g., in PostCard.tsx or a shared types file).
export enum PostType {
  ANALYSIS = "ANALYSIS",
  CHEERING = "CHEERING",
  HIGHLIGHT = "HIGHLIGHT",
}

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
  type: PostType;
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
      type: [PostType.HIGHLIGHT, PostType.ANALYSIS, PostType.CHEERING][i % 3],
      viewCount: Math.floor(Math.random() * 1200) + 50,
      likesCount: Math.floor(Math.random() * 250) + 10,
      commentsCount: Math.floor(Math.random() * 5) + 1,
      isLiked: Math.random() > 0.6,
      isMock: true,
    };
  });
  return mockPosts;
};
