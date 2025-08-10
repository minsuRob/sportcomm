import React from "react";
import { ActivityIndicator, View, ViewStyle } from "react-native";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";

interface ListFooterProps {
  loading: boolean;
}

/**
 * FlatList 하단 로딩 인디케이터
 */
export default function ListFooter({ loading }: ListFooterProps) {
  const { themed, theme } = useAppTheme();
  if (!loading) return null;
  return (
    <View style={themed($listFooter)}>
      <ActivityIndicator size="small" color={theme.colors.text} />
    </View>
  );
}

const $listFooter: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.md,
});
