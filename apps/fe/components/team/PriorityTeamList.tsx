import React from "react";
import { View, Text, TouchableOpacity, ScrollView, ViewStyle, TextStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import TeamLogo from "@/components/TeamLogo";

/**
 * 팀 순번 표시용 TeamList
 * - TeamList를 기반으로 X 버튼과 우선순위 표시 기능 추가
 * - 팀 로고 + 이름 + X 버튼 + 우선순위 번호 표시
 */

interface PriorityTeamListProps {
  /** 표시할 팀 배열 */
  teams: Array<{
    teamId: string;
    team: {
      id: string;
      name: string;
      logoUrl?: string;
      icon?: string;
      color?: string;
    };
  }>;
  /** 팀 로고 크기 (기본값: 48) */
  size?: number;
  /** 우선순위 표시를 위한 인덱스 시작값 (기본값: 0) */
  startIndex?: number;
  /** X 버튼 클릭 핸들러 */
  onRemove?: (teamId: string) => void;
  /** 최대 표시 개수 (기본값: 전체 표시) */
  maxItems?: number;
}

export default function PriorityTeamList({
  teams,
  size = 48,
  startIndex = 0,
  onRemove,
  maxItems,
}: PriorityTeamListProps): React.ReactElement {
  const { themed, theme } = useAppTheme();

  const displayTeams = maxItems ? teams.slice(0, maxItems) : teams;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={themed($priorityScrollContent)}
    >
      {displayTeams.map((userTeam, idx) => {
        const priorityNumber = startIndex + idx;
        const teamColor = userTeam.team.color || theme.colors.tint;

        return (
          <View key={userTeam.teamId} style={themed($priorityItemWrap)}>
            {/* 제거(X) 버튼 */}
            {onRemove && (
              <TouchableOpacity
                style={themed($priorityRemoveBtn)}
                onPress={() => onRemove(userTeam.teamId)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons
                  name="close"
                  size={14}
                  color={theme.colors.text}
                />
              </TouchableOpacity>
            )}

            {/* 팀 로고 표시 (우선순위 표시용) */}
            <View
              style={[
                themed($priorityLogoBase),
                {
                  backgroundColor: teamColor + "20", // 연한 배경색
                  borderColor: teamColor,
                },
              ]}
            >
              {/* 우선순위 번호 오버레이 */}
              <View style={themed($priorityNumberOverlay)}>
                <Text style={themed($priorityNumberText)}>{priorityNumber + 1}</Text>
              </View>

              <TeamLogo
                logoUrl={userTeam.team.logoUrl}
                fallbackIcon={userTeam.team.icon}
                teamName={userTeam.team.name}
                size={size}
              />
            </View>

            <Text style={themed($priorityTeamName)} numberOfLines={1}>
              {userTeam.team.name}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

/* ================================
   스타일 정의 (ThemedStyle 사용)
   ================================ */

const $priorityScrollContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "flex-start",
  gap: spacing.md,
  paddingVertical: spacing.xs,
});

const $priorityItemWrap: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  position: "relative",
  minWidth: 80,
});

const $priorityRemoveBtn: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: "absolute",
  top: -8,
  right: 6,
  backgroundColor: colors.backgroundAlt,
//   backgroundColor: colors.error + "80",
  width: 20,
  height: 20,
  borderRadius: 10,
  alignItems: "center",
  justifyContent: "center",
  zIndex: 2,
});

const $priorityLogoBase: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 56,
  height: 56,
  borderRadius: 28,
  borderWidth: 2,
  alignItems: "center",
  justifyContent: "center",
  shadowColor: "#000",
  shadowOpacity: 0.15,
  shadowOffset: { width: 0, height: 2 },
  shadowRadius: 4,
  elevation: 3,
});

const $priorityNumberOverlay: ThemedStyle<ViewStyle> = () => ({
  position: "absolute",
  top: -10,
  left: -8,
  backgroundColor: "#fff",
  width: 20,
  height: 20,
  borderRadius: 10,
  alignItems: "center",
  justifyContent: "center",
  shadowColor: "#000",
  shadowOpacity: 0.2,
  shadowOffset: { width: 0, height: 1 },
  shadowRadius: 2,
  elevation: 2,
  zIndex: 1,
});

const $priorityNumberText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 10,
  fontWeight: "800",
  color: colors.text,
});

const $priorityTeamName: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  marginTop: spacing.xs,
  fontSize: 11,
  fontWeight: "600",
  color: colors.text,
  textAlign: "center",
  maxWidth: 70,
});
