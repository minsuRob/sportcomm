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
import { useQuery } from "@apollo/client";
import { useRouter } from "expo-router";

import { GET_POSTS, GET_BLOCKED_USERS } from "@/lib/graphql";
import FeedList from "@/components/FeedList";
import AuthForm from "@/components/AuthForm";
import { Post, PostType } from "@/components/PostCard";
import { User, getSession, clearSession } from "@/lib/auth";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { useTranslation, TRANSLATION_KEYS } from "@/lib/i18n/useTranslation";
import { Ionicons } from "@expo/vector-icons";
import StorySection from "@/components/StorySection";
import TabSlider from "@/components/TabSlider";
import ChatList from "@/components/chat/ChatList";
import {
  NotificationBadge,
  NotificationToast,
} from "@/components/notifications";

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
  const { t } = useTranslation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>("feed");

  const {
    data,
    loading: fetching,
    error,
    refetch,
    fetchMore,
  } = useQuery<PostsQueryResponse>(GET_POSTS, {
    variables: { input: { page: 1, limit: PAGE_SIZE } },
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "cache-and-network", // 캐시와 네트워크 모두 사용하여 최신 데이터 보장
  });

  // 차단된 사용자 목록 조회
  const { data: blockedUsersData, error: blockedUsersError } = useQuery<{
    getBlockedUsers: string[];
  }>(GET_BLOCKED_USERS, {
    errorPolicy: "all", // 에러와 데이터 모두 반환
    notifyOnNetworkStatusChange: false,
    onError: (error) => {
      console.warn("차단된 사용자 목록 조회 실패:", error.message);
    },
  });

  useEffect(() => {
    const checkSession = async () => {
      const { user } = await getSession();
      if (user) setCurrentUser(user);
    };
    checkSession();
  }, []);

  // 차단된 사용자 목록 업데이트
  useEffect(() => {
    if (blockedUsersData?.getBlockedUsers) {
      setBlockedUserIds(blockedUsersData.getBlockedUsers);
    } else if (blockedUsersError) {
      // 에러 발생 시 빈 배열로 초기화
      setBlockedUserIds([]);
    }
  }, [blockedUsersData, blockedUsersError]);

  useEffect(() => {
    if (data?.posts?.posts) {
      const newPosts: Post[] = data.posts.posts
        .filter((p) => !blockedUserIds.includes(p.author.id)) // 차단된 사용자 게시물 필터링
        .map((p) => ({
          ...p,
          // 서버에서 받은 실제 isLiked 상태 유지 (강제로 false 설정하지 않음)
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
  }, [data, isRefreshing, blockedUserIds]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    refetch({
      input: { page: 1, limit: PAGE_SIZE },
    });
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    if (fetching || !data?.posts?.hasNext) return;
    const nextPage = (data?.posts?.page ?? 0) + 1;
    fetchMore({
      variables: { input: { page: nextPage, limit: PAGE_SIZE } },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;
        return fetchMoreResult;
      },
    });
  }, [fetching, fetchMore, data]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setAuthModalVisible(false);
  };

  const handleLogout = async () => {
    await clearSession();
    setCurrentUser(null);
  };

  /**
   * 알림 버튼 클릭 핸들러
   */
  const handleNotificationPress = () => {
    router.push("/(details)/notifications");
  };

  /**
   * 알림 토스트 클릭 핸들러
   */
  const handleNotificationToastPress = (notification: any) => {
    // 알림 타입에 따라 적절한 화면으로 이동
    if (notification.post) {
      router.push({
        pathname: "/(details)/post/[postId]",
        params: { postId: notification.post.id },
      });
    } else if (notification.user) {
      router.push({
        pathname: "/(details)/profile/[userId]",
        params: { userId: notification.user.id },
      });
    }
  };

  // 게시물 작성 완료 후 피드 새로고침을 위한 useEffect
  useEffect(() => {
    const handleFocus = () => {
      // 페이지로 돌아왔을 때 피드 새로고침
      handleRefresh();
    };

    // 페이지 포커스 이벤트 리스너 (필요시 추가)
    // navigation.addListener('focus', handleFocus);

    return () => {
      // cleanup
    };
  }, [handleRefresh]);

  if (fetching && posts.length === 0 && !isRefreshing) {
    return (
      <View style={themed($centeredContainer)}>
        <ActivityIndicator size="large" color={theme.colors.text} />
        <Text style={themed($loadingText)}>
          {t(TRANSLATION_KEYS.FEED_LOADING_POSTS)}
        </Text>
      </View>
    );
  }

  if (error && posts.length === 0) {
    return (
      <View style={themed($centeredContainer)}>
        <Text style={themed($errorText)}>
          {t(TRANSLATION_KEYS.FEED_ERROR_FETCHING, { message: error.message })}
        </Text>
        <Button
          title={t(TRANSLATION_KEYS.COMMON_RETRY)}
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

  // 탭 데이터
  const tabs = [
    { key: "feed", title: "Feed" },
    { key: "chat", title: "Chat" },
  ];

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
            <Text style={themed($closeButtonText)}>
              {t(TRANSLATION_KEYS.COMMON_CLOSE)}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* 헤더 */}
      <View style={themed($header)}>
        <View style={themed($headerLeft)}>
          <Text style={themed($logoText)}>SportComm</Text>
        </View>
        <Text style={themed($headerTitle)}>Home</Text>
        <View style={themed($headerRight)}>
          {currentUser && (
            <>
              {/* 알림 버튼 */}
              <TouchableOpacity
                style={themed($notificationButton)}
                onPress={handleNotificationPress}
              >
                <Ionicons
                  name="notifications-outline"
                  size={22}
                  color={theme.colors.text}
                />
                <NotificationBadge size="small" />
              </TouchableOpacity>

              {/* 게시물 작성 버튼 */}
              <TouchableOpacity
                style={themed($createButton)}
                onPress={() => router.push("/(modals)/create-post")}
              >
                <Ionicons
                  name="add-outline"
                  size={22}
                  color={theme.colors.text}
                />
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity
            style={themed($profileButton)}
            onPress={() =>
              currentUser
                ? router.push("/(app)/profile")
                : setAuthModalVisible(true)
            }
          >
            <Ionicons
              name={currentUser ? "person" : "person-outline"}
              size={22}
              color={theme.colors.text}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* 로그인 버튼 섹션 (로그인 안 된 경우에만 표시) */}
      {!currentUser && (
        <View style={themed($loginContainer)}>
          <TouchableOpacity
            style={themed($loginButton)}
            onPress={() => setAuthModalVisible(true)}
          >
            <Ionicons name="log-in-outline" size={18} color="#fff" />
            <Text style={themed($loginButtonText)}>
              {t(TRANSLATION_KEYS.AUTH_SIGNUP_LOGIN)}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 탭 슬라이더 */}
      <TabSlider tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* 스토리 섹션 (Feed 탭에서만 표시) */}
      {activeTab === "feed" && currentUser && <StorySection />}

      {/* 탭 콘텐츠 */}
      {activeTab === "feed" ? (
        <FeedList
          posts={posts}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          onEndReached={handleLoadMore}
          ListFooterComponent={ListFooter}
        />
      ) : (
        <ChatList
          messages={[]}
          currentUser={currentUser}
          isLoading={false}
          title="채팅"
        />
      )}

      {/* 실시간 알림 토스트 */}
      {currentUser && (
        <NotificationToast
          onPress={handleNotificationToastPress}
          position="top"
          duration={4000}
        />
      )}
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

const $loadingText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  marginTop: spacing.md,
  color: colors.text,
  fontSize: 16,
});

const $header: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
  backgroundColor: colors.card,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $headerLeft: ThemedStyle<ViewStyle> = () => ({
  width: 100,
  justifyContent: "center",
});

const $headerTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
  fontWeight: "bold",
  color: colors.text,
  flex: 1,
  textAlign: "center",
});

const $logoText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
  fontWeight: "900",
  color: colors.tint,
  fontStyle: "italic",
});

const $headerRight: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: spacing.xs,
});

const $loginContainer: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  flexDirection: "row",
  justifyContent: "center",
  gap: spacing.md,
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
  backgroundColor: colors.backgroundAlt,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $loginButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.tint,
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.sm,
  borderRadius: 12,
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: spacing.sm,
  shadowColor: colors.tint,
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.3,
  shadowRadius: 4,
  elevation: 5,
});

const $loginButtonText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 16,
  fontWeight: "700",
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

const $listFooter: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.md,
});

const $createButton: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: colors.backgroundAlt,
  justifyContent: "center",
  alignItems: "center",
});

const $notificationButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: colors.backgroundAlt,
  justifyContent: "center",
  alignItems: "center",
  position: "relative",
});

const $profileButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: colors.backgroundAlt,
  justifyContent: "center",
  alignItems: "center",
});
