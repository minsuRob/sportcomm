import create from 'zustand';

// This mock API will be created in a separate step.
// For now, we assume it exists and provides the necessary functions.
import { getMockFeed, toggleLikeMock } from '../ai/src/api/feed';

// --- Type Definitions (to be moved to a shared types file) ---

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
  createdAt: string;
  type: PostType;
  viewCount: number;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean; // Client-side state to track if the user has liked this post
}

// --- Zustand Store Definition ---

interface FeedState {
  posts: Post[];
  loading: boolean; // For initial load
  refreshing: boolean; // For pull-to-refresh
  loadingMore: boolean; // For infinite scroll
  error: string | null;
  page: number;
  hasMore: boolean;
}

interface FeedActions {
  fetchPosts: (isRefresh?: boolean) => Promise<void>;
  likePost: (postId: string) => Promise<void>;
  reset: () => void;
}

const initialState: FeedState = {
  posts: [],
  loading: false,
  refreshing: false,
  loadingMore: false,
  error: null,
  page: 1,
  hasMore: true,
};

export const useFeedStore = create<FeedState & FeedActions>((set, get) => ({
  ...initialState,

  fetchPosts: async (isRefresh = false) => {
    const { loadingMore, hasMore, page } = get();

    // Prevent fetching if already in progress or no more data
    if (!isRefresh && (loadingMore || !hasMore)) return;

    const currentPage = isRefresh ? 1 : page;

    set({
      loading: isRefresh ? false : true,
      refreshing: isRefresh,
      loadingMore: !isRefresh,
      error: null,
    });

    try {
      const newPosts = await getMockFeed(currentPage);

      if (newPosts.length === 0) {
        set({ hasMore: false });
      } else {
        set((state) => ({
          posts: isRefresh ? newPosts : [...state.posts, ...newPosts],
          page: currentPage + 1,
          hasMore: true,
        }));
      }
    } catch (e) {
      console.error(e);
      set({ error: 'Failed to fetch posts.' });
    } finally {
      set({ loading: false, refreshing: false, loadingMore: false });
    }
  },

  likePost: async (postId: string) => {
    const originalPosts = get().posts;

    // Optimistic UI update
    const updatedPosts = originalPosts.map((p) => {
      if (p.id === postId) {
        return {
          ...p,
          isLiked: !p.isLiked,
          likesCount: p.isLiked ? p.likesCount - 1 : p.likesCount + 1,
        };
      }
      return p;
    });
    set({ posts: updatedPosts });

    // Simulate API call
    try {
      await toggleLikeMock(postId);
      // On success, the optimistic update is confirmed.
    } catch (error) {
      console.error('Failed to update like status:', error);
      // On failure, revert the change and notify the user.
      set({ posts: originalPosts });
      // Here you might want to trigger a toast message.
    }
  },

  reset: () => {
    set(initialState);
  },
}));
