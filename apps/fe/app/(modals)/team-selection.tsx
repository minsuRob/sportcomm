import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation } from "@apollo/client";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { useAuth } from "@/lib/auth/context/AuthContext";
import { showToast } from "@/components/CustomToast";
import AsyncStorage from "@react-native-async-storage/async-storage";
import TeamLogo from "@/components/TeamLogo";
import FavoriteMonthPicker from "@/components/team/FavoriteMonthPicker";
import TeamSettingsPopover from "@/components/team/TeamSettingsPopover";
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

/**
 * NOTE (리팩토링 요약)
 * - AuthContext(useAuth) 기반 전역 사용자/토큰 접근 (getSession 호출 제거)
 * - 팀 선택 / favoriteDate / favoritePlayer 상태 로컬 관리 → 저장 시 서버 반영
 * - 저장 성공 후 refetch + updateUser 로 전역 사용자(myTeams) 동기화
 * - 잘못된 상태로 인해 깨졌던 이전 파일 전체 재작성
 * - 불필요한 인증 중복 검사 제거 (isAuthenticated / accessToken 바로 활용)
 */

import { markPostSignupStepDone, PostSignupStep } from "@/lib/auth/post-signup";
const { width: screenWidth } = Dimensions.get("window");

export default function TeamSelectionScreen() {
  const { themed, theme } = useAppTheme();
  const router = useRouter();
  const { origin } = useLocalSearchParams<{ origin?: string }>();
  const {
    user: currentUser,
    isAuthenticated,
    accessToken,
    updateUser,
  } = useAuth();

  // --- 로컬 UI 상태 ---
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [teamFavoriteDates, setTeamFavoriteDates] = useState<
    Record<string, string>
  >({});
  const [teamFavoritePlayers, setTeamFavoritePlayers] = useState<
    Record<string, { name?: string; number?: number }>
  >({});
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const [showCalendar, setShowCalendar] = useState(false);
  const [pendingTeamId, setPendingTeamId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsAnchor, setSettingsAnchor] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // --- GraphQL Queries / Mutations ---
  const {
    data: sportsData,
    loading: sportsLoading,
    refetch: refetchSports,
  } = useQuery<GetSportsResult>(GET_SPORTS);

  const {
    data: myTeamsData,
    loading: myTeamsLoading,
    error: myTeamsError,
    refetch: refetchMyTeams,
  } = useQuery<GetMyTeamsResult>(GET_MY_TEAMS, {
    skip: !isAuthenticated || !currentUser,
    fetchPolicy: "network-only",
    onError: (error) => {
      console.error("myTeams 쿼리 오류:", error);
      if (
        error.message.includes("인증") ||
        error.message.includes("token") ||
        error.message.includes("Unauthorized") ||
        error.message.includes("로그인")
      ) {
        setAuthError("인증 오류가 발생했습니다. 다시 로그인해주세요.");
      }
    },
  });

  const [updateMyTeams, { loading: updateLoading }] =
    useMutation<UpdateMyTeamsResult>(UPDATE_MY_TEAMS, {
      onCompleted: async () => {
        // post-signup: 팀 선택 단계 완료 플래그 마킹
        await markPostSignupStepDone(PostSignupStep.Teams);
      },
    });

  const isLoading = sportsLoading || myTeamsLoading || updateLoading;

  // --- 인증 상태 감시 ---
  useEffect(() => {
    if (isAuthenticated === false) {
      setAuthError("로그인이 필요한 기능입니다.");
      showToast({
        type: "error",
        title: "인증 필요",
        message: "로그인이 필요한 기능입니다.",
        duration: 2000,
      });
      setTimeout(() => router.back(), 600);
    }
  }, [isAuthenticated, router]);

  // --- myTeamsData 로컬 상태 반영 ---
  useEffect(() => {
    if (!myTeamsData?.myTeams) return;
    try {
      const teamIds: string[] = [];
      const favoriteDates: Record<string, string> = {};
      const favoritePlayers: Record<
        string,
        { name?: string; number?: number }
      > = {};

      myTeamsData.myTeams.forEach((ut) => {
        if (!ut.team) return;
        teamIds.push(ut.team.id);

        if (ut.favoriteDate) {
          favoriteDates[ut.team.id] = ut.favoriteDate;
        }
        if (
          (ut as any).favoritePlayerName ||
          (ut as any).favoritePlayerNumber !== undefined
        ) {
          // API 설계 상 optional field 이므로 any 캐스팅
          favoritePlayers[ut.team.id] = {
            name: (ut as any).favoritePlayerName,
            number: (ut as any).favoritePlayerNumber,
          };
        }
      });

      setSelectedTeams(teamIds);
      setTeamFavoriteDates(favoriteDates);
      setTeamFavoritePlayers(favoritePlayers);
    } catch (e) {
      console.error("myTeams 처리 오류:", e);
    }
  }, [myTeamsData]);

  // --- myTeams 쿼리 오류 추가 처리 ---
  useEffect(() => {
    if (myTeamsError && isAuthenticated) {
      showToast({
        type: "error",
        title: "팀 로드 실패",
        message: "My Teams 정보를 불러오지 못했습니다.",
        duration: 3000,
      });
    }
  }, [myTeamsError, isAuthenticated]);

  // --- 팀 선택/해제 ---
  const handleTeamSelect = (teamId: string) => {
    setSelectedTeams((prev) => {
      if (prev.includes(teamId)) {
        // 해제 → 관련 날짜 제거
        setTeamFavoriteDates((p) => {
          const next = { ...p };
          // 날짜 제거
          delete next[teamId];
          return next;
        });
        setShowSettings(false);
        return prev.filter((id) => id !== teamId);
      }
      return [...prev, teamId];
    });
  };

  // --- 팀 설정 팝오버 열기 ---
  const openTeamSettings = (
    teamId: string,
    pageX: number = 0,
    pageY: number = 0,
  ) => {
    setPendingTeamId(teamId);
    setShowCalendar(false);
    setShowSettings(true);
    setSettingsAnchor({ top: pageY + 8, left: pageX - 110 });
  };

  // --- 팬이 된 날짜 선택 ---
  const handleFavoriteDateSelect = (favoriteDate: string) => {
    if (pendingTeamId) {
      setTeamFavoriteDates((prev) => ({
        ...prev,
        [pendingTeamId]: favoriteDate,
      }));
    }
    setPendingTeamId(null);
    setShowCalendar(false);
  };

  // --- 캘린더 취소 ---
  const handleCalendarCancel = () => {
    setPendingTeamId(null);
    setShowCalendar(false);
  };

  // --- 인증 유효성 (간단) ---
  const checkAuthentication = useCallback(() => {
    if (!isAuthenticated || !currentUser || !accessToken) {
      showToast({
        type: "error",
        title: "인증 필요",
        message: "로그인이 만료되었거나 유효하지 않습니다.",
        duration: 3000,
      });
      return false;
    }
    return true;
  }, [isAuthenticated, currentUser, accessToken]);

  // --- 저장 처리 ---
  const handleSave = async () => {
    if (isLoading) return;
    if (!checkAuthentication()) {
      setTimeout(() => router.back(), 600);
      return;
    }
    if (!currentUser) {
      showToast({
        type: "error",
        title: "인증 필요",
        message: "사용자 정보를 찾을 수 없습니다.",
        duration: 2500,
      });
      return;
    }
    if (selectedTeams.length === 0) {
      showToast({
        type: "warning",
        title: "팀 선택 필요",
        message: "최소 1개 이상의 팀을 선택해주세요.",
        duration: 2500,
      });
      return;
    }

    try {
      const { errors } = await updateMyTeams({
        variables: {
          teams: selectedTeams.map((teamId) => ({
            teamId,
            favoriteDate: teamFavoriteDates[teamId] || null,
            favoritePlayerName: teamFavoritePlayers[teamId]?.name || null,
            favoritePlayerNumber: teamFavoritePlayers[teamId]?.number ?? null,
          })),
        },
        context: {
          headers: {
            authorization: accessToken ? `Bearer ${accessToken}` : "",
          },
        },
      });

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      // 최신 myTeams 재조회 후 전역 사용자 업데이트
      const refetched = await refetchMyTeams({ fetchPolicy: "network-only" });
      const newMyTeams = refetched?.data?.myTeams || [];
      await updateUser({ myTeams: newMyTeams } as any);

      // 필터 상태도 로컬 저장 (피드 필터링과 동기화)
      try {
        await AsyncStorage.setItem(
          "selected_team_filter",
          JSON.stringify(selectedTeams),
        );
      } catch (e) {
        console.warn("팀 필터 AsyncStorage 저장 실패:", (e as any)?.message);
      }

      showToast({
        type: "success",
        title: "저장 완료",
        message: `${selectedTeams.length}개 팀이 저장되었습니다.`,
        duration: 2000,
      });
      router.back();
    } catch (e) {
      const msg =
        (e as any)?.message || "팀 선택을 저장하는 중 오류가 발생했습니다.";
      const isAuth =
        msg.includes("auth") ||
        msg.includes("인증") ||
        msg.includes("token") ||
        msg.includes("로그인");
      showToast({
        type: "error",
        title: isAuth ? "인증 오류" : "저장 실패",
        message: msg,
        duration: 3000,
      });
      if (isAuth) {
        setTimeout(() => router.back(), 800);
      }
    }
  };

  // --- 팀별 그리드 구성 ---
  const renderTeamGrid = (teams: Team[]) => {
    const teamsPerRow = 3;
    const rows: React.ReactElement[] = [];

    for (let i = 0; i < teams.length; i += teamsPerRow) {
      const rowTeams = teams.slice(i, i + teamsPerRow);

      rows.push(
        <View key={`row-${i}`} style={themed($teamRow)}>
          {rowTeams.map((team) => {
            const teamId = team.id;
            const isSelected = selectedTeams.includes(teamId);
            return (
              <View key={teamId} style={themed($teamItemColumn)}>
                <TouchableOpacity
                  style={[
                    themed($teamCard),
                    {
                      borderColor: isSelected
                        ? team.color
                        : theme.colors.border,
                      backgroundColor: isSelected
                        ? `${team.color}20`
                        : theme.colors.card,
                    },
                  ]}
                  onPress={() => handleTeamSelect(teamId)}
                  activeOpacity={0.85}
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
                  <View style={themed($teamCardInfo)}>
                    <Text
                      style={[
                        themed($teamCardName),
                        {
                          color: isSelected ? team.color : theme.colors.text,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {team.name}
                    </Text>
                    {isSelected && teamFavoriteDates[teamId] && (
                      <Text
                        style={themed($teamCardDate)}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {new Date(teamFavoriteDates[teamId]).toLocaleDateString(
                          "ko-KR",
                          {
                            year: "numeric",
                            month: "short",
                          },
                        )}
                        ~
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
                {isSelected ? (
                  <TouchableOpacity
                    style={[
                      themed($teamSettingsButton),
                      { borderColor: team.color },
                    ]}
                    onPress={(e) =>
                      openTeamSettings(
                        teamId,
                        (e as any)?.nativeEvent?.pageX || 0,
                        (e as any)?.nativeEvent?.pageY || 0,
                      )
                    }
                  >
                    <Ionicons
                      name="settings-outline"
                      size={14}
                      color={team.color}
                    />
                    <Text
                      style={[themed($teamSettingsText), { color: team.color }]}
                    >
                      팀 설정
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={themed($teamSettingsPlaceholder)} />
                )}
              </View>
            );
          })}
          {/* 빈 자리 채우기 */}
          {Array.from({ length: teamsPerRow - rowTeams.length }).map((_, j) => (
            <View
              key={`empty-${i}-${j}`}
              style={[themed($teamCard), { opacity: 0 }]}
            />
          ))}
        </View>,
      );
    }
    return rows;
  };

  // --- 스포츠 목록 / 현재 선택 스포츠 ---
  const sports = sportsData?.sports || [];
  const currentSport = sports[activeCategoryIndex];

  // --- 인증 오류 화면 ---
  if (authError) {
    return (
      <View style={[themed($container), themed($errorContainer)]}>
        <Text style={themed($errorText)}>{authError}</Text>
        <TouchableOpacity
          style={themed($retryButton)}
          onPress={() => router.back()}
        >
          <Text style={themed($retryButtonText)}>닫기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- 로딩 ---
  if (sportsLoading || myTeamsLoading) {
    return (
      <View style={[themed($container), themed($loadingContainer)]}>
        <ActivityIndicator size="large" color={theme.colors.tint} />
        <Text style={themed($loadingText)}>팀 정보를 불러오는 중...</Text>
      </View>
    );
  }

  // --- 스포츠 데이터 없음 ---
  if (!sportsData) {
    return (
      <View style={[themed($container), themed($errorContainer)]}>
        <Text style={themed($errorText)}>
          팀 정보를 불러오는 중 오류가 발생했습니다.
        </Text>
        <TouchableOpacity
          style={themed($retryButton)}
          // 강제 네트워크 리패치
          onPress={() => refetchSports({ fetchPolicy: "network-only" })}
        >
          <Text style={themed($retryButtonText)}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={themed($container)}>
      {/* 헤더 */}
      <View style={themed($header)}>
        <TouchableOpacity
          onPress={() => {
            if (origin === "profile") {
              router.replace("/(modals)/post-signup-profile");
            } else if (origin === "team-center") {
              router.replace("/(details)/team-center");
            } else {
              router.back();
            }
          }}
        >
          <Ionicons name="close" color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={themed($headerTitle)}>My Team 선택</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isLoading || !currentUser}
          style={[
            themed($saveButton),
            (isLoading || !currentUser) && { opacity: 0.5 },
          ]}
        >
          <Text style={themed($saveButtonText)}>
            {isLoading ? "저장 중..." : "저장"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 안내 섹션 */}
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

      {/* 스포츠 카테고리 슬라이더 */}
      <View style={themed($categorySliderContainer)}>
        <FlatList
          data={sports}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => {
            const isActive = index === activeCategoryIndex;
            return (
              <TouchableOpacity
                style={[
                  themed($categoryTab),
                  {
                    backgroundColor: isActive
                      ? theme.colors.tint
                      : "transparent",
                    borderColor: isActive
                      ? theme.colors.tint
                      : theme.colors.border,
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
          }}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={themed($categorySliderContent)}
        />
      </View>

      {/* 팀 목록 */}
      <ScrollView style={themed($scrollContainer)}>
        {currentSport ? (
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

      {/* 저장 중 오버레이 */}
      {updateLoading && (
        <View style={themed($loadingOverlay)}>
          <ActivityIndicator size="large" color={theme.colors.tint} />
          <Text style={themed($loadingText)}>데이터 저장 중...</Text>
        </View>
      )}

      {/* 팀 설정 팝오버 */}
      <TeamSettingsPopover
        visible={showSettings && !!pendingTeamId}
        onClose={() => setShowSettings(false)}
        anchorStyle={
          settingsAnchor
            ? {
                position: "absolute",
                top: settingsAnchor.top,
                left: settingsAnchor.left,
              }
            : undefined
        }
        onSelectFavoriteDate={() => {
          setShowSettings(false);
          setShowCalendar(true);
        }}
        teamId={pendingTeamId || undefined}
        onSelectFavoritePlayer={async (player) => {
          if (!pendingTeamId) return;
          const updatedPlayers = {
            ...teamFavoritePlayers,
            [pendingTeamId]: {
              name: player.name,
              number: player.number,
            },
          };
          setTeamFavoritePlayers(updatedPlayers);
          // 즉시 서버 반영 (선택 기능: 실패 시 롤백은 생략)
          try {
            await updateMyTeams({
              variables: {
                teams: selectedTeams.map((teamId) => ({
                  teamId,
                  favoriteDate: teamFavoriteDates[teamId] || null,
                  favoritePlayerName: updatedPlayers[teamId]?.name || null,
                  favoritePlayerNumber: updatedPlayers[teamId]?.number ?? null,
                })),
              },
              context: {
                headers: {
                  authorization: accessToken ? `Bearer ${accessToken}` : "",
                },
              },
            });
          } catch (e) {
            console.warn("최애 선수 즉시 저장 실패:", (e as any)?.message);
          }
        }}
      />

      {/* 팬이 된 날짜 선택 Month Picker */}
      <FavoriteMonthPicker
        visible={showCalendar}
        onClose={handleCalendarCancel}
        onSelect={handleFavoriteDateSelect}
        selectedDate={
          pendingTeamId ? teamFavoriteDates[pendingTeamId] : undefined
        }
        teamName={
          pendingTeamId && sportsData
            ? sportsData.sports
                .flatMap((s) => s.teams)
                .find((t) => t.id === pendingTeamId)?.name
            : undefined
        }
        teamColor={
          pendingTeamId && sportsData
            ? sportsData.sports
                .flatMap((s) => s.teams)
                .find((t) => t.id === pendingTeamId)?.color
            : theme.colors.tint
        }
      />
    </View>
  );
}

/* -------------------- Styles -------------------- */

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

const $saveButtonText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 14,
  fontWeight: "600",
});

const $descriptionSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.lg,
});

const $descriptionTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 20,
  fontWeight: "bold",
  color: colors.text,
  marginBottom: 4,
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

const $scrollContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
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

const $teamItemColumn: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  marginHorizontal: spacing.xs,
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

const $teamCardInfo: ThemedStyle<ViewStyle> = () => ({
  alignItems: "center",
  maxWidth: screenWidth / 3 - 32,
});

const $teamCardName: ThemedStyle<TextStyle> = () => ({
  fontSize: 12,
  fontWeight: "600",
  textAlign: "center",
});

const $teamCardDate: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 10,
  color: colors.textDim,
  textAlign: "center",
  marginTop: 2,
});

const $teamSettingsButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  marginTop: spacing.xs,
  alignSelf: "center",
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.xs,
  borderRadius: 16,
  borderWidth: 1,
  backgroundColor: colors.card,
});

const $teamSettingsText: ThemedStyle<TextStyle> = () => ({
  fontSize: 12,
  fontWeight: "600",
});

const $teamSettingsPlaceholder: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  height: 30,
  marginTop: spacing.xs,
});

const $emptyContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingVertical: spacing.xl,
});

const $emptyText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  color: colors.textDim,
  textAlign: "center",
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

/* 커밋 메세지: refactor(team-selection): AuthContext 기반 전면 재작성 & 세션 의존 로직 정리 */
