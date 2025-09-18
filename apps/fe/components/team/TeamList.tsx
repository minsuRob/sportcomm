import React from "react";
import { View, Text, ScrollView, ViewStyle, TextStyle } from "react-native";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import TeamLogo from "@/components/TeamLogo";

/**
 * 팀 목록을 보여주는 가벼운 컴포넌트
 * - TeamLogo와 ScrollView만 담고 있어 재사용성이 높음
 * - 다른 곳에서도 공통된 my team 표시를 위해 사용 가능
 */

interface TeamListProps {
  /** 표시할 팀 배열 */
  teams: Array<{
    id: string;
    team: {
      id: string;
      name: string;
      logoUrl?: string;
      icon?: string;
    };
  }>;
  /** 팀 로고 크기 (기본값: 36) */
  size?: number;
  /** 가로 스크롤 여부 (기본값: true) */
  horizontal?: boolean;
  /** 최대 표시 개수 (기본값: 전체 표시) */
  maxItems?: number;
}

export default function TeamList({
  teams,
  size = 36,
  horizontal = true,
  maxItems,
}: TeamListProps): React.ReactElement {
  const { themed } = useAppTheme();

  const displayTeams = maxItems ? teams.slice(0, maxItems) : teams;

  if (horizontal) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={themed($teamsRow)}
      >
        {displayTeams.map((userTeam) => (
          <View key={userTeam.id} style={themed($teamLogoWrapper)}>
            <TeamLogo
              logoUrl={userTeam.team.logoUrl}
              fallbackIcon={userTeam.team.icon}
              teamName={userTeam.team.name}
              size={size}
            />
            <Text style={themed($teamName)} numberOfLines={1}>
              {userTeam.team.name}
            </Text>
          </View>
        ))}
      </ScrollView>
    );
  }

  // 세로 방향 (향후 확장 가능)
  return (
    <View style={themed($teamsColumn)}>
      {displayTeams.map((userTeam) => (
        <View key={userTeam.id} style={themed($teamItem)}>
          <TeamLogo
            logoUrl={userTeam.team.logoUrl}
            fallbackIcon={userTeam.team.icon}
            teamName={userTeam.team.name}
            size={size}
          />
          <Text style={themed($teamName)} numberOfLines={1}>
            {userTeam.team.name}
          </Text>
        </View>
      ))}
    </View>
  );
}

/* ================================
   스타일 정의 (ThemedStyle 사용)
   ================================ */

const $teamsRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.md,
});

const $teamLogoWrapper: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  width: 72,
});

const $teamName: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  fontSize: 11,
  marginTop: 6,
  textAlign: "center",
});

const $teamsColumn: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.md,
});

const $teamItem: ThemedStyle<ViewStyle> = () => ({
  alignItems: "center",
});
