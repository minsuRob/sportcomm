import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { useTranslation, TRANSLATION_KEYS } from "@/lib/i18n/useTranslation";

interface PostActionsProps {
  isLiked: boolean;
  isLikeProcessing: boolean;
  isLikeError: boolean;
  onLike: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onBookmark?: () => void;
  isBookmarked?: boolean;
  isBookmarkProcessing?: boolean;
  variant?: "feed" | "detail";
  disabled?: boolean;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  teamColors?: {
    actionButtonActive: string;
    actionButtonInactive: string;
    postActionsBackground: string;
  };
}

/**
 * 게시물 액션 버튼 공통 컴포넌트
 * 좋아요, 댓글, 공유, 리포스트 버튼을 포함
 */
export default function PostActions({
  isLiked,
  isLikeProcessing,
  isLikeError,
  onLike,
  onComment,
  onShare,
  onBookmark,
  isBookmarked = false,
  isBookmarkProcessing = false,
  variant = "feed",
  disabled = false,
  likeCount = 0,
  commentCount = 0,
  shareCount = 0,
  teamColors,
}: PostActionsProps) {
  const { themed, theme } = useAppTheme();
  const { t } = useTranslation();

  const iconSize = variant === "detail" ? 24 : 22;

  return (
    <View
      style={[
        themed(variant === "detail" ? $detailActionSection : $feedActionBar),
        // 팀별 PostActions 배경색 적용 - 더 완전한 커버리지
        teamColors?.postActionsBackground && {
          backgroundColor: teamColors.postActionsBackground,
          borderRadius: 8, // 자연스러운 모서리 처리
          marginHorizontal: -4, // 좌우 여백 확장으로 빈틈 제거
          // paddingHorizontal: 20, // 확장된 마진에 맞춰 패딩 조정
        },
      ]}
    >
      {/* 좋아요 버튼 */}
      <TouchableOpacity
        onPress={onLike}
        disabled={isLikeProcessing || disabled}
        style={themed($actionButton)}
      >
        <Ionicons
          name={isLiked ? "heart" : "heart-outline"}
          size={iconSize}
          color={isLiked ? (teamColors?.actionButtonActive || theme.colors.error) : (teamColors?.actionButtonInactive || theme.colors.textDim)}
        />
        <Text style={[themed($actionCount), { color: teamColors?.actionButtonInactive || theme.colors.textDim }]}>{likeCount}</Text>
      </TouchableOpacity>

      {/* 댓글 버튼 */}
      <TouchableOpacity style={themed($actionButton)} onPress={onComment}>
        <Ionicons
          name="chatbubble-outline"
          size={iconSize}
          color={teamColors?.actionButtonInactive || theme.colors.textDim}
        />
        <Text style={[themed($actionCount), { color: teamColors?.actionButtonInactive || theme.colors.textDim }]}>{commentCount}</Text>
      </TouchableOpacity>

      {/* 북마크 버튼 */}
      <TouchableOpacity
        style={themed($actionButton)}
        onPress={onBookmark}
        disabled={isBookmarkProcessing || disabled}
      >
        <Ionicons
          name={isBookmarked ? "bookmark" : "bookmark-outline"}
          size={iconSize}
          color={isBookmarked ? (teamColors?.actionButtonActive || theme.colors.tint) : (teamColors?.actionButtonInactive || theme.colors.textDim)}
        />
      </TouchableOpacity>
    </View>
  );
}

// --- 스타일 정의 ---
const $feedActionBar: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  zIndex: 10, // TeamDecorationRenderer(zIndex: 5)보다 높게 설정하여 겹침 방지
});

const $detailActionSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-around",
  paddingVertical: spacing.lg,
  paddingHorizontal: spacing.md,
  zIndex: 10, // TeamDecorationRenderer(zIndex: 5)보다 높게 설정하여 겹침 방지
});

const $actionButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: spacing.xs,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
});

const $actionCount: ThemedStyle<TextStyle> = () => ({
  fontSize: 15,
  fontWeight: "bold",
});

const $actionText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  marginLeft: spacing.xs,
  fontSize: 14,
  fontWeight: "500",
  color: colors.textDim,
});
