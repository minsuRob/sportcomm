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

  const iconSize = variant === "detail" ? 18 : 16;

  if (variant === "detail") {
    // 상세 화면: 아이콘 + 수치 인라인 바
    return (
      <View style={themed($detailStatsSection)}>
        <View style={themed($statItem)}>
          <Ionicons
            name="heart-outline"
            size={iconSize}
            color={theme.colors.textDim}
          />
          <Text style={themed($detailStatValue)}>{likeCount}</Text>
        </View>
        <View style={themed($statItem)}>
          <Ionicons
            name="chatbubble-outline"
            size={iconSize}
            color={theme.colors.textDim}
          />
          <Text style={themed($detailStatValue)}>{commentCount}</Text>
        </View>
        <View style={themed($statItem)}>
          <Ionicons
            name="eye-outline"
            size={iconSize}
            color={theme.colors.textDim}
          />
          <Text style={themed($detailStatValue)}>{viewCount}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={themed($feedStats)}>
      <View style={themed($statItem)}>
        <Ionicons
          name="heart-outline"
          size={iconSize}
          color={theme.colors.textDim}
        />
        <Text style={themed($statText)}>{likeCount}</Text>
      </View>
      <View style={themed($statItem)}>
        <Ionicons
          name="chatbubble-outline"
          size={iconSize}
          color={theme.colors.textDim}
        />
        <Text style={themed($statText)}>{commentCount}</Text>
      </View>
      <View style={themed($statItem)}>
        <Ionicons
          name="eye-outline"
          size={iconSize}
          color={theme.colors.textDim}
        />
        <Text style={themed($statText)}>{viewCount}</Text>
      </View>
    </View>
  );
}

// --- 스타일 정의 ---
const $feedStats: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.xs,
});

const $statItem: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
});

const $feedStatText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 13,
  color: colors.textDim,
  fontWeight: "600",
});

const $detailStatsSection: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  borderTopWidth: 1,
  borderColor: colors.border,
});

const $detailStatText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
  marginBottom: 4,
});

const $detailStatValue: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
  fontWeight: "600",
});

const $statText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 14,
  color: colors.textDim,
  marginLeft: spacing.xs,
});
