import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ViewStyle,
  TextStyle,
  FlatList,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "@apollo/client";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { User, getSession } from "@/lib/auth";
import { showToast } from "@/components/CustomToast";
import {
  GET_SPORTS,
  GET_MY_TEAMS,
  UPDATE_MY_TEAMS,
  type Sport,
  type Team,
  type UserTeam,
  type GetSportsResult,
  type GetMyTeamsResult,
  type UpdateMyTeamsResult,
} from "@/lib/graphql/teams";

const { width: screenWidth } = Dimensions.get("window");

/**
 * 팀 선택 모달 화면
 * 사용자가 선호하는 팀을 선택할 수 있습니다.
 */
export default function TeamSelectionScreen() {
  const { themed, theme } = useAppTheme();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);

  // GraphQL 쿼리 및 뮤테이션
  const { data: sportsData, loading: sportsLoading, refetch: refetchSports } = useQuery<GetSportsResult>(GET_SPORTS);

  const { data: myTeamsData, loading: myTeamsLoading, refetch: refetchMyTeams } = useQuery<GetMyTeamsResult>(GET_MY_TEAMS);

  const [updateMyTeams, { loading: updateLoading }] = useMutation<UpdateMyTeamsResult>(UPDATE_MY_TEAMS);

  // 사용자 정보 로드
  useEffect(() => {
    const loadUser = async () => {
      const { user } = await getSession();
      if (user) {
        setCurrentUser(user);
      }
    };
    loadUser();
  }, []);

  // 사용자가 선택한 팀 목록 로드
  useEffect(() => {
    if (myTeamsData?.myTeams) {
      const teamIds = myTeamsData.myTeams.map(
        (userTeam) => userTeam.team.id
      );
      setSelectedTeams(teamIds);
    }
  }, [myTeamsData]);

  /**
   * 팀 선택/해제 핸들러
   */
  const handleTeamSelect = (teamId: string) => {
    setSelectedTeams((prev) => {
      if (prev.includes(teamId)) {
        // 이미 선택된 팀이면 해제
        return prev.filter((id) => id !== teamId);
      } else {
        // 선택되지 않은 팀이면 추가
        return [...prev, teamId];
      }
    });
  };

  /**
   * 팀 선택 저장 핸들러
   */
  const handleSave = async () => {
    if (!currentUser) return;

    try {
      // GraphQL 뮤테이션으로 팀 선택 업데이트
      const { data, errors } = await updateMyTeams({
        variables: {
          teamIds: selectedTeams,
        },
      });

      if (errors) {
        throw new Error(errors[0].message);
      }

      // 사용자 팀 목록 다시 조회
      refetchMyTeams({ fetchPolicy: "network-only" });

      showToast({
        type: "success",
        title: "팀 선택 완료",
        message:
          selectedTeams.length > 0
            ? `${selectedTeams.length}개 팀이 선택되었습니다!`
            : "팀 선택이 저장되었습니다.",
        duration: 2000,
      });

      router.back();
    } catch (error) {
      console.error("팀 선택 저장 실패:", error);
      showToast({
        type: "error",
        title: "저장 실패",
        message: "팀 선택을 저장하는 중 오류가 발생했습니다.",
        duration: 3000,
      });
    }
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
    const teamsPerRow = 2;

    for (let i = 0; i < teams.length; i += teamsPerRow) {
      const rowTeams = teams.slice(i, i + teamsPerRow);
      rows.push(
        <View key={i} style={themed($teamRow)}>
          {rowTeams.map((team) => {
            const isSelected = selectedTeams.includes(team.id);
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
                  },
                ]}
                onPress={() => handleTeamSelect(team.id)}
              >
                <View style={themed($teamIconContainer)}>
                  <Text style={themed($teamCardIcon)}>{team.icon}</Text>
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
          {rowTeams.length < teamsPerRow && (
            <View style={[themed($teamCard), { opacity: 0 }]} />
          )}
        </View>
      );
    }

    return rows;
  };

  // 로딩 상태 처리
  if (sportsLoading || myTeamsLoading) {
    return (
      <View style={[themed($container), themed($loadingContainer)]}>
        <ActivityIndicator size="large" color={theme.colors.tint} />
        <Text style={themed($loadingText)}>팀 정보를 불러오는 중...</Text>
      </View>
    );
  }

  // 에러 상태 처리
  if (!sportsData) {
    return (
      <View style={[themed($container), themed($errorContainer)]}>
        <Text style={themed($errorText)}>
          팀 정보를 불러오는 중 오류가 발생했습니다.
        </Text>
        <TouchableOpacity
          style={themed($retryButton)}
          onPress={() => {
            refetchSports({ fetchPolicy: "network-only" });
          }}
        >
          <Text style={themed($retryButtonText)}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const sports = sportsData?.sports || [];
  const currentSport = sports[activeCategoryIndex];

  return (
    <View style={themed($container)}>
      {/* 헤더 */}
      <View style={themed($header)}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={themed($headerTitle)}>My Team 선택</Text>
        <TouchableOpacity onPress={handleSave} style={themed($saveButton)}>
          <Text style={themed($saveButtonText)}>저장</Text>
        </TouchableOpacity>
      </View>

      {/* 설명 */}
      <View style={themed($descriptionSection)}>
        <Text style={themed($descriptionTitle)}>응원할 팀을 선택하세요</Text>
        <Text style={themed($descriptionText)}>
          여러 팀을 선택할 수 있으며, 첫 번째로 선택한 팀이 주 팀으로
          설정됩니다.
        </Text>
        {selectedTeams.length > 0 && (
          <Text style={themed($selectedCountText)}>
            {selectedTeams.length}개 팀 선택됨
          </Text>
        )}
      </View>

      {/* 카테고리 슬라이더 */}
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

      <ScrollView style={themed($scrollContainer)}>
        {/* 선택된 카테고리의 팀 목록 */}
        {currentSport && (
          <View style={themed($teamsContainer)}>
            {renderTeamGrid(currentSport.teams || [])}
          </View>
        )}
      </ScrollView>

      {/* 로딩 중 표시 */}
      {updateLoading && (
        <View style={themed($loadingOverlay)}>
          <ActivityIndicator size="large" color={theme.colors.tint} />
          <Text style={themed($loadingText)}>데이터 저장 중...</Text>
        </View>
      )}
    </View>
  );
}

// --- 스타일 정의 ---
const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
});

const $header: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.lg,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $headerTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
  fontWeight: "bold",
  color: colors.text,
});

const $saveButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  backgroundColor: colors.tint,
  borderRadius: 8,
});

const $loadingContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
});

const $loadingText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  marginTop: spacing.md,
  fontSize: 16,
  color: colors.textDim,
});

const $loadingOverlay: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: colors.background + "CC",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 10,
});

const $errorContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: spacing.lg,
});

const $errorText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 16,
  color: colors.error,
  textAlign: "center",
  marginBottom: spacing.lg,
});

const $retryButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
  backgroundColor: colors.tint,
  borderRadius: 8,
});

const $retryButtonText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 16,
  fontWeight: "600",
});

const $selectedCountText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 14,
  color: colors.tint,
  fontWeight: "600",
  marginTop: spacing.sm,
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

const $saveButtonText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 14,
  fontWeight: "600",
});

const $scrollContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $descriptionSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.lg,
});

const $descriptionTitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 20,
  fontWeight: "bold",
  color: colors.text,
  marginBottom: spacing.sm,
});

const $descriptionText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
  lineHeight: 20,
});

const $categorySliderContainer: ThemedStyle<ViewStyle> = ({
  colors,
  spacing,
}) => ({
  paddingVertical: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $categorySliderContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
});

const $categoryTab: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.lg,
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

const $teamsContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.lg,
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
  paddingHorizontal: spacing.md,
  marginHorizontal: spacing.xs,
  borderWidth: 2,
  borderRadius: 16,
  minHeight: 100,
  justifyContent: "center",
});

const $teamIconContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.sm,
});

const $teamCardIcon: ThemedStyle<TextStyle> = () => ({
  fontSize: 32,
  textAlign: "center",
});

const $teamCardName: ThemedStyle<TextStyle> = () => ({
  fontSize: 14,
  fontWeight: "600",
  textAlign: "center",
});
