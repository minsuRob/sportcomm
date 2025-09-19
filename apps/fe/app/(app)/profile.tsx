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
import { User } from "@/lib/auth";
import { useAuth } from "@/lib/auth/context/AuthContext";
import { useRouter } from "expo-router";
import { useTranslation } from "@/lib/i18n/useTranslation";
import Toast from "react-native-toast-message";
import {
  GET_USER_PROFILE,
  GET_USER_POSTS,
  GET_USER_BOOKMARKS,
  TOGGLE_FOLLOW,
} from "@/lib/graphql";
import {
  CREATE_OR_GET_PRIVATE_CHAT,
  GET_USER_PRIVATE_CHATS,
  type CreatePrivateChatResponse,
} from "@/lib/graphql/user-chat";
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

interface ProfileScreenProps {
  userId?: string;
  isModal?: boolean;
  onClose?: () => void;
}

/**
 * 프로필 화면 컴포넌트
 * 사용자의 프로필 정보와 작성한 게시물을 표시합니다
 * 본인 프로필과 다른 사용자 프로필을 모두 지원합니다
 */
export default function ProfileScreen({
  userId,
  isModal = false,
  onClose,
}: ProfileScreenProps) {
  const { themed, theme } = useAppTheme();
  const { t } = useTranslation();
  // 전역 AuthContext 에서 현재 사용자 정보 제공
  const { user: currentUser, updateUser, reloadUser } = useAuth();
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<string>("posts");
  const router = useRouter();

  // 본인 프로필인지 확인
  const isOwnProfile = !userId || currentUser?.id === userId;
  const targetUserId = userId || currentUser?.id;

  // 탭 설정 (본인/타인에 따라 다름)
  const tabs = isOwnProfile
    ? [
        { key: "posts", title: t("profile.myPosts") },
        { key: "bookmarks", title: t("profile.bookmarks") },
      ]
    : [{ key: "posts", title: t("profile.posts") }];

  // 팔로우 관련 상태 (타인 프로필일 때만 사용)
  const [isFollowing, setIsFollowing] = useState<boolean | undefined>(
    undefined,
  );
  // comment commit

  // 팀별 경험치/레벨 기능 제거됨 (이관 준비 단계)
  // 추후 재도입 시 primary team 기반 계산 로직을 별도 훅으로 분리 예정.

  // 사용자 프로필 데이터 조회
  const {
    data: profileData,
    loading: profileLoading,
    refetch: refetchProfile,
  } = useQuery<{
    getUserById: UserProfile;
  }>(GET_USER_PROFILE, {
    variables: { userId: targetUserId },
    skip: !targetUserId, // targetUserId가 없으면 쿼리 중단
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
    variables: { input: { authorId: targetUserId } },
    skip: !targetUserId,
    fetchPolicy: "network-only",
  });

  // 사용자의 북마크 목록 조회 (본인 프로필일 때만)
  const {
    data: bookmarksData,
    loading: bookmarksLoading,
    refetch: refetchBookmarks,
  } = useQuery<{
    getUserBookmarks: Post[];
  }>(GET_USER_BOOKMARKS, {
    variables: { userId: targetUserId },
    skip: !targetUserId || !isOwnProfile,
    fetchPolicy: "network-only",
  });

  // 팔로우 토글 뮤테이션 (타인 프로필일 때만 사용)
  const [toggleFollow, { loading: followLoading }] = useMutation(
    TOGGLE_FOLLOW,
    {
      update: (cache, { data }) => {
        if (data?.toggleFollow && targetUserId) {
          // 팔로우 상태 변경 시 캐시 업데이트
          cache.modify({
            id: cache.identify({ __typename: "User", id: targetUserId }),
            fields: {
              isFollowing: () => data.toggleFollow,
            },
          });
        }
      },
    },
  );

  // DM 생성 뮤테이션 (타인 프로필일 때만 사용)
  const [createOrGetPrivateChat, { loading: createChatLoading }] =
    useMutation<CreatePrivateChatResponse>(CREATE_OR_GET_PRIVATE_CHAT, {
      refetchQueries: [
        { query: GET_USER_PRIVATE_CHATS, variables: { page: 1, limit: 100 } },
      ],
    });

  // 로컬 세션 직접 로드(useEffect + getSession) 제거: AuthProvider 가 부트스트랩 처리

  // 사용자 ID 변경 시에만 refetch (중복/과도 호출 방지 + debounce)
  // prevUserIdRef: 마지막으로 refetch 완료(또는 시도)한 사용자 ID
  // refetchTimerRef: debounce 타이머 저장
  const prevUserIdRef = React.useRef<string | null>(null);
  const refetchTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    const nextId = currentUser?.id || null;

    // ID 없거나 변경 없음 → 조기 종료
    if (!nextId || nextId === prevUserIdRef.current) return;

    // 기존 타이머 클리어 (연속 변경 대비)
    if (refetchTimerRef.current) {
      clearTimeout(refetchTimerRef.current);
    }

    refetchTimerRef.current = setTimeout(async () => {
      if (!nextId) return;
      try {
        // 프로필 / 게시물 동시 재조회
        await Promise.allSettled([refetchProfile(), refetchPosts()]);

        // 본인 프로필일 때만 북마크 재조회
        if (isOwnProfile) {
          await refetchBookmarks();
        }
      } catch {
        // 개별 에러는 Apollo 내부에서 처리 → 여기서는 무시
      } finally {
        prevUserIdRef.current = nextId;
      }
    }, 300); // 300ms debounce (필요 시 조정 가능)

    return () => {
      if (refetchTimerRef.current) {
        clearTimeout(refetchTimerRef.current);
      }
    };
  }, [
    currentUser?.id,
    isOwnProfile,
    refetchProfile,
    refetchPosts,
    refetchBookmarks,
  ]);

  // 프로필 데이터 수신 시 세션/로컬 사용자 동기화 (무한 렌더 방지)
  // - currentUser 의존성 제거 (새 객체 병합으로 매번 setState 발생하던 문제 해결)
  // - shallow 필드 비교 후 변경시에만 setState + saveSession
  // - 타인 프로필: isFollowing 초기 1회만 설정
  useEffect(() => {
    // 서버 프로필 데이터 수신 시 전역 사용자와 비교 후 필요한 경우만 updateUser 호출
    if (!profileData?.getUserById) return;

    if (isOwnProfile && currentUser) {
      const server = profileData.getUserById;
      const keys: (keyof typeof server)[] = [
        "nickname",
        "email",
        "profileImageUrl",
        "bio",
        "age",
        "role",
      ];
      const changed = keys.some(
        (k) => (currentUser as any)[k] !== (server as any)[k],
      );
      if (changed) {
        void updateUser(server);
      }
    } else if (
      !isOwnProfile &&
      profileData.getUserById.isFollowing !== undefined &&
      isFollowing === undefined
    ) {
      setIsFollowing(profileData.getUserById.isFollowing);
    }
  }, [
    profileData?.getUserById,
    isOwnProfile,
    isFollowing,
    currentUser,
    updateUser,
  ]);

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

  // 팀 센터 접근 버튼 핸들러
  const handleOpenTeamCenter = (): void => {
    router.push("/(details)/team-center");
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
  /**
   * 팔로우/언팔로우 핸들러
   */
  const handleFollowToggle = async () => {
    if (!currentUser?.id || !targetUserId || isFollowing === undefined) {
      Toast.show({
        type: "error",
        text1: "로딩 중",
        text2: "잠시만 기다려주세요.",
        visibilityTime: 2000,
      });
      return;
    }

    if (currentUser.id === targetUserId) return;

    const previousIsFollowing = isFollowing;
    setIsFollowing(!previousIsFollowing);

    try {
      const result = await toggleFollow({
        variables: { userId: targetUserId },
      });

      if (result.errors || !result.data) {
        setIsFollowing(previousIsFollowing);
        Toast.show({
          type: "error",
          text1: "팔로우 실패",
          text2:
            result.errors?.[0]?.message ||
            "팔로우 처리 중 오류가 발생했습니다.",
          visibilityTime: 3000,
        });
        return;
      }

      const newIsFollowing = result.data.toggleFollow;
      setIsFollowing(newIsFollowing);

      Toast.show({
        type: "success",
        text1: t("common.success"),
        text2: newIsFollowing
          ? t("profile.followSuccess")
          : t("profile.unfollowSuccess"),
        visibilityTime: 2000,
      });

      // 캐시 업데이트로 팔로우 상태가 자동으로 반영되므로 refetch 불필요
    } catch (error) {
      setIsFollowing(previousIsFollowing);
      Toast.show({
        type: "error",
        text1: "팔로우 실패",
        text2: "팔로우 처리 중 오류가 발생했습니다.",
        visibilityTime: 3000,
      });
    }
  };

  /**
   * DM 시작 핸들러
   */
  const handleStartDM = async () => {
    if (!currentUser?.id || !targetUserId) {
      Toast.show({
        type: "error",
        text1: "로그인 필요",
        text2: "메시지를 보내려면 로그인이 필요합니다.",
        visibilityTime: 3000,
      });
      return;
    }

    if (currentUser.id === targetUserId) return;

    try {
      const { data } = await createOrGetPrivateChat({
        variables: { targetUserId },
      });

      if (data) {
        const chatRoom = data.createOrGetPrivateChat;
        const displayName =
          chatRoom.participants.find((p) => p.id !== currentUser.id)
            ?.nickname || chatRoom.name;

        if (isModal && onClose) {
          onClose();
        }
        router.replace({
          pathname: "/(details)/chat/[roomId]",
          params: {
            roomId: chatRoom.id,
            roomName: displayName,
          },
        });
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: t("common.errorShort"),
        text2: t("profile.chatStartError"),
        visibilityTime: 3000,
      });
    }
  };

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
    if (!isOwnProfile) {
      return "아직 작성한 게시물이 없습니다";
    }
    return activeTab === "posts"
      ? "아직 작성한 게시물이 없습니다"
      : "아직 북마크한 게시물이 없습니다";
  };

  if (profileLoading || !currentUser) {
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
          {isModal && onClose && (
            <TouchableOpacity style={themed($closeButton)} onPress={onClose}>
              <Text style={themed($closeButtonText)}>닫기</Text>
            </TouchableOpacity>
          )}
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

  const avatarUrl =
    userProfile.profileImageUrl ||
    `https://i.pravatar.cc/150?u=${userProfile.id}`;
  const backgroundImageUrl = "https://picsum.photos/seed/picsum/400/200"; // Placeholder

  return (
    <ScrollView style={themed($container)} showsVerticalScrollIndicator={false}>
      <ImageBackground
        source={{ uri: backgroundImageUrl }}
        style={themed($backgroundImage)}
      >
        {/* 헤더 - 배경 이미지 위에 표시 */}
        <View style={themed($header)}>
          {isModal ? (
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="arrow-back" color={"#fff"} size={24} />
            </TouchableOpacity>
          ) : (
            <View />
          )}
          <Text style={themed($headerTitle)}>
            {isOwnProfile
              ? t("profile.title")
              : t("profile.userProfile", { nickname: userProfile.nickname })}
          </Text>
          {!isModal && isOwnProfile ? (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              {/* <TouchableOpacity
                onPress={handleOpenTeamCenter}
                accessibilityLabel="팀 센터 열기"
              >
                <Ionicons name="trophy-outline" color={"#fff"} size={24} />
              </TouchableOpacity> */}
              <TouchableOpacity
                onPress={handleSettings}
                accessibilityLabel="설정 열기"
                style={{ marginLeft: 8 }}
              >
                <Ionicons name="settings-outline" color={"#fff"} size={24} />
              </TouchableOpacity>
            </View>
          ) : (
            <View />
          )}
        </View>
      </ImageBackground>

      <View style={themed($mainContent)}>
        <View style={themed($profileCard)}>
          <Image source={{ uri: avatarUrl }} style={themed($profileImage)} />
          <View style={themed($infoContainer)}>
            <Text style={themed($username)}>{userProfile.nickname}</Text>
            {userProfile.bio && ( //TODO : bio 대신 comment 사용해야할거같은데, 중복된 컬럼
              <Text style={themed($userComment)}>{userProfile.bio}</Text>
            )}
            {/* 연령대 배지 표시 */}
            {userProfile?.age || currentUser?.age ? (
              <View style={themed($ageBadge)}>
                <Text style={themed($ageBadgeText)}>
                  {(() => {
                    const age = (userProfile?.age ||
                      currentUser?.age) as number;
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
          </View>
        </View>

        {/* 팀 정보 표시 */}
        {userProfile.myTeams && userProfile.myTeams.length > 0 ? (
          <View style={themed($teamsContainer)}>
            {[...userProfile.myTeams]
              .sort((a, b) => a.priority - b.priority)
              .slice(0, 3)
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
                    {/* 경험치 표시 */}
                    <Text style={themed($experienceText)}>
                      {" "}
                      {userTeam.experience || 0} EXP
                    </Text>
                  </Text>
                </View>
              ))}
          </View>
        ) : (
          <Text style={themed($noTeamText)}>아직 선택한 팀이 없습니다</Text>
        )}

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

        {/* 버튼 컨테이너 - 본인/타인에 따라 다른 버튼 표시 */}
        {!isOwnProfile ? (
          // 타인 프로필일 때: 팔로우, DM 버튼
          <View style={themed($buttonContainer)}>
            <TouchableOpacity
              style={themed($saveContactButton)}
              onPress={handleFollowToggle}
              disabled={followLoading || isFollowing === undefined}
            >
              {followLoading ? (
                <ActivityIndicator size="small" color={theme.colors.text} />
              ) : isFollowing === undefined ? (
                <ActivityIndicator size="small" color={theme.colors.textDim} />
              ) : (
                <Text style={themed($saveContactButtonText)}>
                  {isFollowing
                    ? t("profile.followUnfollow")
                    : t("profile.follow")}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={themed($exchangeContactButton)}
              onPress={handleStartDM}
              disabled={createChatLoading}
            >
              {createChatLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={themed($exchangeContactButtonText)}>DM</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          // 본인 프로필일 때: 프로필편집, My Team 버튼
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
        )}

        <View style={themed($contentContainer)}>
          {/* 탭 슬라이더 */}
          <TabSlider
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />

          {/* 게시물 목록 */}
          {getCurrentLoading() ? (
            <View style={themed($loadingContainer)}>
              <ActivityIndicator size="large" color={theme.colors.tint} />
            </View>
          ) : (
            <View style={themed($postsContainer)}>
              <FeedList
                posts={getCurrentPosts()}
                ListEmptyComponent={
                  <View style={themed($emptyState)}>
                    <Text style={themed($emptyStateText)}>
                      {getEmptyMessage()}
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

const $header: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.lg,
});

const $headerTitle: ThemedStyle<TextStyle> = () => ({
  fontSize: 24,
  fontWeight: "bold",
  color: "#fff",
});

const $mainContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  marginTop: -80, // 프로필 카드를 배경 이미지 위로 올림
  paddingBottom: spacing.xl,
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
  minHeight: 120,
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

const $userComment: ThemedStyle<TextStyle> = ({ spacing }) => ({
  color: "#ddd",
  fontSize: 16,
  marginTop: spacing.xs,
  fontStyle: "italic",
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
  minWidth: "80%",
});

const $teamInfo: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 16,
  fontWeight: "600",
  color: colors.text,
  marginLeft: spacing.sm,
  flex: 1,
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

const $experienceText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  fontWeight: "500",
  color: colors.tint,
});

const $noTeamText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 14,
  color: colors.textDim,
  marginTop: spacing.md,
  fontStyle: "italic",
});

const $ageBadge: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  marginTop: spacing.xs,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xxs,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.card,
  alignSelf: "flex-start",
});

const $ageBadgeText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.text,
  fontWeight: "600",
});

const $statsSection: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-around",
  paddingVertical: spacing.sm,
  marginTop: spacing.md,
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

const $buttonContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  marginTop: spacing.md,
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

const $contentContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.md,
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
