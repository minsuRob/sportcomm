import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  ViewStyle,
  TextStyle,
  ImageStyle,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, UserMinus, UserPlus } from "lucide-react-native";
import { useQuery, useMutation } from "@apollo/client";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { showToast } from "@/components/CustomToast";
import { TOGGLE_FOLLOW } from "@/lib/graphql";
import { gql } from "@apollo/client";

// GraphQL Query
const GET_FOLLOWERS = gql`
  query GetFollowers($userId: String!) {
    getUserById(userId: $userId) {
      followers {
        follower {
          id
          nickname
          profileImageUrl
          isFollowing
          followerCount
          followingCount
        }
      }
    }
  }
`;

// 팔로워 사용자 타입
interface FollowerUser {
  id: string;
  nickname: string;
  profileImageUrl?: string;
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
}

// 팔로워 관계 타입
interface FollowRelation {
  follower: FollowerUser;
}

// 팔로워 리스트 응답 타입
interface FollowersResponse {
  getUserById: {
    followers: FollowRelation[];
  };
}

/**
 * 팔로워 리스트 화면
 */
export default function FollowersScreen() {
  const { themed, theme } = useAppTheme();
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();

  const [followers, setFollowers] = useState<FollowerUser[]>([]);

  // 팔로워 목록 조회
  const {
    data: followersData,
    loading: followersLoading,
    refetch: refetchFollowers,
    error: followersError,
  } = useQuery<FollowersResponse>(GET_FOLLOWERS, {
    variables: { userId: userId },
    skip: !userId,
    fetchPolicy: "network-only",
  });

  // 팔로우 토글 뮤테이션
  const [executeToggleFollow] = useMutation(TOGGLE_FOLLOW);

  useEffect(() => {
    if (followersData?.getUserById.followers) {
      try {
        const followerUsers = followersData.getUserById.followers.map(
          (relation) => relation.follower,
        );
        setFollowers(followerUsers || []);
      } catch (error) {
        console.error("팔로워 데이터 처리 중 오류 발생:", error);
        setFollowers([]);
      }
    }
  }, [followersData]);

  const handleBack = () => {
    router.back();
  };

  const handleFollowToggle = async (
    targetUserId: string,
    isCurrentlyFollowing: boolean,
  ) => {
    try {
      const result = await executeToggleFollow({ userId: targetUserId });

      if (result.error) {
        showToast({
          type: "error",
          title: "오류",
          message: isCurrentlyFollowing
            ? "언팔로우에 실패했습니다."
            : "팔로우에 실패했습니다.",
          duration: 3000,
        });
        return;
      }

      // 로컬 상태 업데이트
      setFollowers((prev) =>
        prev.map((user) =>
          user.id === targetUserId
            ? {
                ...user,
                isFollowing: !isCurrentlyFollowing,
                followerCount: isCurrentlyFollowing
                  ? user.followerCount - 1
                  : user.followerCount + 1,
              }
            : user,
        ),
      );

      showToast({
        type: "success",
        title: "성공",
        message: isCurrentlyFollowing ? "언팔로우했습니다." : "팔로우했습니다.",
        duration: 2000,
      });
    } catch (error) {
      showToast({
        type: "error",
        title: "오류",
        message: "요청 처리 중 오류가 발생했습니다.",
        duration: 3000,
      });
    }
  };

  const renderFollowerItem = ({ item }: { item: FollowerUser }) => {
    const avatarUrl =
      item.profileImageUrl || `https://i.pravatar.cc/150?u=${item.id}`;

    return (
      <View style={themed($userItem)}>
        <View style={themed($userInfo)}>
          <Image source={{ uri: avatarUrl }} style={themed($avatar)} />
          <View style={themed($userDetails)}>
            <Text style={themed($nickname)}>{item.nickname}</Text>
            <Text style={themed($stats)}>
              팔로워 {item.followerCount} · 팔로잉 {item.followingCount}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            themed($followButton),
            {
              backgroundColor: item.isFollowing
                ? "transparent"
                : theme.colors.tint,
              borderColor: item.isFollowing
                ? theme.colors.border
                : theme.colors.tint,
            },
          ]}
          onPress={() => handleFollowToggle(item.id, item.isFollowing)}
        >
          {item.isFollowing ? (
            <UserMinus color={theme.colors.text} size={16} />
          ) : (
            <UserPlus color="white" size={16} />
          )}
          <Text
            style={[
              themed($followButtonText),
              { color: item.isFollowing ? theme.colors.text : "white" },
            ]}
          >
            {item.isFollowing ? "언팔로우" : "팔로우"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // 로딩 중이거나 에러 발생 시 표시할 화면
  if (followersLoading && followers.length === 0) {
    return (
      <View style={themed($container)}>
        <View style={themed($header)}>
          <TouchableOpacity onPress={handleBack}>
            <ArrowLeft color={theme.colors.text} size={24} />
          </TouchableOpacity>
          <Text style={themed($headerTitle)}>팔로워</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={themed($loadingContainer)}>
          <ActivityIndicator size="large" color={theme.colors.tint} />
          <Text style={themed($loadingText)}>팔로워 목록을 불러오는 중...</Text>
        </View>
      </View>
    );
  }

  if (followersError) {
    return (
      <View style={themed($container)}>
        <View style={themed($header)}>
          <TouchableOpacity onPress={handleBack} style={themed($backButton)}>
            <ArrowLeft color={theme.colors.text} size={24} />
          </TouchableOpacity>
          <Text style={themed($headerTitle)}>팔로워</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={themed($loadingContainer)}>
          <Text style={themed($loadingText)}>
            팔로워 목록을 불러오는 중 오류가 발생했습니다.
          </Text>
          <TouchableOpacity
            onPress={() => refetchFollowers()}
            style={themed($followButton)}
          >
            <Text
              style={[themed($followButtonText), { color: theme.colors.tint }]}
            >
              다시 시도
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={themed($container)}>
      {/* 헤더 */}
      <View style={themed($header)}>
        <TouchableOpacity onPress={handleBack} style={themed($backButton)}>
          <ArrowLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={themed($headerTitle)}>팔로워 {followers.length || 0}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* 팔로워 리스트 */}
      <FlatList
        data={followers}
        renderItem={renderFollowerItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={themed($listContainer)}
        ListEmptyComponent={
          !followersResult.fetching ? (
            <View style={themed($loadingContainer)}>
              <Text style={themed($loadingText)}>팔로워가 없습니다.</Text>
            </View>
          ) : null
        }
        refreshing={followersLoading}
        onRefresh={() => refetchFollowers()}
      />
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
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
  backgroundColor: colors.background,
});

const $backButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.xs,
});

const $headerTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
  fontWeight: "bold",
  color: colors.text,
});

const $listContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.sm,
});

const $userItem: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
});

const $userInfo: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  flex: 1,
  marginRight: spacing.md,
});

const $avatar: ThemedStyle<ImageStyle> = ({ spacing }) => ({
  width: 50,
  height: 50,
  borderRadius: 25,
  marginRight: spacing.md,
});

const $userDetails: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $nickname: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 16,
  fontWeight: "600",
  color: colors.text,
  marginBottom: spacing.xxxs,
});

const $stats: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
});

const $followButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderRadius: 20,
  borderWidth: 1,
  gap: spacing.xs,
});

const $followButtonText: ThemedStyle<TextStyle> = () => ({
  fontSize: 14,
  fontWeight: "600",
});

const $loadingContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  gap: spacing.md,
});

const $loadingText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  color: colors.textDim,
});

const $loadingFooter: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.lg,
  alignItems: "center",
});
