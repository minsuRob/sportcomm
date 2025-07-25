import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  ImageStyle,
} from "react-native";
import { MoreHorizontal } from "lucide-react-native";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { useTranslation, TRANSLATION_KEYS } from "@/lib/i18n/useTranslation";
export enum PostType {
  ANALYSIS = "ANALYSIS",
  CHEERING = "CHEERING",
  HIGHLIGHT = "HIGHLIGHT",
}

interface PostHeaderProps {
  author: {
    id: string;
    nickname: string;
    profileImageUrl?: string;
    isFollowing?: boolean;
  };
  createdAt: string;
  postType: PostType;
  currentUserId?: string | null;
  isFollowing: boolean;
  onFollowToggle: () => void;
  onMorePress: () => void;
  onPress?: () => void;
  showFollowButton?: boolean;
}

/**
 * 게시물 헤더 공통 컴포넌트
 * 작성자 정보, 팔로우 버튼, 더보기 버튼을 포함
 */
export default function PostHeader({
  author,
  createdAt,
  postType,
  currentUserId,
  isFollowing,
  onFollowToggle,
  onMorePress,
  onPress,
  showFollowButton = true,
}: PostHeaderProps) {
  const { themed, theme } = useAppTheme();
  const { t } = useTranslation();

  const avatarUrl =
    author.profileImageUrl || `https://i.pravatar.cc/150?u=${author.id}`;

  const getPostTypeStyle = (type: PostType) => {
    switch (type) {
      case PostType.ANALYSIS:
        return {
          color: "#6366f1",
          text: t(TRANSLATION_KEYS.POST_TYPE_ANALYSIS),
        };
      case PostType.HIGHLIGHT:
        return {
          color: "#f59e0b",
          text: t(TRANSLATION_KEYS.POST_TYPE_HIGHLIGHT),
        };
      case PostType.CHEERING:
      default:
        return {
          color: "#10b981",
          text: t(TRANSLATION_KEYS.POST_TYPE_CHEERING),
        };
    }
  };

  const postTypeStyle = getPostTypeStyle(postType);

  const HeaderContent = (
    <>
      <Image source={{ uri: avatarUrl }} style={themed($avatar)} />
      <View style={themed($userInfo)}>
        <Text style={themed($username)}>{author.nickname}</Text>
        <Text style={themed($timestamp)}>
          {new Date(createdAt).toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
    </>
  );

  return (
    <View style={themed($container)}>
      {onPress ? (
        <TouchableOpacity
          style={themed($headerLeft)}
          onPress={onPress}
          activeOpacity={0.7}
        >
          {HeaderContent}
        </TouchableOpacity>
      ) : (
        <View style={themed($headerLeft)}>{HeaderContent}</View>
      )}

      <View style={themed($headerRight)}>
        {/* 팔로우 버튼 - 자기 자신이 아닐 때만 표시 */}
        {showFollowButton && currentUserId && currentUserId !== author.id && (
          <TouchableOpacity
            style={[
              themed($followButton),
              {
                backgroundColor: isFollowing
                  ? "transparent"
                  : theme.colors.tint,
                borderColor: isFollowing
                  ? theme.colors.border
                  : theme.colors.tint,
              },
            ]}
            onPress={onFollowToggle}
          >
            <Text
              style={[
                themed($followButtonText),
                { color: isFollowing ? theme.colors.text : "white" },
              ]}
            >
              {isFollowing
                ? t(TRANSLATION_KEYS.POST_FOLLOWING)
                : t(TRANSLATION_KEYS.POST_FOLLOW)}
            </Text>
          </TouchableOpacity>
        )}

        {/* 게시물 타입 배지 */}
        <View
          style={[themed($typeBadge), { backgroundColor: postTypeStyle.color }]}
        >
          <Text style={themed($typeBadgeText)}>{postTypeStyle.text}</Text>
        </View>

        {/* 더보기 버튼 */}
        <TouchableOpacity style={themed($moreButton)} onPress={onMorePress}>
          <MoreHorizontal color={theme.colors.textDim} size={24} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// --- 스타일 정의 ---
const $container: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
});

const $headerLeft: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  alignItems: "center",
  flex: 1,
});

const $avatar: ThemedStyle<ImageStyle> = () => ({
  width: 48,
  height: 48,
  borderRadius: 24,
});

const $userInfo: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginLeft: spacing.sm,
  flex: 1,
});

const $username: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontWeight: "bold",
  fontSize: 18,
  color: colors.text,
});

const $timestamp: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
});

const $headerRight: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
});

const $followButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 16,
  borderWidth: 1,
});

const $followButtonText: ThemedStyle<TextStyle> = () => ({
  fontSize: 12,
  fontWeight: "600",
});

const $typeBadge: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xxxs,
  borderRadius: 12,
});

const $typeBadgeText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 12,
  fontWeight: "bold",
});

const $moreButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.md, // 터치 영역을 더 크게
  borderRadius: 20,
  minWidth: 44, // 최소 터치 영역 보장
  minHeight: 44,
  justifyContent: "center",
  alignItems: "center",
});
