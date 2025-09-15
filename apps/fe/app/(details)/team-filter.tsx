import React, { useEffect, useMemo, useState } from "react";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@apollo/client";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import {
  GET_MY_TEAMS,
  type Team,
  type GetMyTeamsResult,
} from "@/lib/graphql/teams";
import TeamLogo from "@/components/TeamLogo";
import TeamFilterSelector from "@/components/TeamFilterSelector";
import { showToast } from "@/components/CustomToast";

/**
 * 상세 페이지: 팀 필터 설정
 *
 * 목적:
 * - 피드/목록 등에서 사용할 "팀 필터"를 전역 저장(AsyncStorage)하고,
 *   전체 앱에서 일관되게 사용할 수 있도록 합니다.
 *
 * 동작:
 * - TeamFilterSelector 모달을 "제어 모드"로 감싸서 전체 화면 UX로 제공합니다.
 * - 적용 시 AsyncStorage("selected_team_filter")에 저장하고 이전 화면으로 복귀합니다.
 *
 * 주석/타입힌트는 한국어로 작성되었습니다.
 */

const STORAGE_KEY = "selected_team_filter";

/**
 * AsyncStorage에서 팀 필터를 불러옵니다.
 * - 존재하지 않거나 파싱 실패 시 null(모든 팀) 반환
 */
async function loadStoredFilter(): Promise<string[] | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as string[];
    return null;
  } catch (e) {
    console.warn("팀 필터 불러오기 실패:", (e as any)?.message);
    return null;
  }
}

/**
 * 팀 필터를 저장합니다. null은 "모든 팀" 의미로 저장 시 null을 그대로 JSON화합니다.
 */
async function saveFilter(next: string[] | null): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (e) {
    console.warn("팀 필터 저장 실패:", (e as any)?.message);
  }
}

export default function TeamFilterDetailsScreen(): React.ReactElement {
  const router = useRouter();
  const { themed, theme } = useAppTheme();

  // 모달 제어 상태
  const [modalOpen, setModalOpen] = useState<boolean>(true);

  // 현재 선택된 팀 ID 목록 (null은 '모든 팀')
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[] | null>(null);

  // 외부 로딩 상태 (적용 버튼 동작 시 사용)
  const [applying, setApplying] = useState<boolean>(false);

  // 내 팀 목록 조회 (요약 및 초기 표시용)
  const {
    data: myTeamsData,
    loading: myTeamsLoading,
    error: myTeamsError,
    refetch: refetchMyTeams,
  } = useQuery<GetMyTeamsResult>(GET_MY_TEAMS, {
    fetchPolicy: "cache-and-network",
  });

  // 화면 진입 시 저장된 필터 불러오기
  useEffect(() => {
    let mounted = true;
    (async () => {
      const stored = await loadStoredFilter();
      if (mounted) {
        setSelectedTeamIds(stored); // null(모든 팀) 또는 string[]
        // 최초 진입 시 모달을 자동으로 열어 전체 UX 제공
        setModalOpen(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // 팀 요약 표시를 위한 맵 캐시
  const teamMap = useMemo(() => {
    const m = new Map<string, Team>();
    myTeamsData?.myTeams?.forEach((ut) => m.set(ut.team.id, ut.team));
    return m;
  }, [myTeamsData]);

  /**
   * 팀 필터 적용 핸들러
   * - TeamFilterSelector 내부 "적용"에서 호출됨
   * - AsyncStorage 저장 후 이전 화면으로 이동
   */
  const handleApplySelection = async (ids: string[] | null): Promise<void> => {
    try {
      setApplying(true);
      // 저장
      await saveFilter(ids);
      setSelectedTeamIds(ids);

      showToast({
        type: "success",
        title: "적용 완료",
        message:
          !ids || ids.length === 0
            ? "모든 팀으로 필터가 설정되었습니다."
            : `${ids.length}개 팀으로 필터가 설정되었습니다.`,
        duration: 1500,
      });

      // 이전 화면으로 복귀
      router.back();
    } catch (error) {
      showToast({
        type: "error",
        title: "저장 실패",
        message: "팀 필터를 저장하는 중 문제가 발생했습니다.",
        duration: 2500,
      });
    } finally {
      setApplying(false);
    }
  };

  /**
   * 현재 요약 텍스트
   */
  const getSummaryText = (): string => {
    if (!selectedTeamIds || selectedTeamIds.length === 0) return "모든 팀";
    if (selectedTeamIds.length === 1) {
      const team = teamMap.get(selectedTeamIds[0]);
      return team?.name ?? "1개 팀";
    }
    return `${selectedTeamIds.length}개 팀`;
  };

  /**
   * 현재 요약 로고 (대표 1개만)
   */
  const getSummaryLogo = (): {
    logoUrl?: string;
    fallbackIcon?: string;
    teamName: string;
  } => {
    if (!selectedTeamIds || selectedTeamIds.length === 0) {
      return { logoUrl: undefined, fallbackIcon: "🏆", teamName: "모든 팀" };
    }
    const team = teamMap.get(selectedTeamIds[0]);
    return {
      logoUrl: team?.logoUrl,
      fallbackIcon: team?.icon,
      teamName: team?.name ?? "선택된 팀",
    };
  };

  return (
    <SafeAreaView style={themed($container)}>
      {/* 헤더 */}
      <View style={themed($header)}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={themed($backButton)}
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기"
        >
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>

        <Text style={themed($title)}>팀 필터 설정</Text>

        <TouchableOpacity
          onPress={async () => {
            // 전체 해제 → 모든 팀
            await handleApplySelection(null);
          }}
          style={themed($resetButton)}
        >
          <Text style={themed($resetText)}>모든 팀</Text>
        </TouchableOpacity>
      </View>

      {/* 현재 상태 요약 */}
      <View style={themed($summarySection)}>
        <View style={themed($summaryRow)}>
          <TeamLogo
            logoUrl={getSummaryLogo().logoUrl}
            fallbackIcon={getSummaryLogo().fallbackIcon}
            teamName={getSummaryLogo().teamName}
            size={28}
          />
          <Text style={themed($summaryText)} numberOfLines={1}>
            현재 필터: {getSummaryText()}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setModalOpen(true)}
          style={themed($primaryButton)}
        >
          <Ionicons name="funnel-outline" size={16} color="#fff" />
          <Text style={themed($primaryButtonText)}>팀 선택하기</Text>
        </TouchableOpacity>
      </View>

      {/* 안내/상태 영역 */}
      <ScrollView
        contentContainerStyle={themed($content)}
        showsVerticalScrollIndicator={false}
      >
        {myTeamsLoading ? (
          <View style={themed($stateRow)}>
            <ActivityIndicator size="small" color={theme.colors.tint} />
            <Text style={themed($stateText)}>내 팀 정보를 불러오는 중...</Text>
          </View>
        ) : myTeamsError ? (
          <View style={themed($stateRow)}>
            <Text style={themed($errorText)}>
              내 팀 정보를 불러오지 못했습니다.
            </Text>
            <TouchableOpacity
              onPress={() => refetchMyTeams()}
              style={themed($retryButton)}
            >
              <Text style={themed($retryButtonText)}>다시 시도</Text>
            </TouchableOpacity>
          </View>
        ) : !myTeamsData?.myTeams || myTeamsData.myTeams.length === 0 ? (
          <Text style={themed($hintText)}>
            아직 선택한 팀이 없습니다. My Team을 먼저 선택해 주세요.
          </Text>
        ) : (
          <>
            <Text style={themed($hintText)}>
              특정 팀만 보고 싶다면 필터에 추가하세요. 설정은 언제든 변경할 수
              있습니다.
            </Text>
            <View style={themed($chipsRow)}>
              {myTeamsData.myTeams.slice(0, 8).map((ut) => {
                const isOn =
                  selectedTeamIds?.includes(ut.team.id) ||
                  (!selectedTeamIds && true);
                return (
                  <View
                    key={ut.id}
                    style={[
                      themed($chip),
                      isOn ? themed($chipOn) : themed($chipOff),
                    ]}
                  >
                    <Text style={themed($chipText)} numberOfLines={1}>
                      {ut.team.name}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {/* TeamFilterSelector 모달 (제어 모드) */}
      <TeamFilterSelector
        onTeamSelect={handleApplySelection}
        selectedTeamIds={selectedTeamIds}
        loading={applying}
        open={modalOpen}
        onOpenChange={setModalOpen}
        hideTriggerButton
      />
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

const $resetButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.xs,
  marginLeft: spacing.xs,
});

const $resetText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  fontWeight: "700",
});

const $summarySection: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
  gap: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
  backgroundColor: colors.backgroundAlt,
});

const $summaryRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
});

const $summaryText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  fontWeight: "600",
});

const $primaryButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
  backgroundColor: colors.tint,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderRadius: 10,
  alignSelf: "flex-start",
});

const $primaryButtonText: ThemedStyle<TextStyle> = () => ({
  color: "#fff",
  fontWeight: "700",
});

const $content: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.md,
  gap: spacing.md,
});

const $stateRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
});

const $stateText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
});

const $errorText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
  fontWeight: "700",
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

const $hintText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  fontSize: 13,
});

const $chipsRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.xs,
});

const $chip: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xxs,
  borderRadius: 12,
});

const $chipOn: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tint + "22",
  borderWidth: 1,
  borderColor: colors.tint,
});

const $chipOff: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.card,
  borderWidth: 1,
  borderColor: colors.border,
});

const $chipText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  fontSize: 12,
  fontWeight: "600",
});

/*
코드 설명:
- TeamFilterSelector를 모달 제어 방식(open/onOpenChange)으로 감싼 전체 화면 페이지입니다.
- 적용 시 AsyncStorage("selected_team_filter")에 저장하고 토스트로 피드백 후 router.back() 합니다.
- 헤더의 "모든 팀" 버튼으로 즉시 전체 해제/초기화가 가능합니다.
- 가독성과 유지보수를 위해 ThemedStyle 기반 스타일과 명확한 함수 분리를 적용했습니다.

커밋 메세지: feat(details): 팀 필터 설정 상세 페이지 추가 및 AsyncStorage 연동
*/
