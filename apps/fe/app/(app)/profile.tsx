import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  ImageStyle,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@apollo/client";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { User, getSession, saveSession } from "@/lib/auth";
import { useRouter } from "expo-router";
import {
  GET_USER_PROFILE,
  GET_USER_POSTS,
  GET_USER_BOOKMARKS,
} from "@/lib/graphql";
import { type UserTeam } from "@/lib/graphql/teams";
import TeamLogo from "@/components/TeamLogo";
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
  bio?: string;
  comment?: string;
  age?: number;
  role: string; // 사용자 역할 필드 추가
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
  postCount: number;
  myTeams?: UserTeam[];
  // 확장된 필드 (포인트)
  points?: number;
  lastAttendanceAt?: string | null;
}

/**
 * 팬이 된 날짜부터 오늘까지의 기간을 년, 월, 일로 계산합니다.
 * @param favoriteDate 팬이 된 날짜 (ISO string)
 * @returns 년, 월, 총 일수 객체
 */
const formatFanDuration = (
  favoriteDate: string,
): { years: number; months: number; totalDays: number } => {
  const startDate = new Date(favoriteDate);
  const today = new Date();

  // 시간, 분, 초를 0으로 설정하여 날짜만 비교
  startDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - startDate.getTime();
  const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let years = today.getFullYear() - startDate.getFullYear();
  let months = today.getMonth() - startDate.getMonth();

  if (months < 0 || (months === 0 && today.getDate() < startDate.getDate())) {
    years--;
    months += 12;
  }

  return { years, months, totalDays };
};

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

  // 팀별 경험치/레벨 기능 제거됨 (이관 준비 단계)
  // 추후 재도입 시 primary team 기반 계산 로직을 별도 훅으로 분리 예정.

  // 사용자 프로필 데이터 조회
  const { data: profileData, refetch: refetchProfile } = useQuery<{
    getUserById: UserProfile;
  }>(GET_USER_PROFILE, {
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

  // 프로필 데이터가 로드되면 사용자 정보 업데이트
  useEffect(() => {
    if (profileData?.getUserById) {
      // GraphQL에서 가져온 사용자 정보와 세션의 사용자 정보를 병합
      const updatedUser = {
        ...currentUser,
        ...profileData.getUserById,
      };

      // 세션 업데이트
      saveSession(updatedUser);
      // 현재 사용자 상태 업데이트
      setCurrentUser(updatedUser);
    }
  }, [profileData?.getUserById]);

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
    bio: currentUser.bio,
    age: currentUser.age,
    role: currentUser.role || "USER", // 기본값 설정
    isFollowing: false,
    followerCount: 0,
    followingCount: 0,
    postCount: 0,
  };

  // 아바타 URL 정규화: 기존 post-images 경로가 남아 있으면 avatars 버킷 경로로 교체
  const normalizeAvatarUrl = (url?: string) => {
    if (!url) return undefined;
    return url.includes("/post-images/")
      ? url.replace("/post-images/", "/avatars/")
      : url;
  };
  const avatarUrl =
    normalizeAvatarUrl(userProfile.profileImageUrl) ||
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
        {userProfile.comment && (
          <Text style={themed($userComment)}>{userProfile.comment}</Text>
        )}
        {/* 연령대 배지 표시 */}
        {userProfile?.age || currentUser?.age ? (
          <View style={themed($ageBadge)}>
            <Text style={themed($ageBadgeText)}>
              {(() => {
                const age = (userProfile?.age || currentUser?.age) as number;
                if (age >= 40) return `40+ 🟪`;
                if (age >= 30) return `30-35 🟦`;
                if (age >= 26) return `26-29 🟩`;
                if (age >= 21) return `20-25 🟨`;
                if (age >= 16) return `16-20 🟧`;
                if (age >= 10) return `10-15 🟥`;
                return `${age}`;
              })()}
            </Text>
          </View>
        ) : null}

        {/* 팀별 경험치 Progress UI 제거됨 */}

        {/* 팀 정보 표시 */}
        {userProfile.myTeams && userProfile.myTeams.length > 0 ? (
          <View style={themed($teamsContainer)}>
            {userProfile.myTeams
              .sort((a, b) => a.priority - b.priority)
              .map((userTeam) => (
                <View key={userTeam.id} style={themed($teamItem)}>
                  <TeamLogo
                    logoUrl={userTeam.team.logoUrl}
                    fallbackIcon={userTeam.team.icon}
                    teamName={userTeam.team.name}
                    size={24}
                  />
                  {/* 팀명과 일수 */}
                  <Text style={themed($teamInfo)}>
                    {userTeam.team.name}
                    {userTeam.favoriteDate && (
                      <Text style={themed($teamYear)}>
                        {" "}
                        {formatFanDuration(userTeam.favoriteDate).years > 0
                          ? `${formatFanDuration(userTeam.favoriteDate).years}년째`
                          : `${formatFanDuration(userTeam.favoriteDate).months}개월째`}
                        <Text style={themed($teamDays)}>
                          {" "}
                          ({formatFanDuration(userTeam.favoriteDate).totalDays}
                          일)
                        </Text>
                      </Text>
                    )}
                  </Text>
                </View>
              ))}
          </View>
        ) : (
          <Text style={themed($noTeamText)}>아직 선택한 팀이 없습니다</Text>
        )}

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
          {userProfile.role === "ADMIN" && (
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

const $userComment: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 16,
  color: colors.textDim,
  marginTop: spacing.xs,
  fontStyle: "italic",
  textAlign: "center",
  lineHeight: 22,
});

const $ageBadge: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  marginTop: spacing.xs,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xxs,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.card,
});

const $ageBadgeText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.text,
  fontWeight: "600",
});

// 팀 정보 스타일들
const $teamsContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.md,
  alignItems: "center",
  gap: spacing.sm,
});

const $teamItem: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: colors.backgroundAlt,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.border,
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 2,
  elevation: 2,
});

const $teamInfo: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  fontWeight: "600",
  color: colors.text,
});

const $teamYear: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  fontWeight: "400",
  color: colors.textDim,
});

const $teamDays: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 11,
  fontWeight: "400",
  color: colors.textDim,
});

const $noTeamText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 14,
  color: colors.textDim,
  marginTop: spacing.md,
  fontStyle: "italic",
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
