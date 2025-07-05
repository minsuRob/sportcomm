import React, { useState, useEffect, useCallback } from 'react';
import { ActivityIndicator, View, Button, Text } from 'react-native';
import { styled } from 'nativewind';
import { useQuery } from 'urql';

import { GET_POSTS } from '../api/graphql';
import FeedList from '../components/FeedList';

// --- Type Definitions ---
// These should ideally be in a shared types directory or generated from the GraphQL schema.
// Redefined here as we are moving away from the Zustand store file.
enum PostType {
  ANALYSIS = 'ANALYSIS',
  CHEERING = 'CHEERING',
  HIGHLIGHT = 'HIGHLIGHT',
}

interface User {
  id: string;
  nickname: string;
  profileImageUrl?: string;
}

interface Media {
  id: string;
  url: string;
  type: 'image' | 'video';
}

interface Comment {
  id: string;
}

// This is the shape of the data coming from the GraphQL query
interface GqlPost {
  id: string;
  content: string;
  createdAt: string;
  type: PostType;
  viewCount: number;
  author: User;
  media: Media[];
  comments: Comment[];
}

// This is the shape of the data the FeedList and PostCard components expect
export interface Post extends GqlPost {
  isLiked: boolean;
  likesCount: number;
  commentsCount: number;
}


// --- Styled Components ---
const CenterContainer = styled(View, 'flex-1 justify-center items-center bg-gray-50 dark:bg-black');
const ErrorText = styled(Text, 'text-red-500 text-lg mb-4 text-center px-4');
const FooterSpinner = styled(View, 'p-4');

const PAGE_SIZE = 10;

export default function FeedScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // --- urql Query Hook ---
  // This hook manages the network request, caching, and state (fetching, error).
  const [result, executeQuery] = useQuery<{ posts: GqlPost[] }>({
    query: GET_POSTS,
    variables: { skip: 0, take: PAGE_SIZE },
  });

  const { data, fetching, error } = result;

  // --- Data Handling Effect ---
  // This effect runs when new data arrives from the `useQuery` hook.
  // It transforms the raw GraphQL data into the shape our UI components expect
  // and merges it into our local state for infinite scroll.
  useEffect(() => {
    if (data?.posts) {
      // Transform GQL data to local UI state shape
      const transformedPosts: Post[] = data.posts.map(p => ({
        ...p,
        isLiked: false, // Default value, to be managed by a 'like' mutation
        likesCount: Math.floor(Math.random() * 200), // Placeholder until backend provides it
        commentsCount: p.comments.length,
      }));

      // If we are refreshing, replace the entire list.
      // Otherwise, append the new posts for infinite scroll.
      setPosts(currentPosts => {
        if (isRefreshing) {
          return transformedPosts;
        }
        // Create a map to efficiently merge new posts and avoid duplicates
        const postMap = new Map(currentPosts.map(p => [p.id, p]));
        transformedPosts.forEach(p => postMap.set(p.id, p));

        const mergedPosts = Array.from(postMap.values());
        // Sort posts by date to maintain order
        return mergedPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      });

      setIsRefreshing(false);
    }
  }, [data, isRefreshing]);

  // --- Event Handlers ---
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    // Re-fetch the first page, bypassing the cache for fresh data.
    executeQuery({ requestPolicy: 'network-only' });
  }, [executeQuery]);

  const handleLoadMore = useCallback(() => {
    const hasMoreData = data?.posts?.length === PAGE_SIZE;
    // Prevent fetching if already in progress or if the last fetch brought back less than a full page
    if (fetching || !hasMoreData) {
      return;
    }
    // Fetch the next page by updating the 'skip' variable
    executeQuery({
      variables: { skip: posts.length, take: PAGE_SIZE },
    });
  }, [fetching, executeQuery, posts.length, data?.posts]);


  // --- Render Logic ---
  // Initial loading state (only show if the screen is completely empty)
  if (fetching && posts.length === 0 && !isRefreshing) {
    return (
      <CenterContainer>
        <ActivityIndicator size="large" />
      </CenterContainer>
    );
  }

  // Error state (only show if the screen is completely empty)
  if (error && posts.length === 0) {
    return (
      <CenterContainer>
        <ErrorText>An error occurred while fetching the feed: {error.message}</ErrorText>
        <Button title="Retry" onPress={handleRefresh} />
      </CenterContainer>
    );
  }

  // Main feed list
  return (
    <FeedList
      posts={posts}
      refreshing={isRefreshing}
      onRefresh={handleRefresh}
      onEndReached={handleLoadMore}
      ListFooterComponent={() => {
        // Show a loading spinner at the bottom during infinite scroll fetches
        if (!fetching || posts.length === 0 || isRefreshing) return null;
        return (
          <FooterSpinner>
            <ActivityIndicator size="small" />
          </FooterSpinner>
        );
      }}
    />
  );
}
