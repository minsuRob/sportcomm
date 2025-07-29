import React from "react";
import { View, Text, ViewStyle, TextStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { useTranslation, TRANSLATION_KEYS } from "@/lib/i18n/useTranslation";

interface PostStatsProps {
  likeCount: number;
  commentCount: number;
  viewCount: number;
  variant?: "feed" | "detail";
}

/**
 * 게시물 통계 정보 공통 컴포넌트
 * 좋아요, 댓글, 조회수를 표시
 */
export default function PostStats({
  likeCount,
  commentCount,
  viewCount,
  variant = "feed",
}: PostStatsProps) {
  const { themed, theme } = useAppTheme();
  const { t } = useTranslation();

  const iconSize = variant === "detail" ? 16 : 16;

  if (variant === "detail") {
    return (
      <View style={themed($detailStatsSection)}>
        <Text style={themed($detailStatText)}>
          {t(TRANSLATION_KEYS.POST_LIKE_COUNT, { count: likeCount })}
        </Text>
        <Text style={themed($detailStatText)}>
          {t(TRANSLATION_KEYS.POST_COMMENT_COUNT, { count: commentCount })}
        </Text>
        <Text style={themed($detailStatText)}>
          {t(TRANSLATION_KEYS.POST_VIEW_COUNT, { count: viewCount })}
        </Text>
      </View>
    );
  }

  return (
    <View style={themed($feedStats)}>
      <Ionicons
        name="heart-outline"
        color={theme.colors.textDim}
        size={iconSize}
      />
      <Text style={themed($feedStatText)}>
        {t(TRANSLATION_KEYS.POST_LIKE_COUNT, { count: likeCount })}
      </Text>
      <Ionicons
        name="chatbubble-outline"
        color={theme.colors.textDim}
        size={iconSize}
      />
      <Text style={themed($feedStatText)}>
        {t(TRANSLATION_KEYS.POST_COMMENT_COUNT, { count: commentCount })}
      </Text>
      <Ionicons
        name="eye-outline"
        color={theme.colors.textDim}
        size={iconSize}
      />
      <Text style={themed($feedStatText)}>
        {t(TRANSLATION_KEYS.POST_VIEW_COUNT, { count: viewCount })}
      </Text>
    </View>
  );
}

// --- 스타일 정의 ---
const $feedStats: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  marginTop: spacing.sm,
});

const $feedStatText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  marginLeft: spacing.xxxs,
  fontSize: 14,
  color: colors.textDim,
  marginRight: spacing.md,
});

const $detailStatsSection: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-around",
  paddingVertical: spacing.md,
  borderTopWidth: 1,
  borderBottomWidth: 1,
  borderColor: colors.border,
  marginHorizontal: spacing.md,
});

const $detailStatText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
});
