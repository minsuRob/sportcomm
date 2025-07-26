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
import { Settings, Edit3, Users, UserPlus } from "lucide-react-native";
import { useQuery } from "@apollo/client";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { User, getSession } from "@/lib/auth";
import { useRouter } from "expo-router";
import { GET_USER_PROFILE, GET_USER_POSTS } from "@/lib/graphql";
import FeedList from "@/components/FeedList";
import type { Post } from "@/components/PostCard";
import WebCenteredLayout from "@/components/layout/WebCenteredLayout";

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
  const router = useRouter();

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
    }
  }, [currentUser?.id, refetchProfile, refetchPosts]);

  // 게시물 데이터가 변경되면 상태 업데이트
  useEffect(() => {
    if (postsData?.posts?.posts) {
      setUserPosts(postsData.posts.posts);
    }
  }, [postsData]);

  const handleEditProfile = () => {
    // TODO: 프로필 편집 로직 구현
    console.log("프로필 편집");
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
          <Settings color={theme.colors.text} size={24} />
        </TouchableOpacity>
      </View>

      {/* 프로필 정보 - 웹에서 중앙 정렬 */}
      <WebCenteredLayout scrollable={false}>
        {/* 프로필 정보 */}
        <View style={themed($profileSection)}>
          <Image source={{ uri: avatarUrl }} style={themed($profileImage)} />
          <Text style={themed($username)}>{userProfile.nickname}</Text>

          {/* 프로필 편집 버튼 */}
          <TouchableOpacity
            style={themed($editButton)}
            onPress={handleEditProfile}
          >
            <Edit3 color={theme.colors.tint} size={16} />
            <Text style={themed($editButtonText)}>프로필 편집</Text>
          </TouchableOpacity>
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
            <Text style={themed($statNumber)}>
              {userProfile.followingCount}
            </Text>
            <Text style={themed($statLabel)}>팔로잉</Text>
          </TouchableOpacity>
        </View>

        {/* 내 게시물 섹션 제목 */}
        <View style={themed($postsSection)}>
          <Text style={themed($sectionTitle)}>내 게시물</Text>
        </View>
      </WebCenteredLayout>

      {/* 게시물 목록 - FeedList가 직접 스크롤 처리 */}
      {postsLoading ? (
        <View style={themed($loadingContainer)}>
          <ActivityIndicator size="large" color={theme.colors.tint} />
        </View>
      ) : (
        <FeedList
          posts={userPosts}
          ListEmptyComponent={
            <View style={themed($emptyState)}>
              <Text style={themed($emptyStateText)}>
                아직 작성한 게시물이 없습니다
              </Text>
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

const $editButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  marginTop: spacing.lg,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderWidth: 1,
  borderColor: colors.tint,
  borderRadius: 8,
});

const $editButtonText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  marginLeft: spacing.xs,
  color: colors.tint,
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

const $postsSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.md,
});

const $sectionTitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 18,
  fontWeight: "bold",
  color: colors.text,
  marginBottom: spacing.md,
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
