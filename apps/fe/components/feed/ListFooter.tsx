import React from "react";
import { ActivityIndicator, View, ViewStyle, Text } from "react-native";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";

interface ListFooterProps {
  loading: boolean;
  error?: any;
}

/**
 * FlatList 하단 로딩 인디케이터
 */
export default function ListFooter({ loading, error }: ListFooterProps) {
  const { themed, theme } = useAppTheme();

  if (error) {
    // 에러가 있을 경우 간단한 메시지 표시 (스타일은 필요에 따라 조정)
    return (
      <View style={themed($listFooter)}>
        <Text style={{ color: theme.colors.error }}>
          데이터를 불러오는데 실패했습니다.
        </Text>
      </View>
    );
  }

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
