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
  ImageBackground,
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
  const { data: postsData, loading: postsLoading } = useQuery<{
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
  const backgroundImageUrl = "https://picsum.photos/seed/picsum/400/200"; // Placeholder

  return (
    <ScrollView style={themed($container)} showsVerticalScrollIndicator={false}>
      <ImageBackground
        source={{ uri: backgroundImageUrl }}
        style={themed($backgroundImage)}
      >
        <TouchableOpacity style={themed($backButton)} onPress={onClose}>
          <Ionicons name="arrow-back" color={"#fff"} size={24} />
        </TouchableOpacity>
      </ImageBackground>

      <View style={themed($mainContent)}>
        <View style={themed($profileCard)}>
          <Image source={{ uri: avatarUrl }} style={themed($profileImage)} />
          <View style={themed($infoContainer)}>
            <Text style={themed($username)}>{userProfile.nickname}</Text>
            <Text style={themed($userDescription)}>
              Certified Brand Ambassador
            </Text>
            {userProfile.myTeams && userProfile.myTeams.length > 0 && (
              <View style={themed($teamLogoContainer)}>
                <TeamLogo
                  logoUrl={userProfile.myTeams[0].team.logoUrl}
                  fallbackIcon={userProfile.myTeams[0].team.icon}
                  teamName={userProfile.myTeams[0].team.name}
                  size={32}
                />
              </View>
            )}
          </View>
        </View>

        {!isOwnProfile && (
          <View style={themed($buttonContainer)}>
            <TouchableOpacity
              style={themed($saveContactButton)}
              onPress={handleFollowToggle}
              disabled={followLoading}
            >
              {followLoading ? (
                <ActivityIndicator size="small" color={theme.colors.text} />
              ) : (
                <Text style={themed($saveContactButtonText)}>
                  {isFollowing ? "Following" : "Save contact"}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={themed($exchangeContactButton)}
              onPress={handleStartDM}
            >
              <Text style={themed($exchangeContactButtonText)}>
                Exchange Contact
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={themed($contentContainer)}>
          {userProfile.bio && (
            <View style={themed($aboutSection)}>
              <Text style={themed($sectionTitle)}>About</Text>
              <Text style={themed($bioText)}>{userProfile.bio}</Text>
            </View>
          )}

          <TabSlider
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />

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
        </View>
      </View>
    </ScrollView>
  );
}

// --- 스타일 정의 ---
const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
});

const $backgroundImage: ThemedStyle<ImageStyle> = () => ({
  height: 200,
  justifyContent: "flex-start",
  padding: 16,
});

const $backButton: ThemedStyle<ViewStyle> = () => ({
  alignSelf: "flex-start",
  padding: 8,
  borderRadius: 20,
  backgroundColor: "rgba(0,0,0,0.4)",
});

const $mainContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  marginTop: -80, // 프로필 카드를 배경 이미지 위로 올림
});

const $profileCard: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flexDirection: "row",
  alignItems: "flex-end",
  borderRadius: 16,
  overflow: "hidden",
});

const $profileImage: ThemedStyle<ImageStyle> = () => ({
  width: 140,
  height: 140,
  borderWidth: 4,
  borderColor: "#fff",
  borderRadius: 16,
});

const $infoContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  backgroundColor: "#000",
  padding: spacing.md,
  height: 120,
  flex: 1,
  justifyContent: "center",
  borderTopRightRadius: 16,
  borderBottomRightRadius: 16,
});

const $username: ThemedStyle<TextStyle> = () => ({
  color: "#fff",
  fontSize: 24,
  fontWeight: "bold",
});

const $userDescription: ThemedStyle<TextStyle> = ({ spacing }) => ({
  color: "#ccc",
  fontSize: 14,
  marginTop: spacing.xxs,
});

const $teamLogoContainer: ThemedStyle<ViewStyle> = () => ({
  position: "absolute",
  right: 12,
  bottom: 12,
});

const $buttonContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  marginTop: spacing.md,
  gap: spacing.sm,
});

const $saveContactButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flex: 1,
  paddingVertical: spacing.md,
  backgroundColor: colors.background,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.border,
  alignItems: "center",
  justifyContent: "center",
});

const $saveContactButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  fontWeight: "600",
});

const $exchangeContactButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  paddingVertical: spacing.md,
  backgroundColor: "#F97316", // 오렌지색
  borderRadius: 8,
  alignItems: "center",
  justifyContent: "center",
});

const $exchangeContactButtonText: ThemedStyle<TextStyle> = () => ({
  color: "#fff",
  fontWeight: "600",
});

const $contentContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.lg,
});

const $aboutSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
});

const $sectionTitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 20,
  fontWeight: "bold",
  color: colors.text,
  marginBottom: spacing.sm,
});

const $bioText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  color: colors.textDim,
  lineHeight: 24,
});

const $postsContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
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
