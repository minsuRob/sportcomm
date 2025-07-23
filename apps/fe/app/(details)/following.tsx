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
import { useQuery, useMutation } from "urql";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { showToast } from "@/components/CustomToast";
import { GET_FOLLOWING, TOGGLE_FOLLOW } from "@/lib/graphql";

// 팔로잉 사용자 타입
interface FollowingUser {
  id: string;
  nickname: string;
  profileImageUrl?: string;
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
}

// 팔로잉 관계 타입 (백엔드 스키마 기반)
interface FollowRelation {
  following: FollowingUser;
}

// 팔로잉 리스트 응답 타입
interface FollowingResponse {
  getUserById: {
    following: FollowRelation[];
  };
}

/**
 * 팔로잉 리스트 화면
 */
export default function FollowingScreen() {
  const { themed, theme } = useAppTheme();
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();

  const [following, setFollowing] = useState<FollowingUser[]>([]);

  // 팔로잉 목록 조회
  const [followingResult, refetchFollowing] = useQuery<FollowingResponse>({
    query: GET_FOLLOWING,
    variables: { userId: userId },
    pause: !userId,
    requestPolicy: "network-only",
  });

  // 팔로우 토글 뮤테이션
  const [, executeToggleFollow] = useMutation(TOGGLE_FOLLOW);

  useEffect(() => {
    if (followingResult.data?.getUserById.following) {
      const followingUsers = followingResult.data.getUserById.following.map(
        (relation) => relation.following,
      );
      setFollowing(followingUsers);
    }
  }, [followingResult.data]);

  const handleBack = () => {
    router.back();
  };

  const handleFollowToggle = async (
    targetUserId: string,
    isCurrentlyFollowing: boolean,
  ) => {
    try {
      const { error } = await executeToggleFollow({ userId: targetUserId });

      if (error) {
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
      setFollowing((prev) =>
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

  const renderFollowingItem = ({ item }: { item: FollowingUser }) => {
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

  if (followingResult.fetching && !following.length) {
    return (
      <View style={themed($container)}>
        <View style={themed($header)}>
          <TouchableOpacity onPress={handleBack} style={themed($backButton)}>
            <ArrowLeft color={theme.colors.text} size={24} />
          </TouchableOpacity>
          <Text style={themed($headerTitle)}>팔로잉</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={themed($loadingContainer)}>
          <ActivityIndicator size="large" color={theme.colors.tint} />
          <Text style={themed($loadingText)}>팔로잉 목록을 불러오는 중...</Text>
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
        <Text style={themed($headerTitle)}>팔로잉 {following.length || 0}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* 팔로잉 리스트 */}
      <FlatList
        data={following}
        renderItem={renderFollowingItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={themed($listContainer)}
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
