import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  ViewStyle,
  TextStyle,
  ImageStyle,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@apollo/client";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { User, getSession } from "@/lib/auth";
import { useRouter } from "expo-router";
import {
  GET_USER_PROFILE,
  GET_USER_POSTS,
  GET_USER_BOOKMARKS,
} from "@/lib/graphql";
import FeedList from "@/components/FeedList";
import TabSlider from "@/components/TabSlider";
import type { Post } from "@/components/PostCard";
// WebCenteredLayout 제거 - 전역 레이아웃 사용

// 사용자 프로필 데이터 타입
interface UserProfile {
  id: string;
  nickname: string;
  email: string;
  profileImageUrl?: string;
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
  postCount: number;
}

/**
 * 프로필 화면 컴포넌트
 * 사용자의 프로필 정보와 작성한 게시물을 표시합니다
 */
export default function ProfileScreen() {
  const { themed, theme } = useAppTheme();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<string>("posts");
  const router = useRouter();

  // 탭 설정
  const tabs = [
    { key: "posts", title: "내 게시물" },
    { key: "bookmarks", title: "북마크" },
  ];

  // 사용자 프로필 데이터 조회
  const {
    data: profileData,
    loading: profileLoading,
    refetch: refetchProfile,
  } = useQuery<{ getUserById: UserProfile }>(GET_USER_PROFILE, {
    variables: { userId: currentUser?.id },
    skip: !currentUser?.id, // currentUser가 없으면 쿼리 중단
    fetchPolicy: "network-only", // 캐시를 사용하지 않고 항상 네트워크 요청
  });

  // 사용자의 게시물 목록 조회
  const {
    data: postsData,
    loading: postsLoading,
    refetch: refetchPosts,
  } = useQuery<{
    posts: { posts: Post[] };
  }>(GET_USER_POSTS, {
    variables: { input: { authorId: currentUser?.id } },
    skip: !currentUser?.id,
    fetchPolicy: "network-only",
  });

  // 사용자의 북마크 목록 조회
  const {
    data: bookmarksData,
    loading: bookmarksLoading,
    refetch: refetchBookmarks,
  } = useQuery<{
    getUserBookmarks: Post[];
  }>(GET_USER_BOOKMARKS, {
    variables: { userId: currentUser?.id },
    skip: !currentUser?.id,
    fetchPolicy: "network-only",
  });

  useEffect(() => {
    const loadUserProfile = async () => {
      const { user } = await getSession();
      if (user) setCurrentUser(user);
    };
    loadUserProfile();
  }, []);

  // 사용자 정보가 변경되면 프로필 및 게시물 쿼리 다시 실행
  useEffect(() => {
    if (currentUser?.id) {
      refetchProfile();
      refetchPosts();
      refetchBookmarks();
    }
  }, [currentUser?.id, refetchProfile, refetchPosts, refetchBookmarks]);

  // 게시물 데이터가 변경되면 상태 업데이트
  useEffect(() => {
    if (postsData?.posts?.posts) {
      setUserPosts(postsData.posts.posts);
    }
  }, [postsData]);

  // 북마크 데이터가 변경되면 상태 업데이트
  useEffect(() => {
    if (bookmarksData?.getUserBookmarks) {
      setBookmarkedPosts(bookmarksData.getUserBookmarks);
    }
  }, [bookmarksData]);

  const handleEditProfile = () => {
    router.push("/(modals)/edit-profile");
  };

  const handleSettings = () => {
    router.push("/(modals)/settings");
  };

  const handleFollowersPress = () => {
    if (currentUser?.id) {
      router.push(`/(details)/followers?userId=${currentUser.id}`);
    }
  };

  const handleFollowingPress = () => {
    if (currentUser?.id) {
      router.push(`/(details)/following?userId=${currentUser.id}`);
    }
  };

  const handleTeamSelection = () => {
    router.push("/(modals)/team-selection");
  };

  const handleAdminDashboard = () => {
    router.push("/(admin)/dashboard");
  };

  /**
   * 탭 변경 핸들러
   */
  const handleTabChange = (tabKey: string) => {
    setActiveTab(tabKey);
  };

  /**
   * 현재 활성 탭에 따른 게시물 목록 반환
   */
  const getCurrentPosts = (): Post[] => {
    return activeTab === "posts" ? userPosts : bookmarkedPosts;
  };

  /**
   * 현재 활성 탭에 따른 로딩 상태 반환
   */
  const getCurrentLoading = (): boolean => {
    return activeTab === "posts" ? postsLoading : bookmarksLoading;
  };

  /**
   * 현재 활성 탭에 따른 빈 상태 메시지 반환
   */
  const getEmptyMessage = (): string => {
    return activeTab === "posts"
      ? "아직 작성한 게시물이 없습니다"
      : "아직 북마크한 게시물이 없습니다";
  };

  if (!currentUser) {
    return (
      <View style={themed($container)}>
        <View style={themed($loadingContainer)}>
          <Text style={themed($loadingText)}>프로필을 불러오는 중...</Text>
        </View>
      </View>
    );
  }

  // 프로필 데이터 (GraphQL 결과 또는 기본값)
  const userProfile = profileData?.getUserById || {
    id: currentUser.id,
    nickname: currentUser.nickname,
    email: currentUser.email || "",
    profileImageUrl: currentUser.profileImageUrl,
    isFollowing: false,
    followerCount: 0,
    followingCount: 0,
    postCount: 0,
  };

  const avatarUrl =
    userProfile.profileImageUrl ||
    `https://i.pravatar.cc/150?u=${userProfile.id}`;

  return (
    <View style={themed($container)}>
      {/* 헤더 - 전체 너비 사용 */}
      <View style={themed($header)}>
        <Text style={themed($headerTitle)}>프로필</Text>
        <TouchableOpacity onPress={handleSettings}>
          <Ionicons
            name="settings-outline"
            color={theme.colors.text}
            size={24}
          />
        </TouchableOpacity>
      </View>

      {/* 프로필 정보 - 전역 레이아웃 적용됨 */}
      {/* 프로필 정보 */}
      <View style={themed($profileSection)}>
        <Image source={{ uri: avatarUrl }} style={themed($profileImage)} />
        <Text style={themed($username)}>{userProfile.nickname}</Text>

        {/* 프로필 편집 및 팀 선택 버튼 */}
        <View style={themed($buttonContainer)}>
          <TouchableOpacity
            style={themed($editButton)}
            onPress={handleEditProfile}
          >
            <Ionicons
              name="create-outline"
              color={theme.colors.tint}
              size={16}
            />
            <Text style={themed($editButtonText)}>프로필 편집</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={themed($teamButton)}
            onPress={handleTeamSelection}
          >
            <Ionicons
              name="trophy-outline"
              color={theme.colors.tint}
              size={16}
            />
            <Text style={themed($teamButtonText)}>My Team</Text>
          </TouchableOpacity>

          {/* 관리자 전용 버튼 */}
          {currentUser?.role === "ADMIN" && (
            <TouchableOpacity
              style={themed($adminButton)}
              onPress={handleAdminDashboard}
            >
              <Ionicons name="settings-outline" color="#EF4444" size={16} />
              <Text style={themed($adminButtonText)}>관리자</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 통계 정보 */}
      <View style={themed($statsSection)}>
        <View style={themed($statItem)}>
          <Text style={themed($statNumber)}>{userProfile.postCount}</Text>
          <Text style={themed($statLabel)}>게시물</Text>
        </View>
        <TouchableOpacity
          style={themed($statItem)}
          onPress={handleFollowersPress}
        >
          <Text style={themed($statNumber)}>{userProfile.followerCount}</Text>
          <Text style={themed($statLabel)}>팔로워</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={themed($statItem)}
          onPress={handleFollowingPress}
        >
          <Text style={themed($statNumber)}>{userProfile.followingCount}</Text>
          <Text style={themed($statLabel)}>팔로잉</Text>
        </TouchableOpacity>
      </View>

      {/* 탭 슬라이더 */}
      <TabSlider
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {/* 게시물 목록 - FeedList가 직접 스크롤 처리 */}
      {getCurrentLoading() ? (
        <View style={themed($loadingContainer)}>
          <ActivityIndicator size="large" color={theme.colors.tint} />
        </View>
      ) : (
        <FeedList
          posts={getCurrentPosts()}
          ListEmptyComponent={
            <View style={themed($emptyState)}>
              <Text style={themed($emptyStateText)}>{getEmptyMessage()}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

// --- 스타일 정의 ---
const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
});

const $header: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.lg,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $headerTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 24,
  fontWeight: "bold",
  color: colors.text,
});

const $profileSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  padding: spacing.xl,
});

const $profileImage: ThemedStyle<ImageStyle> = () => ({
  width: 100,
  height: 100,
  borderRadius: 50,
});

const $username: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 24,
  fontWeight: "bold",
  color: colors.text,
  marginTop: spacing.md,
});

const $buttonContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  marginTop: spacing.lg,
  gap: spacing.sm,
});

const $editButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderWidth: 1,
  borderColor: colors.tint,
  borderRadius: 8,
  flex: 1,
  justifyContent: "center",
});

const $editButtonText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  marginLeft: spacing.xs,
  color: colors.tint,
  fontWeight: "600",
});

const $teamButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderWidth: 1,
  borderColor: colors.tint,
  borderRadius: 8,
  flex: 1,
  justifyContent: "center",
});

const $teamButtonText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  marginLeft: spacing.xs,
  color: colors.tint,
  fontWeight: "600",
});

const $adminButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderWidth: 1,
  borderColor: "#EF4444",
  borderRadius: 8,
  flex: 1,
  justifyContent: "center",
});

const $adminButtonText: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginLeft: spacing.xs,
  color: "#EF4444",
  fontWeight: "600",
});

const $statsSection: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-around",
  paddingVertical: spacing.lg,
  borderTopWidth: 1,
  borderBottomWidth: 1,
  borderColor: colors.border,
});

const $statItem: ThemedStyle<ViewStyle> = () => ({
  alignItems: "center",
});

const $statNumber: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 20,
  fontWeight: "bold",
  color: colors.text,
});

const $statLabel: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 14,
  color: colors.textDim,
  marginTop: spacing.xxxs,
});

const $emptyState: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  paddingVertical: spacing.xl,
});

const $emptyStateText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  color: colors.textDim,
});

const $loadingContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
});

const $loadingText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  color: colors.textDim,
});
