import React, { useEffect, useMemo, useState } from "react";
import { useTeamColorSelection } from "@/lib/hooks/useTeamColorSelection";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery } from "@apollo/client";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import {
  GET_MY_TEAMS,
  type Team,
  type GetMyTeamsResult,
} from "@/lib/graphql/teams";
import TeamLogo from "@/components/TeamLogo";
import { getTeamColors } from "@/lib/theme/teams/teamColor";

/**
 * 상세 페이지: 팀 기반 앱 색상 설정
 *
 * 목적:
 * - 사용자의 myTeams를 기존 쿼리(GET_MY_TEAMS)로 조회하여 팀별 `mainColor`/`subColor` 를 미리보고
 *   앱 테마의 tint/accent 를 해당 팀 색상으로 오버라이드할 수 있도록 함.
 *
 * 동작:
 * - 팀 선택 시 ThemeProvider에 노출된 `setTeamColorTeamId` 를 호출하여 영구 저장 및 즉시 테마 반영
 * - '기본으로 되돌리기' 버튼으로 팀 기반 오버라이드 제거 (null)
 *
 * 주석/타입힌트는 한국어로 작성되었습니다.
 */

/**
 * 컴포넌트: TeamColorsDetailsScreen
 * 반환값: JSX.Element
 */
export default function TeamColorsDetailsScreen() {
  const router = useRouter();
  const { themed, theme, teamColorTeamId, setTeamColorOverride } =
    useAppTheme();

  // myTeams 조회: 기존 프로세스를 그대로 사용
  const {
    data: myTeamsData,
    loading: myTeamsLoading,
    error: myTeamsError,
    refetch,
  } = useQuery<GetMyTeamsResult>(GET_MY_TEAMS, {
    fetchPolicy: "cache-and-network",
  });

  // 로컬 선택 상태 (선택된 팀 ID 보여주기 용)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(
    teamColorTeamId ?? null,
  );

  // 팀 색상 선택 로직 (공유 hook 사용)
  const {
    getDefaultTeamByPriority,
    applyTeamColorByPriority,
    getPriorityBasedSelection,
  } = useTeamColorSelection({
    myTeamsData,
    teamColorTeamId,
    selectedTeamId,
    setTeamColorOverride,
  });

  // 사용자가 선택하지 않은 경우 priority 기반으로 자동 선택
  useEffect(() => {
    const defaultTeamId = getDefaultTeamByPriority();
    if (!selectedTeamId && !teamColorTeamId && defaultTeamId) {
      setSelectedTeamId(defaultTeamId);
    }
  }, [selectedTeamId, teamColorTeamId, getDefaultTeamByPriority]);

  // teamMap 캐시 (성능 최적화)
  const teamMap = useMemo(() => {
    const m = new Map<string, Team>();
    myTeamsData?.myTeams?.forEach((ut) => m.set(ut.team.id, ut.team));
    return m;
  }, [myTeamsData]);

  // 현재 적용된(저장된) 팀이 변경되면 로컬 selected 상태 동기화
  useEffect(() => {
    setSelectedTeamId(teamColorTeamId ?? null);
  }, [teamColorTeamId]);

  // 에러 로깅 및 UI 처리
  useEffect(() => {
    if (myTeamsError) {
      console.warn("팀 목록 조회 중 오류:", myTeamsError);
    }
  }, [myTeamsError]);

  /**
   * 팀명으로 slug를 유추하여 getTeamColors 매칭에 사용하는 헬퍼
   * - 한글/영문 일부 포함 여부 기반 간단 매핑
   */
  const deriveTeamSlug = (teamName?: string | null): string | null => {
    if (!teamName) return null;
    const n = teamName.toLowerCase();
    if (n.includes("한화") || n.includes("hanwha")) return "hanwha";
    if (n.includes("두산") || n.includes("doosan")) return "doosan";
    if (n.includes("삼성") || n.includes("samsung")) return "samsung";
    if (n.includes("기아") || n.includes("kia")) return "kia";
    if (n.includes("ssg") || n.includes("landers") || n.includes("랜더스"))
      return "ssg";
    if (n.includes("lg") && (n.includes("트윈스") || n.includes("twins")))
      return "lg";
    if (n.includes("롯데") || n.includes("lotte") || n.includes("giants"))
      return "lotte";
    if (n.includes("다이노스") || n.includes("dinos") || n.includes("nc"))
      return "nc";
    if (n.includes("위즈") || n.includes("wiz") || n === "kt") return "kt";
    if (n.includes("키움") || n.includes("kiwoom") || n.includes("heroes"))
      return "kiwoom";
    return null;
  };

  /**
   * 팀 선택 핸들러
   * - 이제는 UI 미리보기만 변경(로컬 상태)
   * - 실제 적용은 저장 버튼으로 수행
   */
  const handleSelectTeam = (teamId: string | null): void => {
    const nextId = selectedTeamId === teamId ? null : teamId;
    setSelectedTeamId(nextId);
  };

  /**
   * 저장 핸들러
   * - 현재 선택된 팀 기준으로 slug 유추 후 setTeamColorOverride 적용
   */
  const handleSave = async (): Promise<void> => {
    try {
      let slug: string | null = null;
      if (selectedTeamId) {
        const team = teamMap.get(selectedTeamId);
        slug = deriveTeamSlug(team?.name);
      }
      await setTeamColorOverride(selectedTeamId, slug);
    } catch (error) {
      console.error("팀 색상 저장 실패:", error);
    }
  };

  /**
   * 선택된 팀의 컬러 미리보기 객체 반환
   */
  const getPreviewForTeam = (teamId?: string | null) => {
    if (!teamId) {
      return {
        mainColor: theme.colors.tint,
        subColor: theme.colors.accent ?? theme.colors.backgroundAlt,
        label: "기본 앱 색상",
      };
    }
    const team = teamMap.get(teamId);
    const colors = getTeamColors(teamId, theme.isDark, team?.name);

    // 사용자가 직접 선택했는지 priority 기반 자동 선택인지 구분
    const isUserSelected = teamColorTeamId === teamId;
    const isPriorityBased = !teamColorTeamId && selectedTeamId === teamId && getDefaultTeamByPriority() === teamId;

    let label = team?.name ?? "선택된 팀";
    if (isPriorityBased) {
      label += " (주 팀)";
    } else if (isUserSelected) {
      label += " (직접 선택)";
    }

    return {
      mainColor: (colors as any).mainColor ?? theme.colors.tint,
      subColor:
        (colors as any).subColor ??
        theme.colors.accent ??
        theme.colors.backgroundAlt,
      label,
    };
  };

  const activePreview = getPreviewForTeam(selectedTeamId);

  return (
    <SafeAreaView style={themed($container)}>
      {/* 헤더 */}
      <View style={themed($header)}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={themed($backButton)}
        >
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>

        <Text style={themed($title)}>앱 색상 설정 (내 팀 기반)</Text>

        {/* 선택 상태 설명 */}
        <View style={themed($statusInfo)}>
          {teamColorTeamId ? (
            <Text style={themed($statusText)}>직접 선택한 팀 색상 적용 중</Text>
          ) : selectedTeamId ? (
            <Text style={themed($statusText)}>주 팀 색상 자동 적용 중</Text>
          ) : (
            <Text style={themed($statusText)}>팀을 선택하여 색상을 설정하세요</Text>
          )}
        </View>

        <TouchableOpacity onPress={handleSave} style={themed($resetButton)}>
          <Text
            style={[
              themed($resetButtonText),
              { color: activePreview.mainColor },
            ]}
          >
            저장
          </Text>
        </TouchableOpacity>
      </View>

      {/* 현재 적용 미리보기 */}
      <View style={themed($previewCard)}>
        <View style={themed($previewRow)}>
          <View
            style={[
              themed($previewSwatch),
              { backgroundColor: activePreview.mainColor },
            ]}
          />
          <View
            style={[
              themed($previewSwatch),
              { backgroundColor: activePreview.subColor },
            ]}
          />
        </View>
        <Text style={themed($previewLabel)} numberOfLines={1}>
          현재: {activePreview.label}
        </Text>
      </View>

      {/* 팀 목록 */}
      <ScrollView
        style={themed($listContainer)}
        contentContainerStyle={themed($listContent)}
        showsVerticalScrollIndicator={false}
      >
        {myTeamsLoading ? (
          <View style={themed($loadingContainer)}>
            <ActivityIndicator size="large" color={activePreview.mainColor} />
            <Text style={themed($loadingText)}>내 팀을 불러오는 중...</Text>
          </View>
        ) : myTeamsError ? (
          <View style={themed($loadingContainer)}>
            <Text style={themed($loadingText)}>
              팀 목록을 불러오지 못했습니다.
            </Text>
            <TouchableOpacity
              onPress={() => refetch()}
              style={[
                themed($retryButton),
                { backgroundColor: activePreview.mainColor },
              ]}
            >
              <Text style={themed($retryButtonText)}>다시 시도</Text>
            </TouchableOpacity>
          </View>
        ) : !myTeamsData?.myTeams || myTeamsData.myTeams.length === 0 ? (
          <View style={themed($loadingContainer)}>
            <Text style={themed($loadingText)}>참여 중인 팀이 없습니다.</Text>
          </View>
        ) : (
          myTeamsData.myTeams.map((userTeam) => {
            const team = userTeam.team;
            const isActive = selectedTeamId === team.id;
            const isPrimaryTeam = userTeam.priority === 0; // 주 팀 여부
            const isUserSelected = teamColorTeamId === team.id; // 사용자가 직접 선택했는지
            const isAutoSelected = !teamColorTeamId && selectedTeamId === team.id && getDefaultTeamByPriority() === team.id; // priority 기반 자동 선택

            const teamColors = getTeamColors(
              team.id,
              theme.isDark,
              team.name as any,
            ) as any;
            const main = teamColors?.mainColor ?? theme.colors.tint;
            const sub =
              teamColors?.subColor ??
              theme.colors.accent ??
              theme.colors.backgroundAlt;

            return (
              <TouchableOpacity
                key={team.id}
                style={[
                  themed($teamRow),
                  isActive ? themed($teamRowActive) : null,
                  isActive
                    ? {
                        borderColor: activePreview.mainColor,
                        backgroundColor: activePreview.mainColor + "12",
                      }
                    : null,
                ]}
                onPress={() => handleSelectTeam(team.id)}
              >
                <TeamLogo
                  logoUrl={team.logoUrl}
                  fallbackIcon={team.icon}
                  teamName={team.name}
                  size={36}
                />
                <View style={themed($teamMeta)}>
                  <Text style={themed($teamName)} numberOfLines={1}>
                    {team.name}
                    {isPrimaryTeam && " ⭐"}
                    {isUserSelected && " ✓"}
                    {isAutoSelected && " 🤖"}
                  </Text>
                  <View style={themed($colorPreviewRow)}>
                    <View
                      style={[themed($colorDot), { backgroundColor: main }]}
                    />
                    <View
                      style={[themed($colorDot), { backgroundColor: sub }]}
                    />
                  </View>
                </View>

                {isActive ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={activePreview.mainColor}
                  />
                ) : (
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={theme.colors.textDim}
                  />
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ================================
   스타일 정의 (ThemedStyle 사용)
   ================================ */
const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
});

const $header: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
  backgroundColor: colors.card,
});

const $backButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.xs,
});

const $title: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
  fontWeight: "700",
  color: colors.text,
  flex: 1,
  textAlign: "center",
});

const $resetButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.xs,
  marginLeft: spacing.xs,
});

const $resetButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  fontWeight: "600",
});

const $previewCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  gap: spacing.sm,
  backgroundColor: colors.backgroundAlt,
});

const $previewRow: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  gap: 8,
});

const $previewSwatch: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  width: 28,
  height: 28,
  borderRadius: 6,
});

const $previewLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  fontWeight: "600",
  marginLeft: 8,
});

const $listContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  paddingHorizontal: spacing.md,
  marginTop: spacing.sm,
});

const $listContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingBottom: spacing.lg,
});

const $loadingContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  padding: spacing.lg,
  alignItems: "center",
});

const $loadingText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  marginTop: 8,
});

const $retryButton: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  marginTop: spacing.md,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  backgroundColor: colors.tint,
  borderRadius: 8,
});

const $retryButtonText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontWeight: "700",
});

const $teamRow: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.sm,
  gap: spacing.md,
  backgroundColor: colors.card,
  marginBottom: spacing.xs,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: colors.border,
});

const $teamRowActive: ThemedStyle<ViewStyle> = ({ colors }) => ({
  borderColor: colors.tint,
  backgroundColor: colors.tint + "12", // 살짝 tint 배경
});

const $teamMeta: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  justifyContent: "center",
});

const $teamName: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  fontSize: 15,
  fontWeight: "600",
});

const $colorPreviewRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.xs,
  marginTop: 6,
});

const $colorDot: ThemedStyle<ViewStyle> = () => ({
  width: 18,
  height: 18,
  borderRadius: 4,
  borderWidth: 0.5,
  borderColor: "rgba(0,0,0,0.06)",
});

const $statusInfo: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  position: "absolute",
  top: 60,
  left: spacing.md,
  right: spacing.md,
  backgroundColor: "rgba(0,0,0,0.7)",
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 6,
});

const $statusText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 12,
  fontWeight: "500",
  textAlign: "center",
});

/*
커밋 메시지 (git): refactor(team-colors-select): useTeamColorSelection hook 도입하여 코드 중복 제거
*/
