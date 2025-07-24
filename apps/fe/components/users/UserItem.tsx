import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ImageStyle,
} from "react-native";
import { useAppTheme } from "@/lib/theme/context";
import { UserCircle, Users } from "lucide-react-native";
import type { ThemedStyle } from "@/lib/theme/types";

/**
 * 사용자 타입 정의
 */
export interface UserItemType {
  id: string;
  nickname: string;
  profileImageUrl?: string;
  bio?: string;
  role: 'USER' | 'INFLUENCER' | 'ADMIN';
  followersCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
}

/**
 * 사용자 아이템 컴포넌트 속성 타입 정의
 */
interface UserItemProps {
  /**
   * 사용자 데이터
   */
  user: UserItemType;

  /**
   * 클릭 이벤트 핸들러 (선택 사항)
   */
  onPress?: (user: UserItemType) => void;
}

/**
 * 사용자 아이템 컴포넌트
 * 검색 결과나 팔로워 목록에서 사용자를 표시하는 데 사용됩니다.
 */
export default function UserItem({ user, onPress }: UserItemProps) {
  const { themed, theme } = useAppTheme();

  /**
   * 사용자 선택 핸들러
   */
  const handlePress = () => {
    if (onPress) {
      onPress(user);
    }
  };

  /**
   * 사용자 역할 표시 텍스트
   */
  const roleText = {
    USER: '사용자',
    INFLUENCER: '인플루언서',
    ADMIN: '관리자',
  }[user.role] || '사용자';

  /**
   * 자기소개 요약
   */
  const bioSummary = user.bio
    ? user.bio.length > 100
      ? `${user.bio.substring(0, 100)}...`
      : user.bio
    : '자기소개가 없습니다';

  return (
    <TouchableOpacity
      style={themed($container)}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={themed($header)}>
        {/* 프로필 이미지 */}
        {user.profileImageUrl ? (
          <Image
            source={{ uri: user.profileImageUrl }}
            style={themed($profileImage)}
          />
        ) : (
          <View style={themed($profileFallback)}>
            <UserCircle size={30} color={theme.colors.textDim} />
          </View>
        )}

        <View style={styles.userInfoContainer}>
          {/* 닉네임 */}
          <View style={styles.nicknameContainer}>
            <Text style={themed($nickname)}>{user.nickname}</Text>

            {/* 역할 표시 태그 */}
            {user.role !== 'USER' && (
              <View style={themed($roleTag)}>
                <Text style={themed($roleText)}>{roleText}</Text>
              </View>
            )}
          </View>

          {/* 자기소개 */}
          <Text style={themed($bio)} numberOfLines={2}>
            {bioSummary}
          </Text>
        </View>
      </View>

      {/* 팔로워/팔로잉 정보 */}
      <View style={themed($statsContainer)}>
        <View style={styles.stat}>
          <Users size={14} color={theme.colors.textDim} />
          <Text style={themed($statText)}>
            팔로워 {user.followersCount || 0}
          </Text>
        </View>
        <View style={styles.stat}>
          <Users size={14} color={theme.colors.textDim} />
          <Text style={themed($statText)}>
            팔로잉 {user.followingCount || 0}
          </Text>
        </View>
      </View>

      {/* 팔로우 버튼 */}
      <TouchableOpacity
        style={[
          themed($followButton),
          user.isFollowing && themed($followingButton),
        ]}
      >
        <Text style={[
          themed($followButtonText),
          user.isFollowing && themed($followingButtonText),
        ]}>
          {user.isFollowing ? '팔로잉' : '팔로우'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// --- 스타일 정의 ---
const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.card,
  borderRadius: 8,
  padding: spacing.md,
  marginBottom: spacing.md,
  shadowColor: colors.shadow,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 3,
  elevation: 2,
});

const $header: ThemedStyle<ViewStyle> = () => ({
  flexDirection: 'row',
  alignItems: 'flex-start',
});

const $profileImage: ThemedStyle<ImageStyle> = () => ({
  width: 50,
  height: 50,
  borderRadius: 25,
  marginRight: 12,
});

const $profileFallback: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 50,
  height: 50,
  borderRadius: 25,
  backgroundColor: colors.separator,
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 12,
});

const $nickname: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontWeight: '600',
  fontSize: 16,
  color: colors.text,
});

const $roleTag: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.tintLight,
  paddingHorizontal: spacing.xs,
  paddingVertical: 2,
  borderRadius: 4,
  marginLeft: 6,
});

const $roleText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  fontSize: 10,
  fontWeight: '500',
});

const $bio: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
  marginTop: 4,
  lineHeight: 18,
});

const $statsContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: 'row',
  marginTop: spacing.md,
  marginBottom: spacing.md,
});

const $statText: ThemedStyle<TextStyle> = ({ colors }) => ({
  marginLeft: 4,
  fontSize: 13,
  color: colors.textDim,
});

const $followButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.tint,
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  borderRadius: 20,
  alignItems: 'center',
  alignSelf: 'flex-start',
});

const $followingButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: 'transparent',
  borderWidth: 1,
  borderColor: colors.tint,
});

const $followButtonText: ThemedStyle<TextStyle> = () => ({
  color: 'white',
  fontWeight: '600',
  fontSize: 12,
});

const $followingButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
});

// 일반 스타일 (테마 컨텍스트 필요 없음)
const styles = StyleSheet.create({
  userInfoContainer: {
    flex: 1,
  },
  nicknameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
});
