import React from "react";
import {
  View,
  Text,
  Image,
  ViewStyle,
  TextStyle,
  ImageStyle,
} from "react-native";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";

// Define a user type for the props, which will be passed down from the screen.
interface UserProfile {
  nickname: string;
  bio: string;
  profileImageUrl?: string;
}

interface ProfileHeaderProps {
  user: UserProfile;
}

/**
 * 프로필 화면 상단에 사용자 프로필 정보를 표시하는 컴포넌트
 * 테마 시스템을 사용하여 다크/라이트 모드를 완전 지원합니다
 */
export default function ProfileHeader({ user }: ProfileHeaderProps) {
  const { themed } = useAppTheme();

  // 사용자가 프로필 이미지가 없는 경우 기본 아바타 제공
  const avatarUrl =
    user.profileImageUrl || `https://i.pravatar.cc/150?u=${user.nickname}`;

  return (
    <View style={themed($container)}>
      <Image source={{ uri: avatarUrl }} style={themed($avatar)} />
      <Text style={themed($nickname)}>{user.nickname}</Text>
      <Text style={themed($bio)}>{user.bio}</Text>
    </View>
  );
}

// --- 스타일 정의 ---
const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  alignItems: "center",
  padding: spacing.md,
  backgroundColor: colors.background,
});

const $avatar: ThemedStyle<ImageStyle> = ({ colors, spacing }) => ({
  width: 96,
  height: 96,
  borderRadius: 48,
  marginBottom: spacing.md,
  borderWidth: 2,
  borderColor: colors.border,
});

const $nickname: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 24,
  fontWeight: "bold",
  color: colors.text,
});

const $bio: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 16,
  color: colors.textDim,
  marginTop: spacing.xs,
  textAlign: "center",
});
