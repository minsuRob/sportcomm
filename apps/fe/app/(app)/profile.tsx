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
} from "react-native";
import { Settings, Edit3 } from "lucide-react-native";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { User, getSession } from "@/lib/auth";
import { useRouter } from "expo-router";

/**
 * 프로필 화면 컴포넌트
 * 사용자의 프로필 정보와 작성한 게시물을 표시합니다
 */
export default function ProfileScreen() {
  const { themed, theme } = useAppTheme();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const loadUserProfile = async () => {
      const { user } = await getSession();
      if (user) setCurrentUser(user);
    };
    loadUserProfile();
  }, []);

  const handleEditProfile = () => {
    // TODO: 프로필 편집 로직 구현
    console.log("프로필 편집");
  };

  const handleSettings = () => {
    router.push("/(app)/settings");
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

  const avatarUrl =
    currentUser.profileImageUrl ||
    `https://i.pravatar.cc/150?u=${currentUser.id}`;

  return (
    <ScrollView style={themed($container)}>
      {/* 헤더 */}
      <View style={themed($header)}>
        <Text style={themed($headerTitle)}>프로필</Text>
        <TouchableOpacity onPress={handleSettings}>
          <Settings color={theme.colors.text} size={24} />
        </TouchableOpacity>
      </View>

      {/* 프로필 정보 */}
      <View style={themed($profileSection)}>
        <Image source={{ uri: avatarUrl }} style={themed($profileImage)} />
        <Text style={themed($username)}>{currentUser.nickname}</Text>

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
          <Text style={themed($statNumber)}>0</Text>
          <Text style={themed($statLabel)}>게시물</Text>
        </View>
        <View style={themed($statItem)}>
          <Text style={themed($statNumber)}>0</Text>
          <Text style={themed($statLabel)}>팔로워</Text>
        </View>
        <View style={themed($statItem)}>
          <Text style={themed($statNumber)}>0</Text>
          <Text style={themed($statLabel)}>팔로잉</Text>
        </View>
      </View>

      {/* 내 게시물 섹션 */}
      <View style={themed($postsSection)}>
        <Text style={themed($sectionTitle)}>내 게시물</Text>
        <View style={themed($emptyState)}>
          <Text style={themed($emptyStateText)}>
            아직 작성한 게시물이 없습니다
          </Text>
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
