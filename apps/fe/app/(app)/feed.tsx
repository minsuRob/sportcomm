import React, { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  View,
  Button,
  Text,
  Modal,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from "react-native";
import { useQuery } from "urql";

import { GET_POSTS } from "@/lib/graphql";
import FeedList from "@/components/FeedList";
import AuthForm from "@/components/AuthForm";
import { Post, PostType } from "@/components/PostCard";
import { User, getSession, clearSession } from "@/lib/auth";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";

// --- Type Definitions ---
interface GqlPost {
  id: string;
  content: string;
  createdAt: string;
  type: PostType;
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

export default function FeedScreen() {
  const { themed, theme } = useAppTheme();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [result, executeQuery] = useQuery<PostsQueryResponse>({
    query: GET_POSTS,
    variables: { input: { page: 1, limit: PAGE_SIZE } },
  });

  const { data, fetching, error } = result;

  useEffect(() => {
    const checkSession = async () => {
      const { user } = await getSession();
      if (user) setCurrentUser(user);
    };
    checkSession();
  }, []);

  useEffect(() => {
    if (data?.posts?.posts) {
      const newPosts: Post[] = data.posts.posts.map((p) => ({
        ...p,
        isLiked: false,
        isMock: false,
      }));

      if (data.posts.page === 1) {
        setPosts(newPosts);
      } else {
        setPosts((currentPosts) => {
          const postMap = new Map(currentPosts.map((p) => [p.id, p]));
          newPosts.forEach((p) => postMap.set(p.id, p));
          const mergedPosts = Array.from(postMap.values());
          return mergedPosts.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
      }
    }
    if (isRefreshing) setIsRefreshing(false);
  }, [data, isRefreshing]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    executeQuery({
      requestPolicy: "network-only",
      variables: { input: { page: 1, limit: PAGE_SIZE } },
    });
  }, [executeQuery]);

  const handleLoadMore = useCallback(() => {
    if (fetching || !data?.posts?.hasNext) return;
    const nextPage = (data?.posts?.page ?? 0) + 1;
    executeQuery({
      variables: { input: { page: nextPage, limit: PAGE_SIZE } },
    });
  }, [fetching, executeQuery, data]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setAuthModalVisible(false);
  };

  const handleLogout = async () => {
    await clearSession();
    setCurrentUser(null);
  };

  if (fetching && posts.length === 0 && !isRefreshing) {
    return (
      <View style={themed($centeredContainer)}>
        <ActivityIndicator size="large" color={theme.colors.text} />
      </View>
    );
  }

  if (error && posts.length === 0) {
    return (
      <View style={themed($centeredContainer)}>
        <Text style={themed($errorText)}>
          An error occurred while fetching the feed: {error.message}
        </Text>
        <Button
          title="Retry"
          onPress={handleRefresh}
          color={theme.colors.tint}
        />
      </View>
    );
  }

  const ListFooter = () => {
    if (!fetching || isRefreshing) return null;
    return (
      <View style={themed($listFooter)}>
        <ActivityIndicator size="small" color={theme.colors.text} />
      </View>
    );
  };

  return (
    <View style={themed($container)}>
      <Modal
        animationType="slide"
        transparent={true}
        visible={authModalVisible}
        onRequestClose={() => setAuthModalVisible(!authModalVisible)}
      >
        <View style={themed($modalOverlay)}>
          <View style={themed($modalContent)}>
            <AuthForm onLoginSuccess={handleLoginSuccess} />
          </View>
          <TouchableOpacity
            onPress={() => setAuthModalVisible(false)}
            style={themed($closeButton)}
          >
            <Text style={themed($closeButtonText)}>X</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <View style={themed($header)}>
        <Text style={themed($headerTitle)}>Feed</Text>
        {currentUser ? (
          <View style={themed($userContainer)}>
            <Text style={themed($userNickname)}>{currentUser.nickname}</Text>
            <Button
              title="Logout"
              onPress={handleLogout}
              color={theme.colors.tint}
            />
          </View>
        ) : (
          <TouchableOpacity onPress={() => setAuthModalVisible(true)}>
            <Text style={themed($loginText)}>Sign Up / Login</Text>
          </TouchableOpacity>
        )}
      </View>

      <FeedList
        posts={posts}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
        onEndReached={handleLoadMore}
        ListFooterComponent={ListFooter}
      />
    </View>
  );
}

// --- Styles ---

const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
});

const $centeredContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: colors.background,
  padding: 16,
});

const $errorText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
  fontSize: 18,
  textAlign: "center",
  marginBottom: 16,
});

const $header: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  padding: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
  backgroundColor: colors.background,
});

const $headerTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 20,
  fontWeight: "bold",
  color: colors.text,
});

const $userNickname: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.text,
  fontWeight: "600",
  marginRight: spacing.md,
});

const $loginText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  fontWeight: "600",
});

const $modalOverlay: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "rgba(0, 0, 0, 0.8)",
});

const $modalContent: ThemedStyle<ViewStyle> = () => ({
  width: "100%",
  maxWidth: 500,
  padding: 16,
});

const $closeButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: "absolute",
  top: 40,
  right: 20,
  backgroundColor: colors.background,
  borderRadius: 9999,
  padding: 8,
});

const $closeButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  fontWeight: "bold",
  fontSize: 18,
});

const $userContainer: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  alignItems: "center",
});

const $listFooter: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.md,
});
