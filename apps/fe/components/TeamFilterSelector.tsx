import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@apollo/client";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import {
  GET_MY_TEAMS,
  type Team,
  type GetMyTeamsResult,
} from "@/lib/graphql/teams";
import TeamLogo from "@/components/TeamLogo";

interface TeamFilterSelectorProps {
  onTeamSelect: (teamIds: string[] | null) => void;
  selectedTeamIds: string[] | null;
  loading?: boolean;
}

/**
 * 팀 필터 선택 컴포넌트
 * 사용자가 선택한 팀을 기반으로 피드를 필터링할 수 있습니다.
 */
export default function TeamFilterSelector({
  onTeamSelect,
  selectedTeamIds,
  loading = false,
}: TeamFilterSelectorProps) {
  const { themed, theme } = useAppTheme();
  const [modalVisible, setModalVisible] = useState(false);
  // 체크박스처럼 모달 내에서만 임시 선택 상태를 유지하고, 적용 버튼에서만 반영
  const [pendingSelectedIds, setPendingSelectedIds] = useState<string[]>(
    selectedTeamIds ?? []
  );

  // 사용자가 선택한 팀 목록 조회
  const { data: myTeamsData, loading: myTeamsLoading } =
    useQuery<GetMyTeamsResult>(GET_MY_TEAMS, {
      fetchPolicy: "cache-and-network",
    });

  // 팀 조회 결과를 빠르게 참조하기 위한 맵 (렌더 성능 최적화)
  const teamMap = useMemo(() => {
    const map = new Map<string, Team>();
    myTeamsData?.myTeams?.forEach((ut) => map.set(ut.team.id, ut.team));
    return map;
  }, [myTeamsData]);

  // 모달 오픈 시 현재 적용된 선택을 임시 상태로 복사
  useEffect(() => {
    if (modalVisible) {
      setPendingSelectedIds(selectedTeamIds ?? []);
    }
  }, [modalVisible, selectedTeamIds]);

  /**
   * 팀 선택 핸들러
   */
  // 적용 버튼: 임시 선택을 콜백으로 전달 (저장은 부모 훅이 담당)
  const applySelection = async (): Promise<void> => {
    try {
      const next = pendingSelectedIds.length > 0 ? pendingSelectedIds : null;

      // 현재 선택과 동일한 경우 중복 호출 방지
      const currentIds = selectedTeamIds || [];
      const nextIds = next || [];

      const isSameSelection =
        currentIds.length === nextIds.length &&
        currentIds.every((id) => nextIds.includes(id)) &&
        nextIds.every((id) => currentIds.includes(id));

      if (!isSameSelection) {
        onTeamSelect(next);
      }

      setModalVisible(false);
    } catch (error) {
      console.error("팀 필터 저장 실패:", error);
    }
  };

  /**
   * 개별 팀 토글
   */
  const toggleTeam = (teamId: string): void => {
    setPendingSelectedIds((prev) =>
      prev.includes(teamId)
        ? prev.filter((id) => id !== teamId)
        : [...prev, teamId]
    );
  };

  // 표시할 텍스트 결정
  const getDisplayText = (): string => {
    if (!selectedTeamIds || selectedTeamIds.length === 0) {
      return "모든 팀";
    }
    if (selectedTeamIds.length === 1) {
      const team = teamMap.get(selectedTeamIds[0]);
      return team?.name ?? "1개 팀";
    }
    return `${selectedTeamIds.length}개 팀`;
  };

  // 표시할 로고 결정
  const getDisplayLogo = () => {
    if (!selectedTeamIds || selectedTeamIds.length === 0) {
      return { logoUrl: undefined, fallbackIcon: "🏆", teamName: "모든 팀" };
    }
    if (selectedTeamIds.length === 1) {
      const team = teamMap.get(selectedTeamIds[0]);
      return {
        logoUrl: team?.logoUrl,
        fallbackIcon: team?.icon,
        teamName: team?.name ?? "선택된 팀",
      };
    }
    return { logoUrl: undefined, fallbackIcon: "🏆", teamName: "다중 선택" };
  };

  if (
    myTeamsLoading ||
    !myTeamsData?.myTeams ||
    myTeamsData.myTeams.length === 0
  ) {
    return null; // 팀이 없으면 필터 버튼을 표시하지 않음
  }

  return (
    <>
      {/* 필터 버튼 */}
      <TouchableOpacity
        style={themed($filterButton)}
        onPress={() => setModalVisible(true)}
        disabled={loading}
      >
        <TeamLogo
          logoUrl={getDisplayLogo().logoUrl}
          fallbackIcon={getDisplayLogo().fallbackIcon}
          teamName={getDisplayLogo().teamName}
          size={16}
        />
        <Text style={themed($filterText)} numberOfLines={1}>
          {getDisplayText()}
        </Text>
        {loading ? (
          <ActivityIndicator size="small" color={theme.colors.textDim} />
        ) : (
          <Ionicons
            name="chevron-down"
            size={14}
            color={theme.colors.textDim}
          />
        )}
      </TouchableOpacity>

      {/* 팀 선택 모달 */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={themed($modalOverlay)}>
          <View style={themed($modalContent)}>
            {/* 모달 헤더 */}
            <View style={themed($modalHeader)}>
              <Text style={themed($modalTitle)}>팀 필터 선택</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={themed($closeButton)}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={themed($scrollContainer)}>
              {/* 팀 목록 */}
              {myTeamsData.myTeams.map((userTeam) => {
                const team = userTeam.team;
                const isSelected = pendingSelectedIds.includes(team.id);

                return (
                  <TouchableOpacity
                    key={team.id}
                    style={[
                      themed($teamOption),
                      isSelected && themed($selectedOption),
                    ]}
                    onPress={() => toggleTeam(team.id)}
                  >
                    <TeamLogo
                      logoUrl={team.logoUrl}
                      fallbackIcon={team.icon}
                      teamName={team.name}
                      size={24}
                    />
                    <Text style={themed($teamName)}>{team.name}</Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={theme.colors.tint}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* 하단 버튼 */}
            <View style={themed($modalFooter)}>
              <TouchableOpacity
                style={themed($applyButton)}
                onPress={applySelection}
                disabled={loading}
                activeOpacity={loading ? 1 : 0.7}
              >
                {loading ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={themed($applyButtonText)}>적용 중...</Text>
                  </View>
                ) : (
                  <Text style={themed($applyButtonText)}>적용</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

// --- 스타일 정의 ---
const $filterButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  backgroundColor: colors.backgroundAlt,
  borderRadius: 16,
  maxWidth: 100,
  gap: spacing.xs,
});

const $filterIcon: ThemedStyle<TextStyle> = () => ({
  fontSize: 14,
});

const $filterText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.text,
  fontWeight: "600",
  flex: 1,
});

const $modalOverlay: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  justifyContent: "flex-end",
});

const $modalContent: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.background,
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  maxHeight: "70%",
});

const $modalHeader: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.lg,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $modalTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
  fontWeight: "bold",
  color: colors.text,
});

const $closeButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.xs,
});

const $scrollContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.lg,
});

const $teamOption: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.sm,
  borderRadius: 12,
  marginVertical: spacing.xs,
  gap: spacing.md,
});

const $selectedOption: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tint + "20",
});

const $teamIcon: ThemedStyle<TextStyle> = () => ({
  fontSize: 20,
});

const $teamName: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  color: colors.text,
  flex: 1,
});

const $modalFooter: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.lg,
  borderTopWidth: 1,
  borderTopColor: colors.border,
});

const $applyButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.tint,
  paddingVertical: spacing.md,
  borderRadius: 12,
  alignItems: "center",
});

const $applyButtonText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 16,
  fontWeight: "600",
});
