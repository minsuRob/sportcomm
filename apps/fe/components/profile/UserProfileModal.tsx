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
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "@apollo/client";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { User, getSession } from "@/lib/auth";
import { useRouter } from "expo-router";
import { GET_USER_PROFILE, GET_USER_POSTS, TOGGLE_FOLLOW } from "@/lib/graphql";
import { type UserTeam } from "@/lib/graphql/teams";
import TeamLogo from "@/components/TeamLogo";
import FeedList from "@/components/FeedList";
import TabSlider from "@/components/TabSlider";
import type { Post } from "@/components/PostCard";
import Toast from "react-native-toast-message";
import { useTranslation, TRANSLATION_KEYS } from "@/lib/i18n/useTranslation";

// 사용자 프로필 데이터 타입
interface UserProfile {
  id: string;
  nickname: string;
  email: string;
  profileImageUrl?: string;
  bio?: string;
  age?: number;
  role: string;
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
  postCount: number;
  myTeams?: UserTeam[];
}

interface UserProfileModalProps {
  userId: string;
  onClose?: () => void;
}

/**
 * 팬이 된 날짜부터 오늘까지의 기간을 년, 월, 일로 계산합니다.
 */
const formatFanDuration = (
  favoriteDate: string
): { years: number; months: number; totalDays: number } => {
  const startDate = new Date(favoriteDate);
  const today = new Date();

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
 * 다른 사용자의 프로필을 표시하는 모달 컴포넌트
 * 팔로우/언팔로우, DM 시작, 게시물 목록 등의 기능을 제공합니다
 */
export default function UserProfileModal({
  userId,
  onClose,
}: UserProfileModalProps) {
  const { themed, theme } = useAppTheme();
  const { t } = useTranslation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<string>("posts");
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const router = useRouter();

  // 탭 설정
  const tabs = [{ key: "posts", title: "게시물" }];

  // 현재 사용자 정보 로드
  useEffect(() => {
    const loadCurrentUser = async () => {
      const { user } = await getSession();
      if (user) setCurrentUser(user);
    };
    loadCurrentUser();
  }, []);

  // 사용자 프로필 데이터 조회
  const {
    data: profileData,
    loading: profileLoading,
    refetch: refetchProfile,
  } = useQuery<{
    getUserById: UserProfile;
  }>(GET_USER_PROFILE, {
    variables: { userId },
    fetchPolicy: "network-only",
  });

  // 사용자의 게시물 목록 조회
  const {
    data: postsData,
    loading: postsLoading,
    refetch: refetchPosts,
  } = useQuery<{
    posts: { posts: Post[] };
  }>(GET_USER_POSTS, {
    variables: { input: { authorId: userId } },
    fetchPolicy: "network-only",
  });

  // 팔로우 토글 뮤테이션
  const [toggleFollow, { loading: followLoading }] = useMutation(TOGGLE_FOLLOW);

  // 프로필 데이터가 로드되면 팔로우 상태 업데이트
  useEffect(() => {
    if (profileData?.getUserById) {
      setIsFollowing(profileData.getUserById.isFollowing);
    }
  }, [profileData?.getUserById]);

  // 게시물 데이터가 변경되면 상태 업데이트
  useEffect(() => {
    if (postsData?.posts?.posts) {
      setUserPosts(postsData.posts.posts);
    }
  }, [postsData]);

  /**
   * 팔로우/언팔로우 핸들러
   */
  const handleFollowToggle = async () => {
    if (!currentUser?.id) {
      Toast.show({
        type: "error",
        text1: "로그인 필요",
        text2: "팔로우하려면 로그인이 필요합니다.",
        visibilityTime: 3000,
      });
      return;
    }

    if (currentUser.id === userId) return;

    const previousIsFollowing = isFollowing;
    setIsFollowing(!previousIsFollowing);

    try {
      const result = await toggleFollow({
        variables: { userId },
      });

      if (result.errors || !result.data) {
        setIsFollowing(previousIsFollowing);
        Toast.show({
          type: "error",
          text1: t(TRANSLATION_KEYS.POST_FOLLOW_ERROR),
          text2: result.errors?.[0]?.message || "An unknown error occurred.",
          visibilityTime: 3000,
        });
        return;
      }

      const newIsFollowing = result.data.toggleFollow;
      setIsFollowing(newIsFollowing);

      Toast.show({
        type: "success",
        text1: "성공",
        text2: newIsFollowing
          ? t(TRANSLATION_KEYS.POST_FOLLOW_SUCCESS)
          : t(TRANSLATION_KEYS.POST_UNFOLLOW_SUCCESS),
        visibilityTime: 2000,
      });

      // 프로필 데이터 새로고침
      refetchProfile();
    } catch (error) {
      setIsFollowing(previousIsFollowing);
      Toast.show({
        type: "error",
        text1: t(TRANSLATION_KEYS.POST_FOLLOW_ERROR),
        text2: "An unexpected error occurred while processing your request.",
        visibilityTime: 3000,
      });
    }
  };

  /**
   * DM 시작 핸들러
   */
  const handleStartDM = async () => {
    if (!currentUser?.id) {
      Toast.show({
        type: "error",
        text1: "로그인 필요",
        text2: "메시지를 보내려면 로그인이 필요합니다.",
        visibilityTime: 3000,
      });
      return;
    }

    if (currentUser.id === userId) return;

    try {
      // 1대1 채팅 시작 로직 (기존 구현 활용)
      router.push(`/(modals)/start-private-chat?targetUserId=${userId}`);
      onClose?.();
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "오류",
        text2: "메시지를 시작할 수 없습니다.",
        visibilityTime: 3000,
      });
    }
  };

  /**
   * 팔로워 목록 보기
   */
  const handleFollowersPress = () => {
    router.push(`/(details)/followers?userId=${userId}`);
    onClose?.();
  };

  /**
   * 팔로잉 목록 보기
   */
  const handleFollowingPress = () => {
    router.push(`/(details)/following?userId=${userId}`);
    onClose?.();
  };

  /**
   * 탭 변경 핸들러
   */
  const handleTabChange = (tabKey: string) => {
    setActiveTab(tabKey);
  };

  if (profileLoading) {
    return (
      <View style={themed($container)}>
        <View style={themed($loadingContainer)}>
          <ActivityIndicator size="large" color={theme.colors.tint} />
          <Text style={themed($loadingText)}>프로필을 불러오는 중...</Text>
        </View>
      </View>
    );
  }

  if (!profileData?.getUserById) {
    return (
      <View style={themed($container)}>
        <View style={themed($errorContainer)}>
          <Text style={themed($errorText)}>사용자를 찾을 수 없습니다.</Text>
          <TouchableOpacity style={themed($closeButton)} onPress={onClose}>
            <Text style={themed($closeButtonText)}>닫기</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const userProfile = profileData.getUserById;
  const avatarUrl =
    userProfile.profileImageUrl ||
    `https://i.pravatar.cc/150?u=${userProfile.id}`;
  const isOwnProfile = currentUser?.id === userId;

  return (
    <View style={themed($container)}>
      {/* 헤더 */}
      <View style={themed($header)}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="arrow-back" color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={themed($headerTitle)}>{userProfile.nickname}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={themed($scrollContainer)}
        showsVerticalScrollIndicator={false}
      >
        {/* 프로필 정보 */}
        <View style={themed($profileSection)}>
          <Image source={{ uri: avatarUrl }} style={themed($profileImage)} />
          <Text style={themed($username)}>{userProfile.nickname}</Text>

          {/* 연령대 배지 표시 */}
          {userProfile.age && (
            <View style={themed($ageBadge)}>
              <Text style={themed($ageBadgeText)}>
                {(() => {
                  const age = userProfile.age;
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
          )}

          {/* 바이오 */}
          {userProfile.bio && (
            <Text style={themed($bio)}>{userProfile.bio}</Text>
          )}

          {/* 팀 정보 표시 */}
          {userProfile.myTeams && userProfile.myTeams.length > 0 ? (
            <View style={themed($teamsContainer)}>
              {userProfile.myTeams
                .slice()
                .sort((a, b) => a.priority - b.priority)
                .map((userTeam) => (
                  <View key={userTeam.id} style={themed($teamItem)}>
                    <TeamLogo
                      logoUrl={userTeam.team.logoUrl}
                      fallbackIcon={userTeam.team.icon}
                      teamName={userTeam.team.name}
                      size={24}
                    />
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
                            (
                            {formatFanDuration(userTeam.favoriteDate).totalDays}
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

          {/* 액션 버튼들 */}
          {!isOwnProfile && (
            <View style={themed($buttonContainer)}>
              <TouchableOpacity
                style={themed(isFollowing ? $followingButton : $followButton)}
                onPress={handleFollowToggle}
                disabled={followLoading}
              >
                {followLoading ? (
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.background}
                  />
                ) : (
                  <>
                    <Ionicons
                      name={isFollowing ? "person-remove" : "person-add"}
                      color={
                        isFollowing
                          ? theme.colors.text
                          : theme.colors.background
                      }
                      size={16}
                    />
                    <Text
                      style={themed(
                        isFollowing ? $followingButtonText : $followButtonText
                      )}
                    >
                      {isFollowing ? "팔로잉" : "팔로우"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={themed($dmButton)}
                onPress={handleStartDM}
              >
                <Ionicons
                  name="chatbubble-outline"
                  color={theme.colors.tint}
                  size={16}
                />
                <Text style={themed($dmButtonText)}>메시지</Text>
              </TouchableOpacity>
            </View>
          )}
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

        {/* 탭 슬라이더 */}
        <TabSlider
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />

        {/* 게시물 목록 */}
        {postsLoading ? (
          <View style={themed($loadingContainer)}>
            <ActivityIndicator size="large" color={theme.colors.tint} />
          </View>
        ) : (
          <View style={themed($postsContainer)}>
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
          </View>
        )}
      </ScrollView>
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
  fontSize: 18,
  fontWeight: "600",
  color: colors.text,
});

const $scrollContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
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

const $bio: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 16,
  color: colors.textDim,
  textAlign: "center",
  marginTop: spacing.sm,
  paddingHorizontal: spacing.md,
  lineHeight: 22,
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

const $followButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  backgroundColor: colors.tint,
  borderRadius: 8,
  flex: 1,
  justifyContent: "center",
});

const $followButtonText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  marginLeft: spacing.xs,
  color: colors.background,
  fontWeight: "600",
});

const $followingButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.card,
  borderRadius: 8,
  flex: 1,
  justifyContent: "center",
});

const $followingButtonText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  marginLeft: spacing.xs,
  color: colors.text,
  fontWeight: "600",
});

const $dmButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
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

const $dmButtonText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
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
  marginHorizontal: spacing.md,
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

const $postsContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  paddingHorizontal: spacing.md,
});

const $emptyState: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  paddingVertical: spacing.xl,
});

const $emptyStateText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  color: colors.textDim,
});

const $loadingContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingVertical: spacing.xl,
});

const $loadingText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 16,
  color: colors.textDim,
  marginTop: spacing.sm,
});

const $errorContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: spacing.xl,
});

const $errorText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 18,
  color: colors.text,
  textAlign: "center",
  marginBottom: spacing.lg,
});

const $closeButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.sm,
  backgroundColor: colors.tint,
  borderRadius: 8,
});

const $closeButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.background,
  fontWeight: "600",
});
