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
    /** 팀 등록 순번 (선택사항) */
    teamRegistrationOrder?: number;
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

  // 디버깅: teamRegistrationOrder 값 확인
  console.log('🔍 TeamList received teams:', teams.map(team => ({
    id: team.id,
    teamName: team.team.name,
    teamRegistrationOrder: team.teamRegistrationOrder,
    displayOrder: team.teamRegistrationOrder === 0 ? 1 : team.teamRegistrationOrder,
    hasOrder: team.teamRegistrationOrder !== null && team.teamRegistrationOrder !== undefined
  })));

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
            <View style={themed($logoContainer)}>
              <TeamLogo
                logoUrl={userTeam.team.logoUrl}
                fallbackIcon={userTeam.team.icon}
                teamName={userTeam.team.name}
                size={size}
              />
              {userTeam.teamRegistrationOrder !== null && userTeam.teamRegistrationOrder !== undefined && (
                <View style={themed($orderBadge)}>
                  <Text style={themed($orderText)}>
                    {userTeam.teamRegistrationOrder === 0 ? 1 : userTeam.teamRegistrationOrder}
                  </Text>
                </View>
              )}
            </View>
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
          <View style={themed($logoContainer)}>
            <TeamLogo
              logoUrl={userTeam.team.logoUrl}
              fallbackIcon={userTeam.team.icon}
              teamName={userTeam.team.name}
              size={size}
            />
            {userTeam.teamRegistrationOrder !== null && userTeam.teamRegistrationOrder !== undefined && (
              <View style={themed($orderBadge)}>
                <Text style={themed($orderText)}>
                  {userTeam.teamRegistrationOrder === 0 ? 1 : userTeam.teamRegistrationOrder}
                </Text>
              </View>
            )}
          </View>
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

const $logoContainer: ThemedStyle<ViewStyle> = () => ({
  position: "relative",
  alignItems: "center",
});

const $orderBadge: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: "absolute",
  top: -4,
  right: -4,
  backgroundColor: colors.tint,
  borderRadius: 8,
  minWidth: 16,
  height: 16,
  justifyContent: "center",
  alignItems: "center",
  borderWidth: 1,
  borderColor: colors.background,
});

const $orderText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.background,
  fontSize: 10,
  fontWeight: "700",
  textAlign: "center",
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
