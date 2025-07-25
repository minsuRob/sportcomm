import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Heart, MessageCircle, Share, Repeat } from "lucide-react-native";
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
  onRepost?: () => void;
  variant?: "feed" | "detail";
  disabled?: boolean;
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
  onRepost,
  variant = "feed",
  disabled = false,
}: PostActionsProps) {
  const { themed, theme } = useAppTheme();
  const { t } = useTranslation();

  const iconSize = variant === "detail" ? 24 : 22;

  return (
    <View
      style={themed(
        variant === "detail" ? $detailActionSection : $feedActionBar
      )}
    >
      {/* 좋아요 버튼 */}
      <TouchableOpacity
        onPress={onLike}
        disabled={isLikeProcessing || disabled}
        style={[themed($actionButton), isLikeError && { opacity: 0.7 }]}
      >
        {isLikeProcessing ? (
          <>
            <View style={themed($loadingIndicator)}>
              <Heart
                size={iconSize}
                color={isLiked ? theme.colors.error : theme.colors.textDim}
                fill={isLiked ? theme.colors.error : "transparent"}
              />
            </View>
            <Text
              style={[
                themed($actionText),
                {
                  color: isLiked ? theme.colors.error : theme.colors.textDim,
                },
              ]}
            >
              {isLiked
                ? t(TRANSLATION_KEYS.POST_UNLIKING)
                : t(TRANSLATION_KEYS.POST_LIKING)}
            </Text>
          </>
        ) : (
          <>
            <Heart
              size={iconSize}
              color={isLiked ? theme.colors.error : theme.colors.textDim}
              fill={isLiked ? theme.colors.error : "transparent"}
            />
            <Text
              style={[
                themed($actionText),
                {
                  color: isLiked ? theme.colors.error : theme.colors.textDim,
                },
              ]}
            >
              {t(TRANSLATION_KEYS.POST_LIKE)}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* 댓글 버튼 */}
      <TouchableOpacity style={themed($actionButton)} onPress={onComment}>
        <MessageCircle size={iconSize} color={theme.colors.textDim} />
        <Text style={themed($actionText)}>
          {t(TRANSLATION_KEYS.POST_COMMENT)}
        </Text>
      </TouchableOpacity>

      {/* 피드에서는 리포스트, 상세에서는 공유 */}
      {variant === "feed" ? (
        <TouchableOpacity style={themed($actionButton)} onPress={onRepost}>
          <Repeat size={iconSize} color={theme.colors.textDim} />
          <Text style={themed($actionText)}>
            {t(TRANSLATION_KEYS.POST_REPOST)}
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={themed($actionButton)} onPress={onShare}>
          <Share size={iconSize} color={theme.colors.textDim} />
          <Text style={themed($actionText)}>
            {t(TRANSLATION_KEYS.POST_SHARE)}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// --- 스타일 정의 ---
const $feedActionBar: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-around",
  alignItems: "center",
  marginTop: spacing.sm,
  paddingTop: spacing.sm,
  borderTopWidth: 1,
  borderTopColor: colors.border,
});

const $detailActionSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-around",
  paddingVertical: spacing.lg,
  paddingHorizontal: spacing.md,
});

const $actionButton: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  alignItems: "center",
  minWidth: 70, // 최소 너비 설정으로 버튼 크기 안정화
});

const $loadingIndicator: ThemedStyle<ViewStyle> = () => ({
  opacity: 0.7,
  transform: [{ scale: 1.1 }],
});

const $actionText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  marginLeft: spacing.xs,
  fontSize: 14,
  fontWeight: "500",
  color: colors.textDim,
});
