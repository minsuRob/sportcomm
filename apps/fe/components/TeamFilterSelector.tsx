import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  ViewStyle,
  TextStyle,
  Dimensions,
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
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width: screenWidth } = Dimensions.get("window");

interface TeamFilterSelectorProps {
  onTeamSelect: (teamIds: string[] | null) => void;
  selectedTeamIds: string[] | null;
}

const STORAGE_KEY = "selected_team_filter";

/**
 * 팀 필터 선택 컴포넌트
 * 사용자가 선택한 팀을 기반으로 피드를 필터링할 수 있습니다.
 */
export default function TeamFilterSelector({
  onTeamSelect,
  selectedTeamIds,
}: TeamFilterSelectorProps) {
  const { themed, theme } = useAppTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTeams, setSelectedTeams] = useState<Team[]>([]);

  // 사용자가 선택한 팀 목록 조회
  const { data: myTeamsData, loading } = useQuery<GetMyTeamsResult>(
    GET_MY_TEAMS,
    {
      fetchPolicy: "cache-and-network",
    }
  );

  // 선택된 팀 정보 업데이트
  useEffect(() => {
    if (myTeamsData?.myTeams && selectedTeamIds) {
      const teams = myTeamsData.myTeams
        .filter((userTeam) => selectedTeamIds.includes(userTeam.team.id))
        .map((userTeam) => userTeam.team);
      setSelectedTeams(teams);
    } else {
      setSelectedTeams([]);
    }
  }, [myTeamsData, selectedTeamIds]);

  /**
   * 팀 선택 핸들러
   */
  const handleTeamSelect = async (teamIds: string[] | null) => {
    try {
      if (teamIds) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(teamIds));
      } else {
        await AsyncStorage.removeItem(STORAGE_KEY);
      }
      onTeamSelect(teamIds);
      setModalVisible(false);
    } catch (error) {
      console.error("팀 필터 저장 실패:", error);
    }
  };

  /**
   * 개별 팀 토글
   */
  const toggleTeam = (teamId: string) => {
    const currentIds = selectedTeamIds || [];
    const newIds = currentIds.includes(teamId)
      ? currentIds.filter((id) => id !== teamId)
      : [...currentIds, teamId];

    handleTeamSelect(newIds.length > 0 ? newIds : null);
  };

  // 표시할 텍스트 결정
  const getDisplayText = () => {
    if (!selectedTeamIds || selectedTeamIds.length === 0) {
      return "전체";
    }
    if (selectedTeams.length === 1) {
      return selectedTeams[0].name;
    }
    return `${selectedTeams.length}개 팀`;
  };

  // 표시할 아이콘 결정
  const getDisplayIcon = () => {
    if (!selectedTeamIds || selectedTeamIds.length === 0) {
      return "🏆";
    }
    if (selectedTeams.length === 1) {
      return selectedTeams[0].icon;
    }
    return "🏆";
  };

  if (loading || !myTeamsData?.myTeams || myTeamsData.myTeams.length === 0) {
    return null; // 팀이 없으면 필터 버튼을 표시하지 않음
  }

  return (
    <>
      {/* 필터 버튼 */}
      <TouchableOpacity
        style={themed($filterButton)}
        onPress={() => setModalVisible(true)}
      >
        <Text style={themed($filterIcon)}>{getDisplayIcon()}</Text>
        <Text style={themed($filterText)} numberOfLines={1}>
          {getDisplayText()}
        </Text>
        <Ionicons name="chevron-down" size={14} color={theme.colors.textDim} />
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
              {/* 전체 옵션 */}
              <TouchableOpacity
                style={[
                  themed($teamOption),
                  (!selectedTeamIds || selectedTeamIds.length === 0) &&
                    themed($selectedOption),
                ]}
                onPress={() => handleTeamSelect(null)}
              >
                <Text style={themed($teamIcon)}>🏆</Text>
                <Text style={themed($teamName)}>전체</Text>
                {(!selectedTeamIds || selectedTeamIds.length === 0) && (
                  <Ionicons
                    name="checkmark"
                    size={20}
                    color={theme.colors.tint}
                  />
                )}
              </TouchableOpacity>

              {/* 팀 목록 */}
              {myTeamsData.myTeams.map((userTeam) => {
                const team = userTeam.team;
                const isSelected = selectedTeamIds?.includes(team.id) || false;

                return (
                  <TouchableOpacity
                    key={team.id}
                    style={[
                      themed($teamOption),
                      isSelected && themed($selectedOption),
                    ]}
                    onPress={() => toggleTeam(team.id)}
                  >
                    <Text style={themed($teamIcon)}>{team.icon}</Text>
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
                onPress={() => setModalVisible(false)}
              >
                <Text style={themed($applyButtonText)}>적용</Text>
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
