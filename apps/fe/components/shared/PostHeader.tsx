import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  ImageStyle,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { useTranslation, TRANSLATION_KEYS } from "@/lib/i18n/useTranslation";
import PostContextMenu from "./PostContextMenu";
export enum PostType {
  // 축구팀
  TOTTENHAM = "TOTTENHAM",
  NEWCASTLE = "NEWCASTLE",
  ATLETICO_MADRID = "ATLETICO_MADRID",
  MANCHESTER_CITY = "MANCHESTER_CITY",
  LIVERPOOL = "LIVERPOOL",

  // 야구팀
  DOOSAN_BEARS = "DOOSAN_BEARS",
  HANWHA_EAGLES = "HANWHA_EAGLES",
  LG_TWINS = "LG_TWINS",
  SAMSUNG_LIONS = "SAMSUNG_LIONS",
  KIA_TIGERS = "KIA_TIGERS",

  // e스포츠팀
  T1 = "T1",
  GENG = "GENG",
  DRX = "DRX",
  KT_ROLSTER = "KT_ROLSTER",
  DAMWON_KIA = "DAMWON_KIA",
}

interface PostHeaderProps {
  post: {
    id: string;
    title?: string;
    content: string;
    author: {
      id: string;
      nickname: string;
      profileImageUrl?: string;
      isFollowing?: boolean;
    };
    createdAt: string;
    type: PostType;
  };
  currentUserId?: string | null;
  isFollowing: boolean;
  onFollowToggle: () => void;
  onPress?: () => void;
  showFollowButton?: boolean;
  onPostUpdated?: (updatedPost: any) => void;
}

/**
 * 게시물 헤더 공통 컴포넌트
 * 작성자 정보, 팔로우 버튼, 더보기 버튼을 포함
 */
export default function PostHeader({
  post,
  currentUserId,
  isFollowing,
  onFollowToggle,
  onPress,
  showFollowButton = true,
  onPostUpdated,
}: PostHeaderProps) {
  const { themed, theme } = useAppTheme();
  const { t } = useTranslation();
  const [showContextMenu, setShowContextMenu] = useState(false);

  const { author, createdAt, type: postType } = post;

  const avatarUrl =
    author.profileImageUrl || `https://i.pravatar.cc/150?u=${author.id}`;

  const getPostTypeStyle = (type: PostType) => {
    switch (type) {
      // 축구팀
      case PostType.TOTTENHAM:
        return { color: "#132257", text: "토트넘", icon: "⚽" };
      case PostType.NEWCASTLE:
        return { color: "#241F20", text: "뉴캐슬", icon: "⚽" };
      case PostType.ATLETICO_MADRID:
        return { color: "#CE2029", text: "아틀레티코", icon: "⚽" };
      case PostType.MANCHESTER_CITY:
        return { color: "#6CABDD", text: "맨시티", icon: "⚽" };
      case PostType.LIVERPOOL:
        return { color: "#C8102E", text: "리버풀", icon: "⚽" };

      // 야구팀
      case PostType.DOOSAN_BEARS:
        return { color: "#131230", text: "두산", icon: "⚾" };
      case PostType.HANWHA_EAGLES:
        return { color: "#FF6600", text: "한화", icon: "⚾" };
      case PostType.LG_TWINS:
        return { color: "#C30452", text: "LG", icon: "⚾" };
      case PostType.SAMSUNG_LIONS:
        return { color: "#074CA1", text: "삼성", icon: "⚾" };
      case PostType.KIA_TIGERS:
        return { color: "#EA0029", text: "KIA", icon: "⚾" };

      // e스포츠팀
      case PostType.T1:
        return { color: "#E2012D", text: "T1", icon: "🎮" };
      case PostType.GENG:
        return { color: "#AA8B56", text: "Gen.G", icon: "🎮" };
      case PostType.DRX:
        return { color: "#2E5BFF", text: "DRX", icon: "🎮" };
      case PostType.KT_ROLSTER:
        return { color: "#D4002A", text: "KT", icon: "🎮" };
      case PostType.DAMWON_KIA:
        return { color: "#004B9F", text: "담원", icon: "🎮" };

      default:
        return { color: "#6366f1", text: "팀", icon: "🏆" };
    }
  };

  const postTypeStyle = getPostTypeStyle(postType);

  /**
   * 더보기 버튼 클릭 핸들러
   */
  const handleMorePress = () => {
    setShowContextMenu(true);
  };

  /**
   * 컨텍스트 메뉴 닫기 핸들러
   */
  const handleCloseContextMenu = () => {
    setShowContextMenu(false);
  };

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
        <TouchableOpacity style={themed($moreButton)} onPress={handleMorePress}>
          <MaterialIcons
            name="more-horiz"
            color={theme.colors.textDim}
            size={24}
          />
        </TouchableOpacity>
      </View>

      {/* 컨텍스트 메뉴 */}
      <PostContextMenu
        visible={showContextMenu}
        onClose={handleCloseContextMenu}
        post={{
          id: post.id,
          title: post.title,
          content: post.content,
          type: post.type,
          author: post.author,
        }}
        currentUserId={currentUserId}
        onPostUpdated={onPostUpdated}
      />
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
