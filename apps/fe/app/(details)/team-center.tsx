import React, { useMemo } from "react";
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
import { GET_MY_TEAMS, type GetMyTeamsResult } from "@/lib/graphql/teams";
import TeamList from "@/components/team/TeamList";

/**
 * Team Center (상세 페이지)
 * - 팀 관련 기능으로 이동하는 허브 페이지입니다.
 * - 현재 선택된 내 팀 요약을 보여주고, 하위 기능으로 내비게이션을 제공합니다.
 *
 * 제공 기능:
 * 1) My Team 선택/관리 → /(modals)/team-selection
 * 2) 앱 색상 (내 팀 기반) → /(details)/team-colors-select
 *
 * 주석 및 타입 힌트는 한국어로 제공합니다.
 */

export default function TeamCenterScreen(): React.ReactElement {
  const router = useRouter();
  const { themed, theme } = useAppTheme();

  // 내 팀 목록 조회 (요약 표시용)
  const {
    data: myTeamsData,
    loading: myTeamsLoading,
    error: myTeamsError,
    refetch: refetchMyTeams,
  } = useQuery<GetMyTeamsResult>(GET_MY_TEAMS, {
    fetchPolicy: "cache-and-network",
  });

  // 상단 요약에 보여줄 팀 배열 (최대 6개)
  const topTeams = useMemo(() => {
    const teams = myTeamsData?.myTeams ?? [];
    // priority 오름차순 정렬 후 상위 6개만
    const sorted = [...teams].sort(
      (a, b) => (a.priority ?? 999) - (b.priority ?? 999),
    );
    return sorted.slice(0, 6);
  }, [myTeamsData]);

  // 내비게이션 핸들러들
  const goBack = (): void => router.back();
  const goTeamSelection = (): void =>
    router.push("/(modals)/team-selection?origin=team-center"); // origin 파라미터로 복귀 경로 식별
  const goTeamColors = (): void => router.push("/(details)/team-colors-select");
  const goTeamFilter = (): void => router.push("/(details)/team-filter");
  const goMyTeamsSettings = (): void =>
    router.push("/(details)/my-teams-settings");

  return (
    <SafeAreaView style={themed($container)}>
      {/* 헤더 */}
      <View style={themed($header)}>
        <TouchableOpacity
          onPress={goBack}
          style={themed($backButton)}
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기"
        >
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={themed($title)}>팀 센터</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* 콘텐츠 */}
      <ScrollView
        contentContainerStyle={themed($content)}
        showsVerticalScrollIndicator={false}
      >
        {/* 내 팀 요약 섹션 */}
        <Text style={themed($sectionTitle)}>내 팀 요약</Text>

        <View style={themed($summaryCard)}>
          {myTeamsLoading ? (
            <View style={themed($loadingRow)}>
              <ActivityIndicator size="small" color={theme.colors.tint} />
              <Text style={themed($loadingText)}>불러오는 중...</Text>
            </View>
          ) : myTeamsError ? (
            <View style={themed($loadingRow)}>
              <Text style={themed($errorText)}>
                팀 정보를 불러오지 못했습니다.
              </Text>
              <TouchableOpacity
                onPress={() => refetchMyTeams()}
                style={themed($retryButton)}
              >
                <Text style={themed($retryButtonText)}>다시 시도</Text>
              </TouchableOpacity>
            </View>
          ) : !myTeamsData?.myTeams || myTeamsData.myTeams.length === 0 ? (
            <View style={themed($emptyState)}>
              <Text style={themed($emptyText)}>아직 선택한 팀이 없습니다</Text>
              <TouchableOpacity
                onPress={goTeamSelection}
                style={themed($primaryButton)}
              >
                <Ionicons name="trophy-outline" size={16} color="#fff" />
                <Text style={themed($primaryButtonText)}>My Team 선택하기</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={themed($teamsContainer)}>
              <TeamList teams={topTeams} />
              {/* 더보기 버튼 */}
              {myTeamsData.myTeams.length > topTeams.length && (
                <TouchableOpacity
                  onPress={goTeamSelection}
                  style={themed($moreButton)}
                >
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={20}
                    color={theme.colors.tint}
                  />
                  <Text style={themed($moreButtonText)}>더보기</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* 기능 목록 */}
        <Text style={themed($sectionTitle)}>기능</Text>
        <View style={themed($actionList)}>
          {/* My Team 선택/관리 */}
          <TouchableOpacity
            style={themed($actionItem)}
            onPress={goTeamSelection}
            accessibilityRole="button"
            accessibilityLabel="My Team 선택 및 관리 열기"
          >
            <View style={themed($actionIcon)}>
              <Ionicons
                name="trophy-outline"
                size={20}
                color={theme.colors.tint}
              />
            </View>
            <View style={themed($actionMeta)}>
              <Text style={themed($actionTitle)}>My Team 선택/관리</Text>
              <Text style={themed($actionDesc)}>
                응원할 팀을 선택하고 최애 선수, 팬이 된 날짜 등을 설정해요.
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={theme.colors.textDim}
              style={themed($chevron)}
            />
          </TouchableOpacity>

          {/* 팀 필터 (피드/목록) */}
          <TouchableOpacity
            style={themed($actionItem)}
            onPress={goTeamFilter}
            accessibilityRole="button"
            accessibilityLabel="팀 필터 설정 열기"
          >
            <View style={themed($actionIcon)}>
              <Ionicons
                name="funnel-outline"
                size={20}
                color={theme.colors.tint}
              />
            </View>
            <View style={themed($actionMeta)}>
              <Text style={themed($actionTitle)}>팀 필터</Text>
              <Text style={themed($actionDesc)}>
                보고 싶은 팀만 선택해 피드/목록을 필터링해요.
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={theme.colors.textDim}
              style={themed($chevron)}
            />
          </TouchableOpacity>

          {/* 앱 색상 (내 팀 기반) */}
          <TouchableOpacity
            style={themed($actionItem)}
            onPress={goTeamColors}
            accessibilityRole="button"
            accessibilityLabel="앱 색상 설정 열기"
          >
            <View style={themed($actionIcon)}>
              <Ionicons
                name="color-palette-outline"
                size={20}
                color={theme.colors.tint}
              />
            </View>
            <View style={themed($actionMeta)}>
              <Text style={themed($actionTitle)}>앱 색상 (내 팀 기반)</Text>
              <Text style={themed($actionDesc)}>
                선택한 팀의 대표 색상으로 앱의 포인트 컬러를 맞춰보세요.
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={theme.colors.textDim}
              style={themed($chevron)}
            />
          </TouchableOpacity>

          {/* My Teams 상세설정 */}
          <TouchableOpacity
            style={themed($actionItem)}
            onPress={goMyTeamsSettings}
            accessibilityRole="button"
            accessibilityLabel="My Teams 상세설정 페이지 열기"
          >
            <View style={themed($actionIcon)}>
              <Ionicons
                name="settings-outline"
                size={20}
                color={theme.colors.tint}
              />
            </View>
            <View style={themed($actionMeta)}>
              <Text style={themed($actionTitle)}>My Teams 상세설정</Text>
              <Text style={themed($actionDesc)}>
                순서 변경 및 날짜·최애선수·포토카드 인라인 설정.
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={theme.colors.textDim}
              style={themed($chevron)}
            />
          </TouchableOpacity>
        </View>
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
});

const $content: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.md,
  paddingBottom: spacing.xl,
  gap: spacing.md,
});

const $sectionTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  fontWeight: "700",
  color: colors.textDim,
  marginBottom: 6,
});

const $summaryCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.card,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.border,
  padding: spacing.md,
});

const $loadingRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
});

const $loadingText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
});

const $errorText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
  fontWeight: "600",
});

const $retryButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  marginLeft: spacing.sm,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.xs,
  backgroundColor: colors.tint,
  borderRadius: 8,
});

const $retryButtonText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontWeight: "700",
});

const $emptyState: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  gap: spacing.sm,
});

const $emptyText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  fontSize: 14,
});

const $primaryButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
  backgroundColor: colors.tint,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderRadius: 10,
});

const $primaryButtonText: ThemedStyle<TextStyle> = () => ({
  color: "#fff",
  fontWeight: "700",
});

const $teamsContainer: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  alignItems: "center",
});

const $moreButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.backgroundAlt,
});

const $moreButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  fontSize: 12,
  fontWeight: "600",
  marginTop: 4,
});

const $actionList: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.card,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.border,
});

const $actionItem: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
  gap: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $actionIcon: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 36,
  height: 36,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 18,
  backgroundColor: colors.tint + "1A",
});

const $actionMeta: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $actionTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  fontSize: 15,
  fontWeight: "700",
});

const $actionDesc: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  fontSize: 12,
  marginTop: 2,
});

const $chevron: ThemedStyle<TextStyle> = () => ({
  marginLeft: 8,
});

/*
커밋 메세지: feat(details): 팀 센터 페이지 추가 및 팀 기능 내비게이션 제공
*/
