// --- Type Definitions ---
// In a real application, these would be in a shared `types` directory.
export enum PostType {
  ANALYSIS = 'ANALYSIS',
  CHEERING = 'CHEERING',
  HIGHLIGHT = 'HIGHLIGHT',
}

export interface User {
  id: string;
  nickname: string;
  profileImageUrl?: string;
}

export interface Media {
  id: string;
  url: string;
  type: 'image' | 'video';
}

export interface Comment {
  id: string;
  content: string;
  author: User;
}

export interface Post {
  id: string;
  content: string;
  author: User;
  media: Media[];
  comments: Comment[];
  createdAt: string; // ISO 8601 date string
  type: PostType;
  viewCount: number;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean; // Add client-side state for likes
}

// --- Mock API Implementations ---

/**
 * Simulates fetching a paginated feed from an API.
 * @param page The page number to fetch.
 * @param count The number of items per page.
 * @returns A promise that resolves to an array of posts.
 */
export const getMockFeed = (page: number, count = 10): Promise<Post[]> => {
  console.log(`Fetching mock feed for page: ${page}`);
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate the end of the feed after 3 pages
      if (page > 3) {
        resolve([]);
        return;
      }

      const posts: Post[] = Array.from({ length: count }, (_, i) => {
        const postIndex = i + (page - 1) * count;
        const postId = `post_${page}_${i}`;
        return {
          id: postId,
          content: `This is post number ${postIndex}. It's a great day for sports! Discussing the latest match highlights and player performance. What are your thoughts? #sports #discussion`,
          author: {
            id: `user_${postIndex % 5}`,
            nickname: `FanaticUser${postIndex % 5}`,
            profileImageUrl: `https://i.pravatar.cc/150?u=user${postIndex % 5}`,
          },
          media: [
            {
              id: `media_${postId}`,
              url: `https://picsum.photos/seed/${postId}/400/300`,
              type: 'image',
            },
          ],
          comments: [
            {
              id: `comment_${postId}`,
              content: 'Great point! I totally agree.',
              author: { id: `user_commenter_${postIndex}`, nickname: `Commenter${postIndex}` },
            },
          ],
          createdAt: new Date(Date.now() - postIndex * 1000 * 60 * 60).toISOString(),
          type: [PostType.ANALYSIS, PostType.CHEERING, PostType.HIGHLIGHT][postIndex % 3],
          viewCount: Math.floor(Math.random() * 5000),
          likesCount: Math.floor(Math.random() * 500),
          commentsCount: Math.floor(Math.random() * 50),
          isLiked: Math.random() > 0.8, // Randomly set some posts as liked initially
        };
      });
      resolve(posts);
    }, 800); // Simulate network latency
  });
};

/**
 * Simulates toggling a like on a post.
 * @param postId The ID of the post to like/unlike.
 * @returns A promise that resolves when the operation is complete.
 */
export const toggleLikeMock = (postId: string): Promise<{ success: boolean }> => {
  console.log(`Toggling like for post: ${postId}`);
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Simulate a random failure to test optimistic update rollback
      if (Math.random() < 0.1) {
        console.error(`Failed to toggle like for post: ${postId}`);
        reject(new Error('A server error occurred.'));
      } else {
        resolve({ success: true });
      }
    }, 500);
  });
};
