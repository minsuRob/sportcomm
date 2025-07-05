import React, { useEffect } from 'react';
import { ActivityIndicator, View, Button, Text } from 'react-native';
import { styled } from 'nativewind';

import { useFeedStore } from '../../../lib/feedStore';
import FeedList from '../components/FeedList';

// Styled Components
const CenterContainer = styled(View, 'flex-1 justify-center items-center bg-gray-50 dark:bg-black');
const ErrorText = styled(Text, 'text-red-500 text-lg mb-4');
const FooterSpinner = styled(View, 'p-4');

export default function FeedScreen() {
  // Select state and actions from the Zustand store
  const {
    posts,
    loading,
    refreshing,
    loadingMore,
    error,
    hasMore,
    fetchPosts,
  } = useFeedStore((state) => ({
    posts: state.posts,
    loading: state.loading,
    refreshing: state.refreshing,
    loadingMore: state.loadingMore,
    error: state.error,
    hasMore: state.hasMore,
    fetchPosts: state.fetchPosts,
  }));

  // Initial data load and cleanup
  useEffect(() => {
    // Fetch initial posts only if the list is empty.
    if (posts.length === 0) {
      fetchPosts(true); // `true` for initial load as a refresh.
    }

    // When the screen is unmounted, you could optionally reset the store.
    // This would mean the feed is always fresh when the user navigates here.
    // return () => {
    //   useFeedStore.getState().reset();
    // };
  }, []); // The empty dependency array ensures this runs only once on mount.

  const handleRefresh = () => {
    fetchPosts(true); // `true` indicates a pull-to-refresh action.
  };

  const handleLoadMore = () => {
    // We call fetchPosts only if there is more data and we are not already loading.
    if (hasMore && !loadingMore) {
      fetchPosts(false); // `false` indicates loading more, not a refresh.
    }
  };

  // Render initial loading state
  if (loading && posts.length === 0) {
    return (
      <CenterContainer>
        <ActivityIndicator size="large" />
      </CenterContainer>
    );
  }

  // Render error state if initial load failed
  if (error && posts.length === 0) {
    return (
      <CenterContainer>
        <ErrorText>{error}</ErrorText>
        <Button title="Retry" onPress={handleRefresh} />
      </CenterContainer>
    );
  }

  // Render the list of posts
  return (
    <FeedList
      posts={posts}
      refreshing={refreshing}
      onRefresh={handleRefresh}
      onEndReached={handleLoadMore}
      ListFooterComponent={() => {
        // Show a spinner at the bottom while loading more posts
        if (!loadingMore) return null;
        return (
          <FooterSpinner>
            <ActivityIndicator size="small" />
          </FooterSpinner>
        );
      }}
    />
  );
}
