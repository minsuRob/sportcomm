import React, { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import TeamSelector from "./TeamSelector";

/**
 * TeamSelector 사용 예제 컴포넌트
 *
 * favoriteDate 기능이 포함된 TeamSelector의 사용법을 보여줍니다.
 */
export default function TeamSelectorExample() {
  const { themed } = useAppTheme();
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const handleTeamSelect = (teamId: string | null) => {
    setSelectedTeamId(teamId);
  };

  return (
    <ScrollView style={themed($container)}>
      <View style={themed($section)}>
        <Text style={themed($title)}>팀 선택</Text>
        <TeamSelector
          selectedTeamId={selectedTeamId}
          onTeamSelect={handleTeamSelect}
          placeholder="팀을 선택해주세요"
        />
        {selectedTeamId && (
          <View style={themed($resultInfo)}>
            <Text style={themed($resultText)}>
              선택된 팀 ID: {selectedTeamId}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// --- 스타일 정의 ---
const $container: ThemedStyle<any> = ({ colors, spacing }) => ({
  flex: 1,
  backgroundColor: colors.background,
  padding: spacing.lg,
});

const $section: ThemedStyle<any> = ({ spacing }) => ({
  marginBottom: spacing.xl,
});

const $title: ThemedStyle<any> = ({ colors, spacing }) => ({
  fontSize: 18,
  fontWeight: "bold",
  color: colors.text,
  marginBottom: spacing.md,
});

const $resultInfo: ThemedStyle<any> = ({ colors, spacing }) => ({
  marginTop: spacing.md,
  padding: spacing.md,
  backgroundColor: colors.card,
  borderRadius: 8,
});

const $resultText: ThemedStyle<any> = ({ colors }) => ({
  fontSize: 14,
  color: colors.text,
  marginBottom: 4,
});
