import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  View,
  Button,
  Text,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from "react-native";
import { useRouter } from "expo-router";

import FeedList from "@/components/FeedList";
import { User, clearSession } from "@/lib/auth";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { useTranslation, TRANSLATION_KEYS } from "@/lib/i18n/useTranslation";
import { Ionicons } from "@expo/vector-icons";
import StorySection from "@/components/StorySection";
import TabSlider from "@/components/TabSlider";
import ChatRoomList from "@/components/chat/ChatRoomList";
import { NotificationToast } from "@/components/notifications";
import { showToast } from "@/components/CustomToast";

import FeedHeader from "@/components/feed/FeedHeader";
import AuthModal from "@/components/feed/AuthModal";
import ListFooter from "@/components/feed/ListFooter";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useChatRooms } from "@/lib/hooks/useChatRooms";
import { useFeedPosts } from "@/lib/hooks/useFeedPosts";

// --- Type Definitions ---

export default function FeedScreen() {
  const { themed, theme } = useAppTheme();
  const { t } = useTranslation();
  // 목록/로딩 상태는 전담 훅에서 관리
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const router = useRouter();
  const { currentUser, reload: reloadCurrentUser } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<string>("feed");
  const {
    posts,
    fetching,
    error,
    isRefreshing,
    handleRefresh,
    handleLoadMore,
    selectedTeamIds,
    handleTeamFilterChange,
  } = useFeedPosts();

  const {
    chatRooms,
    isLoading: chatRoomsLoading,
    loadChatRooms,
    lastError,
  } = useChatRooms({ autoLoad: true });

  useEffect(() => {
    if (lastError) {
      showToast({
        type: "error",
        title: "채팅방 로드 실패",
        message: "채팅방 목록을 불러오는데 실패했습니다.",
        duration: 3000,
      });
    }
  }, [lastError]);

  const handleLoginSuccess = () => {
    setAuthModalVisible(false);
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
      router.push("/(app)/profile");
    }
  };

  // 팀 필터 선택 핸들러는 useFeedPosts 훅에서 제공됨

  // 목록 재조회 효과는 훅 내부에서 처리됨

  // 게시물 작성 완료 후 피드 새로고침을 위한 useEffect
  useEffect(() => {
    // 페이지 포커스 이벤트 리스너 (필요시 추가)
    // navigation.addListener('focus', handleRefresh);

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

  const footerLoading = fetching && !isRefreshing;

  // 탭 데이터
  const tabs = [
    { key: "feed", title: "Feed" },
    { key: "chat", title: "Chat" },
  ];

  return (
    <View style={themed($container)}>
      <AuthModal
        visible={authModalVisible}
        onClose={() => setAuthModalVisible(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* 헤더 */}
      <FeedHeader
        currentUser={currentUser}
        selectedTeamIds={selectedTeamIds}
        onTeamSelect={handleTeamFilterChange}
        onNotificationPress={handleNotificationPress}
        onCreatePress={() => router.push("/(modals)/create-post")}
        onProfilePress={() =>
          currentUser
            ? router.push("/(app)/profile")
            : setAuthModalVisible(true)
        }
      />

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

      {/* 탭 콘텐츠 - flex: 1로 전체 공간 차지 */}
      <View style={themed($contentContainer)}>
        {activeTab === "feed" ? (
          <FeedList
            posts={posts}
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            onEndReached={handleLoadMore}
            ListFooterComponent={<ListFooter loading={footerLoading} />}
          />
        ) : (
          <ChatRoomList
            currentUser={currentUser}
            showHeader={false}
            mockRooms={
              currentUser?.isAdmin
                ? []
                : chatRooms.map((r) => ({
                    id: r.id,
                    name: r.name,
                    description: r.description,
                    isPrivate: r.isPrivate,
                    type: r.type as "PUBLIC" | "GROUP" | "PRIVATE" | undefined,
                    isRoomActive: r.isRoomActive ?? true,
                    maxParticipants: r.maxParticipants ?? 0,
                    currentParticipants: r.currentParticipants ?? 0,
                    lastMessage: r.lastMessage ?? undefined,
                    lastMessageAt: r.lastMessageAt ?? undefined,
                    unreadCount: r.unreadCount ?? 0,
                    members: [],
                    createdAt: r.createdAt ?? new Date().toISOString(),
                  }))
            }
            isLoading={chatRoomsLoading}
            onRefresh={loadChatRooms}
          />
        )}
      </View>

      {/* 실시간 알림 토스트 */}
      {currentUser && (
        <NotificationToast
          onPress={handleNotificationToastPress}
          position="top"
          duration={4000}
        />
      )}

      {/* 게시물 작성 플로팅 버튼 */}
      {currentUser && (
        <TouchableOpacity
          style={themed($createPostButton)}
          onPress={() => router.push("/(modals)/create-post")}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="white" />
        </TouchableOpacity>
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

const $contentContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $createPostButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  position: "absolute",
  bottom: spacing.xl,
  right: spacing.md,
  width: 56,
  height: 56,
  borderRadius: 28,
  backgroundColor: colors.tint,
  justifyContent: "center",
  alignItems: "center",
  shadowColor: colors.tint,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 8,
  zIndex: 1000,
});

// 헤더/모달/푸터 관련 스타일은 분리된 컴포넌트 내부로 이동
