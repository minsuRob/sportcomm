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
import { formatTimeAgo } from "@/lib/utils/dateUtils";

/**
 * 팀 ID별 스타일 매핑
 * 각 팀마다 색상, 표시 텍스트, 아이콘을 정의합니다.
 */
const TeamInfo: Record<string, { color: string; text: string; icon: string }> =
  {
    // 축구팀
    "tottenham-id": { color: "#132257", text: "토트넘", icon: "⚽" },
    "newcastle-id": { color: "#241F20", text: "뉴캐슬", icon: "⚽" },
    "atletico-id": { color: "#CE2029", text: "아틀레티코", icon: "⚽" },
    "mancity-id": { color: "#6CABDD", text: "맨시티", icon: "⚽" },
    "liverpool-id": { color: "#C8102E", text: "리버풀", icon: "⚽" },

    // 야구팀
    "doosan-id": { color: "#131230", text: "두산", icon: "⚾" },
    "hanwha-id": { color: "#FF6600", text: "한화", icon: "⚾" },
    "lg-id": { color: "#C30452", text: "LG", icon: "⚾" },
    "samsung-id": { color: "#074CA1", text: "삼성", icon: "⚾" },
    "kia-id": { color: "#EA0029", text: "KIA", icon: "⚾" },

    // e스포츠팀
    "t1-id": { color: "#E2012D", text: "T1", icon: "🎮" },
    "geng-id": { color: "#AA8B56", text: "Gen.G", icon: "🎮" },
    "drx-id": { color: "#2E5BFF", text: "DRX", icon: "🎮" },
    "kt-id": { color: "#D4002A", text: "KT", icon: "🎮" },
    "damwon-id": { color: "#004B9F", text: "담원", icon: "🎮" },
  };

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
    teamId: string; // 팀 ID로 변경
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

  const { author, createdAt, teamId } = post;


  // 렌더링용 포맷 결과
  const formattedTimeAgo: string = formatTimeAgo(createdAt);

  const avatarUrl =
    author.profileImageUrl || `https://i.pravatar.cc/150?u=${author.id}`;

  /**
   * 팀 ID에 따른 스타일 가져오기
   * 팀 ID에 따라 다른 색상과 아이콘을 반환합니다.
   */
  const getTeamStyle = (teamId: string) => {
    // TeamInfo에서 팀 정보 가져오기, 없으면 기본값 사용
    return TeamInfo[teamId] || { color: "#6366f1", text: "팀", icon: "🏆" };
  };

  const teamStyle = getTeamStyle(teamId);

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
        <Text style={themed($timestamp)}>{formattedTimeAgo}</Text>
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
              {isFollowing ? "팔로잉" : "팔로우"}
            </Text>
          </TouchableOpacity>
        )}

        {/* 팀 배지 */}
        <View
          style={[themed($typeBadge), { backgroundColor: teamStyle.color }]}
        >
          <Text style={themed($typeBadgeText)}>{teamStyle.text}</Text>
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
          teamId: post.teamId,
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
