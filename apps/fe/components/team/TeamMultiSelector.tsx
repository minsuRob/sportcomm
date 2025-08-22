import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ViewStyle,
  TextStyle,
  Modal,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@apollo/client";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import TeamLogo from "@/components/TeamLogo";
import { GET_SPORTS } from "@/lib/graphql/teams";

// 팀 정보 타입
interface Team {
  id: string;
  name: string;
  color: string;
  icon: string;
  logoUrl?: string;
}

// 스포츠 정보 타입
interface Sport {
  id: string;
  name: string;
  icon: string;
  teams: Team[];
}

// 컴포넌트 Props 타입
interface TeamMultiSelectorProps {
  selectedTeamIds: string[];
  onTeamSelect: (teamIds: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  maxSelections?: number;
  showSportCategories?: boolean;
  title?: string;
}

/**
 * 다중 팀 선택 컴포넌트
 *
 * 사용자가 여러 팀을 선택할 수 있는 모달 기반 컴포넌트입니다.
 * team-selection.tsx의 로직을 재사용 가능한 컴포넌트로 분리했습니다.
 */
export default function TeamMultiSelector({
  selectedTeamIds,
  onTeamSelect,
  placeholder = "팀 선택",
  disabled = false,
  maxSelections,
  showSportCategories = true,
  title = "팀 선택",
}: TeamMultiSelectorProps) {
  const { themed, theme } = useAppTheme();
  const [showModal, setShowModal] = useState(false);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);

  // 스포츠 및 팀 목록 조회
  const { data: sportsData, loading: sportsLoading } = useQuery(GET_SPORTS, {
    fetchPolicy: "cache-and-network",
  });

  const sports = sportsData?.sports || [];
  const currentSport = sports[activeCategoryIndex];

  /**
   * 팀 선택/해제 핸들러
   */
  const handleTeamToggle = (teamId: string) => {
    const isSelected = selectedTeamIds.includes(teamId);
    let newSelectedIds: string[];

    if (isSelected) {
      // 선택 해제
      newSelectedIds = selectedTeamIds.filter((id) => id !== teamId);
    } else {
      // 선택 추가
      if (maxSelections && selectedTeamIds.length >= maxSelections) {
        // 최대 선택 수 제한
        return;
      }
      newSelectedIds = [...selectedTeamIds, teamId];
    }

    onTeamSelect(newSelectedIds);
  };

  /**
   * 선택된 팀들의 이름 가져오기
   */
  const getSelectedTeamNames = (): string[] => {
    const allTeams = sports.flatMap((sport: Sport) => sport.teams);
    return selectedTeamIds
      .map((id) => allTeams.find((team: Team) => team.id === id)?.name)
      .filter(Boolean) as string[];
  };

  /**
   * 카테고리 탭 렌더링
   */
  const renderCategoryTab = ({
    item,
    index,
  }: {
    item: Sport;
    index: number;
  }) => {
    const isActive = index === activeCategoryIndex;

    return (
      <TouchableOpacity
        style={[
          themed($categoryTab),
          {
            backgroundColor: isActive ? theme.colors.tint : "transparent",
            borderColor: isActive ? theme.colors.tint : theme.colors.border,
          },
        ]}
        onPress={() => setActiveCategoryIndex(index)}
      >
        <Text style={themed($categoryTabIcon)}>{item.icon}</Text>
        <Text
          style={[
            themed($categoryTabText),
            {
              color: isActive ? "white" : theme.colors.text,
            },
          ]}
        >
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  /**
   * 팀 그리드 렌더링
   */
  const renderTeamGrid = (teams: Team[]) => {
    const rows = [];
    const teamsPerRow = 3;

    for (let i = 0; i < teams.length; i += teamsPerRow) {
      const rowTeams = teams.slice(i, i + teamsPerRow);
      rows.push(
        <View key={i} style={themed($teamRow)}>
          {rowTeams.map((team) => {
            const isSelected = selectedTeamIds.includes(team.id);
            const isDisabled =
              !isSelected &&
              maxSelections &&
              selectedTeamIds.length >= maxSelections;

            return (
              <TouchableOpacity
                key={team.id}
                style={[
                  themed($teamCard),
                  {
                    borderColor: isSelected ? team.color : theme.colors.border,
                    backgroundColor: isSelected
                      ? team.color + "20"
                      : theme.colors.card,
                    opacity: isDisabled ? 0.5 : 1,
                  },
                ]}
                onPress={() => !isDisabled && handleTeamToggle(team.id)}
                disabled={isDisabled}
              >
                <View style={themed($teamIconContainer)}>
                  <TeamLogo
                    logoUrl={team.logoUrl}
                    fallbackIcon={team.icon}
                    teamName={team.name}
                    size={40}
                  />
                  {isSelected && (
                    <View style={themed($selectedIndicator)}>
                      <Ionicons name="checkmark" size={16} color="white" />
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    themed($teamCardName),
                    {
                      color: isSelected ? team.color : theme.colors.text,
                    },
                  ]}
                >
                  {team.name}
                </Text>
              </TouchableOpacity>
            );
          })}
          {/* 빈 공간 채우기 */}
          {Array.from({ length: teamsPerRow - rowTeams.length }).map(
            (_, index) => (
              <View
                key={`empty-${index}`}
                style={[themed($teamCard), { opacity: 0 }]}
              />
            ),
          )}
        </View>,
      );
    }

    return rows;
  };

  const selectedTeamNames = getSelectedTeamNames();

  return (
    <>
      {/* 팀 선택 버튼 */}
      <TouchableOpacity
        style={[themed($selectButton), disabled && themed($disabledButton)]}
        onPress={() => !disabled && setShowModal(true)}
        disabled={disabled}
      >
        <View style={themed($selectButtonContent)}>
          {selectedTeamNames.length > 0 ? (
            <Text style={themed($selectButtonText)}>
              {selectedTeamNames.length === 1
                ? selectedTeamNames[0]
                : `${selectedTeamNames.length}개 팀 선택됨`}
            </Text>
          ) : (
            <Text style={themed($placeholderText)}>{placeholder}</Text>
          )}
        </View>

        <Ionicons
          name="chevron-down"
          color={disabled ? theme.colors.textDim : theme.colors.text}
          size={16}
        />
      </TouchableOpacity>

      {/* 팀 선택 모달 */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={themed($modalOverlay)}>
          <View style={themed($modalContent)}>
            {/* 모달 헤더 */}
            <View style={themed($modalHeader)}>
              <Text style={themed($modalTitle)}>{title}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" color={theme.colors.text} size={24} />
              </TouchableOpacity>
            </View>

            {/* 설명 */}
            <View style={themed($descriptionSection)}>
              <Text style={themed($descriptionText)}>
                {maxSelections
                  ? `최대 ${maxSelections}개까지 선택할 수 있습니다.`
                  : "여러 팀을 선택할 수 있습니다."}
              </Text>
              {selectedTeamIds.length > 0 && (
                <Text style={themed($selectedCountText)}>
                  {selectedTeamIds.length}개 팀 선택됨
                  {maxSelections && ` / ${maxSelections}`}
                </Text>
              )}
            </View>

            {/* 카테고리 슬라이더 */}
            {showSportCategories && sports.length > 0 && (
              <View style={themed($categorySliderContainer)}>
                <FlatList
                  data={sports}
                  renderItem={renderCategoryTab}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={themed($categorySliderContent)}
                />
              </View>
            )}

            {/* 팀 목록 */}
            <ScrollView style={themed($teamsScrollContainer)}>
              {sportsLoading ? (
                <View style={themed($loadingContainer)}>
                  <ActivityIndicator size="large" color={theme.colors.tint} />
                  <Text style={themed($loadingText)}>팀 목록 로딩 중...</Text>
                </View>
              ) : currentSport ? (
                <View style={themed($teamsContainer)}>
                  {currentSport.teams && currentSport.teams.length > 0 ? (
                    renderTeamGrid(currentSport.teams)
                  ) : (
                    <View style={themed($emptyContainer)}>
                      <Text style={themed($emptyText)}>
                        {currentSport.name} 카테고리에 등록된 팀이 없습니다.
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={themed($emptyContainer)}>
                  <Text style={themed($emptyText)}>
                    스포츠 카테고리를 불러오는 중입니다...
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* 모달 액션 */}
            <View style={themed($modalActions)}>
              <TouchableOpacity
                style={themed($cancelButton)}
                onPress={() => setShowModal(false)}
              >
                <Text style={themed($cancelButtonText)}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={themed($confirmButton)}
                onPress={() => setShowModal(false)}
              >
                <Text style={themed($confirmButtonText)}>확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

// --- 스타일 정의 ---
const $selectButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 8,
  padding: spacing.md,
  backgroundColor: colors.card,
  minHeight: 48,
});

const $disabledButton: ThemedStyle<ViewStyle> = () => ({
  opacity: 0.5,
});

const $selectButtonContent: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $selectButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  color: colors.text,
});

const $placeholderText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  color: colors.textDim,
});

const $modalOverlay: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  justifyContent: "center",
  alignItems: "center",
});

const $modalContent: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  borderRadius: 16,
  padding: spacing.lg,
  width: "90%",
  maxWidth: 400,
  maxHeight: "80%",
});

const $modalHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.md,
});

const $modalTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
  fontWeight: "bold",
  color: colors.text,
});

const $descriptionSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.md,
});

const $descriptionText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
  lineHeight: 20,
});

const $selectedCountText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 14,
  color: colors.tint,
  fontWeight: "600",
  marginTop: spacing.sm,
});

const $categorySliderContainer: ThemedStyle<ViewStyle> = ({
  colors,
  spacing,
}) => ({
  paddingVertical: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
  marginBottom: spacing.md,
});

const $categorySliderContent: ThemedStyle<ViewStyle> = () => ({
  paddingHorizontal: 0,
});

const $categoryTab: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  marginRight: spacing.sm,
  borderWidth: 1,
  borderRadius: 20,
});

const $categoryTabIcon: ThemedStyle<TextStyle> = ({ spacing }) => ({
  fontSize: 16,
  marginRight: spacing.xs,
});

const $categoryTabText: ThemedStyle<TextStyle> = () => ({
  fontSize: 14,
  fontWeight: "600",
});

const $teamsScrollContainer: ThemedStyle<ViewStyle> = () => ({
  maxHeight: 300,
});

const $teamsContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.sm,
});

const $teamRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  marginBottom: spacing.md,
});

const $teamCard: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  alignItems: "center",
  paddingVertical: spacing.lg,
  paddingHorizontal: spacing.sm,
  marginHorizontal: spacing.xs,
  borderWidth: 2,
  borderRadius: 16,
  minHeight: 100,
  justifyContent: "center",
});

const $teamIconContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.sm,
  position: "relative",
});

const $selectedIndicator: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: "absolute",
  top: -8,
  right: -8,
  width: 24,
  height: 24,
  borderRadius: 12,
  backgroundColor: colors.tint,
  justifyContent: "center",
  alignItems: "center",
});

const $teamCardName: ThemedStyle<TextStyle> = () => ({
  fontSize: 12,
  fontWeight: "600",
  textAlign: "center",
});

const $loadingContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  paddingVertical: spacing.xl,
});

const $loadingText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  marginTop: spacing.sm,
  fontSize: 14,
  color: colors.textDim,
});

const $emptyContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  paddingVertical: spacing.xl,
});

const $emptyText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  color: colors.textDim,
  textAlign: "center",
});

const $modalActions: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "flex-end",
  gap: spacing.sm,
  marginTop: spacing.lg,
  paddingTop: spacing.md,
  borderTopWidth: 1,
  borderTopColor: "#E5E7EB",
});

const $cancelButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.sm,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.border,
});

const $cancelButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.text,
});

const $confirmButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.sm,
  borderRadius: 8,
  backgroundColor: colors.tint,
});

const $confirmButtonText: ThemedStyle<TextStyle> = () => ({
  fontSize: 14,
  color: "white",
  fontWeight: "500",
});
