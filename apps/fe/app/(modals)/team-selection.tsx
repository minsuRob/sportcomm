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
import { getTeamColors } from "@/lib/theme/teams/teamColor";
import { useTeamColorSelection } from "@/lib/hooks/useTeamColorSelection";
import type { ThemedStyle } from "@/lib/theme/types";
import { useAuth } from "@/lib/auth/context/AuthContext";
import { showToast } from "@/components/CustomToast";
import AsyncStorage from "@react-native-async-storage/async-storage";
import TeamLogo from "@/components/TeamLogo";
import FavoriteMonthPicker from "@/components/team/FavoriteMonthPicker";
import FavoritePlayerSelector from "@/components/team/FavoritePlayerSelector";
import TeamSettingsPopover from "@/components/team/TeamSettingsPopover";
import { TEAM_IDS, type TeamId, deriveTeamSlug } from "@/lib/team-data/players";
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

/**
 * 로컬 팀 관리용 타입 (my-teams-settings.tsx 패턴 적용)
 */
interface EditableTeam {
  teamId: string;
  team: {
    id: string;
    name: string;
    logoUrl?: string;
    icon?: string;
    color?: string;
  };
  _dirty?: boolean;
  _tempFavoriteDate?: string | null;
  _tempFavoritePlayerName?: string | null;
  _tempFavoritePlayerNumber?: number | null;
  _selected: boolean;
}

/**
 * GraphQL 팀 ID를 로컬 TEAM_IDS로 변환하는 헬퍼 함수
 * @param graphQLTeamId GraphQL에서 받은 팀 ID
 * @returns 로컬 TEAM_IDS 값 또는 기본값 (doosan)
 */
const mapGraphQLTeamIdToLocalTeamId = (graphQLTeamId: string): TeamId => {
  // 팀 이름이나 코드에 따라 매핑
  const teamNameMappings: Record<string, TeamId> = {
    // ID 기반 매핑 (GraphQL ID가 로컬 ID와 같은 경우)
    [TEAM_IDS.DOOSAN]: TEAM_IDS.DOOSAN,
    [TEAM_IDS.LG]: TEAM_IDS.LG,
    [TEAM_IDS.SSG]: TEAM_IDS.SSG,
    [TEAM_IDS.KT]: TEAM_IDS.KT,
    [TEAM_IDS.SAMSUNG]: TEAM_IDS.SAMSUNG,
    [TEAM_IDS.LOTTE]: TEAM_IDS.LOTTE,
    [TEAM_IDS.NC]: TEAM_IDS.NC,
    [TEAM_IDS.KIA]: TEAM_IDS.KIA,
    [TEAM_IDS.KIWOOM]: TEAM_IDS.KIWOOM,
    [TEAM_IDS.HANWHA]: TEAM_IDS.HANWHA,

    // === 두산 베어스 ===
    "두산": TEAM_IDS.DOOSAN,
    "doosan-bears": TEAM_IDS.DOOSAN,
    "doosan bears": TEAM_IDS.DOOSAN,
    "bears": TEAM_IDS.DOOSAN,
    "ob": TEAM_IDS.DOOSAN, // OB 베어스
    "doosanbearers": TEAM_IDS.DOOSAN,
    "두산 베어스": TEAM_IDS.DOOSAN,
    "두산베어스": TEAM_IDS.DOOSAN,

    // === LG 트윈스 ===
    "LG": TEAM_IDS.LG,
    "lg-twins": TEAM_IDS.LG,
    "lg twins": TEAM_IDS.LG,
    "twins": TEAM_IDS.LG,
    "엘지": TEAM_IDS.LG,
    "lg트윈스": TEAM_IDS.LG,
    "엘지 트윈스": TEAM_IDS.LG,

    // === SSG 랜더스 ===
    "SSG": TEAM_IDS.SSG,
    "ssg-landers": TEAM_IDS.SSG,
    "ssg landers": TEAM_IDS.SSG,
    "landers": TEAM_IDS.SSG,
    "에스에스지": TEAM_IDS.SSG,
    "ssg랜더스": TEAM_IDS.SSG,
    "sk": TEAM_IDS.SSG, // 이전 SK 와이번스
    "에스에스지 랜더스": TEAM_IDS.SSG,

    // === KT 위즈 ===
    "KT": TEAM_IDS.KT,
    "kt-wiz": TEAM_IDS.KT,
    "kt wiz": TEAM_IDS.KT,
    "wiz": TEAM_IDS.KT,
    "케이티": TEAM_IDS.KT,
    "kt위즈": TEAM_IDS.KT,
    "케이티 위즈": TEAM_IDS.KT,

    // === 삼성 라이온즈 ===
    "삼성": TEAM_IDS.SAMSUNG,
    "samsung-lions": TEAM_IDS.SAMSUNG,
    "samsung lions": TEAM_IDS.SAMSUNG,
    "lions": TEAM_IDS.SAMSUNG,
    "삼성라이온즈": TEAM_IDS.SAMSUNG,
    "삼성 라이온즈": TEAM_IDS.SAMSUNG,
    "samsung라이온즈": TEAM_IDS.SAMSUNG,

    // === 롯데 자이언츠 ===
    "롯데": TEAM_IDS.LOTTE,
    "lotte-giants": TEAM_IDS.LOTTE,
    "lotte giants": TEAM_IDS.LOTTE,
    "giants": TEAM_IDS.LOTTE,
    "롯데자이언츠": TEAM_IDS.LOTTE,
    "롯데 자이언츠": TEAM_IDS.LOTTE,
    "lotte자이언츠": TEAM_IDS.LOTTE,

    // === NC 다이노스 ===
    "NC": TEAM_IDS.NC,
    "nc-dinos": TEAM_IDS.NC,
    "nc dinos": TEAM_IDS.NC,
    "dinos": TEAM_IDS.NC,
    "엔씨": TEAM_IDS.NC,
    "nc다이노스": TEAM_IDS.NC,
    "엔씨 다이노스": TEAM_IDS.NC,

    // === KIA 타이거즈 ===
    "KIA": TEAM_IDS.KIA,
    "kia-tigers": TEAM_IDS.KIA,
    "kia tigers": TEAM_IDS.KIA,
    "tigers": TEAM_IDS.KIA,
    "기아": TEAM_IDS.KIA,
    "kia타이거즈": TEAM_IDS.KIA,
    "해태": TEAM_IDS.KIA, // 이전 해태 타이거즈
    "기아 타이거즈": TEAM_IDS.KIA,

    // === 키움 히어로즈 ===
    "키움": TEAM_IDS.KIWOOM,
    "kiwoom-heroes": TEAM_IDS.KIWOOM,
    "kiwoom heroes": TEAM_IDS.KIWOOM,
    "heroes": TEAM_IDS.KIWOOM,
    "넥센": TEAM_IDS.KIWOOM, // 이전 넥센 히어로즈
    "우리": TEAM_IDS.KIWOOM, // 이전 우리 히어로즈
    "히어로즈": TEAM_IDS.KIWOOM,
    "키움 히어로즈": TEAM_IDS.KIWOOM,

    // === 한화 이글스 ===
    "한화": TEAM_IDS.HANWHA,
    "hanwha-eagles": TEAM_IDS.HANWHA,
    "hanwha eagles": TEAM_IDS.HANWHA,
    "eagles": TEAM_IDS.HANWHA,
    "한화이글스": TEAM_IDS.HANWHA,
    "한화 이글스": TEAM_IDS.HANWHA,
    "한화eagles": TEAM_IDS.HANWHA,
    "hanwhaeagles": TEAM_IDS.HANWHA,
  };

  // 대소문자 구분 없이 매핑 시도
  const normalizedId = graphQLTeamId.toLowerCase().trim();

  const result = teamNameMappings[normalizedId] ||
                 teamNameMappings[graphQLTeamId];

  // 매핑 실패 시 로그로 확인
  if (!result) {
    // console.warn("팀 ID 매핑 실패:", graphQLTeamId, "-> 기본값(doosan) 사용");
  }

  return result || TEAM_IDS.DOOSAN; // 기본값
};

export default function TeamSelectionScreen() {
  const { themed, theme, setTeamColorOverride } = useAppTheme();
  const router = useRouter();
  const { origin } = useLocalSearchParams<{ origin?: string }>();
  const {
    user: currentUser,
    isAuthenticated,
    accessToken,
    updateUser,
  } = useAuth();

  // --- 로컬 UI 상태 (my-teams-settings.tsx 패턴 적용) ---
  const [teams, setTeams] = useState<EditableTeam[]>([]);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);

  // --- 계산된 값들 ---
  const selectedTeams = useMemo(
    () => teams.filter((t) => t._selected),
    [teams],
  );
  const safeSelectedTeams = selectedTeams.map((t) => t.teamId);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showPlayerSelector, setShowPlayerSelector] = useState(false);
  const [pendingTeamId, setPendingTeamId] = useState<TeamId | null>(null);
  const [pendingOriginalTeamId, setPendingOriginalTeamId] = useState<string | null>(null);
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

  // 팀 색상 선택 로직 (공유 hook 사용)
  const {
    applyTeamColor,
    handleTeamSelection,
    getPriorityBasedSelection,
    deriveTeamSlug,
    findTeamById,
  } = useTeamColorSelection({
    myTeamsData,
    teamColorTeamId: null, // team-selection에서는 teamColorTeamId를 사용하지 않음
    selectedTeamId: safeSelectedTeams[0] || null, // 첫 번째 선택된 팀
    setTeamColorOverride: async (color: string) => {
      setTeamColorOverride(color);
    },
  });

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

  // --- myTeamsData 로컬 상태 반영 (EditableTeam[]로 변환) ---
  useEffect(() => {
    if (!myTeamsData?.myTeams) return;
    try {
      const mappedTeams: EditableTeam[] = myTeamsData.myTeams.map((ut) => ({
        teamId: ut.teamId,
        team: ut.team,
        _dirty: false,
        _tempFavoriteDate: ut.favoriteDate || null,
        _tempFavoritePlayerName: (ut as any).favoritePlayerName || null,
        _tempFavoritePlayerNumber: (ut as any).favoritePlayerNumber ?? null,
        _selected: true, // myTeams에 있는 팀들은 모두 선택된 상태
      }));

      setTeams(mappedTeams);

      // 초기 로딩 시 선택된 첫 번째 팀의 색상 적용
      if (mappedTeams.length > 0) {
        // 색상 적용은 비동기로 처리
        setTimeout(() => {
          applyTeamColor(mappedTeams[0].teamId, sportsData).catch((error) => {
            console.warn("초기 팀 색상 적용 실패:", error);
          });
        }, 100);
      }
    } catch (e) {
      console.error("myTeams 처리 오류:", e);
    }
  }, [myTeamsData, sportsData]);

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

  // --- 팀 선택/재선택 (my-teams-settings.tsx 패턴 적용) ---
  const handleTeamSelect = useCallback((teamId: string) => {
    // 디버깅: 실제 팀 ID 확인
    // console.log("=== 팀 선택 디버깅 ===");
    // console.log("GraphQL Team ID:", teamId);

    // const mappedTeamId = mapGraphQLTeamIdToLocalTeamId(teamId);
    // console.log("매핑된 로컬 Team ID:", mappedTeamId);

    // 실제 선수 데이터 확인
    // const { getPlayersByTeam } = require("@/lib/team-data/players");
    // const players = getPlayersByTeam(mappedTeamId);
    // console.log(`매핑된 팀(${mappedTeamId})의 선수 수:`, players.length);

    setTeams((prev) => {
      const existingTeam = prev.find((t) => t.teamId === teamId);
      const isAlreadySelected = existingTeam?._selected || false;

      if (isAlreadySelected) {
        // 이미 선택된 팀이면 → 아무것도 하지 않음 (재선택은 설정 팝오버에서 처리)
        return prev.filter((t) => t.teamId !== teamId);
        // return prev;

      } else {
        // 새로 선택하는 경우
        const teamData = sportsData?.sports
          ?.flatMap((s) => s.teams)
          ?.find((t) => t.id === teamId);

        if (!teamData) {
          console.warn("팀 데이터를 찾을 수 없음:", teamId);
          return prev;
        }

        const newTeam: EditableTeam = {
          teamId: teamId,
          team: teamData,
          _dirty: false,
          _tempFavoriteDate: null,
          _tempFavoritePlayerName: null,
          _tempFavoritePlayerNumber: null,
          _selected: true,
        };

        return [...prev, newTeam];
      }
    });

    // 공유 hook을 사용한 팀 선택 처리 (색상 적용 포함)
    handleTeamSelection(teamId, safeSelectedTeams, sportsData);
  }, [safeSelectedTeams, sportsData]);

  // --- 팀 설정 팝오버 열기 ---
  const openTeamSettings = (
    teamId: string,
    pageX: number = 0,
    pageY: number = 0,
  ) => {
    console.log("=== openTeamSettings 디버깅 ===");
    console.log("받은 원본 GraphQL teamId:", teamId);
    const mappedTeamId = mapGraphQLTeamIdToLocalTeamId(teamId);
    console.log("매핑된 로컬 teamId:", mappedTeamId);
    setPendingTeamId(mappedTeamId); // 변환된 teamId 저장
    setPendingOriginalTeamId(teamId); // 원본 teamId도 저장
    setShowCalendar(false);
    setShowSettings(true);
    setSettingsAnchor({ top: pageY + 8, left: pageX - 110 });
  };

  // --- 팬이 된 날짜 선택 (로컬 상태 저장) ---
  const handleFavoriteDateSelect = (favoriteDate: string) => {
    if (!pendingOriginalTeamId) return;

    setTeams((prev) =>
      prev.map((t) =>
        t.teamId === pendingOriginalTeamId
          ? {
              ...t,
              _tempFavoriteDate: favoriteDate,
              _dirty: t._dirty || t._tempFavoriteDate !== favoriteDate,
            }
          : t,
      ),
    );

    setPendingTeamId(null);
    setPendingOriginalTeamId(null);
    setShowCalendar(false);
  };

  // --- 캘린더 취소 ---
  const handleCalendarCancel = () => {
    setPendingTeamId(null);
    setPendingOriginalTeamId(null);
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
    if (safeSelectedTeams.length === 0) {
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
          teams: selectedTeams.map((team) => ({
            teamId: team.teamId,
            favoriteDate: team._tempFavoriteDate || null,
            favoritePlayerName: team._tempFavoritePlayerName || null,
            favoritePlayerNumber: team._tempFavoritePlayerNumber ?? null,
          })),
        },
      });

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      // 최신 myTeams 재조회 후 전역 사용자 업데이트
      const refetched = await refetchMyTeams({ fetchPolicy: "network-only" });
      const newMyTeams = refetched?.data?.myTeams || [];
      await updateUser({ myTeams: newMyTeams } as any);

      // 저장 완료 후 최종 팀 색상 적용 (첫 번째 팀 기준)
      if (selectedTeams.length > 0) {
        applyTeamColor(selectedTeams[0].teamId, sportsData).catch((error) => {
          console.warn("저장 후 팀 색상 적용 실패:", error);
        });
      }

      // 필터 상태도 로컬 저장 (피드 필터링과 동기화)
      try {
        await AsyncStorage.setItem(
          "selected_team_filter",
          JSON.stringify(safeSelectedTeams),
        );
      } catch (e) {
        console.warn("팀 필터 AsyncStorage 저장 실패:", (e as any)?.message);
      }

      // 로컬 상태 _dirty 플래그 초기화
      setTeams((prev) =>
        prev.map((t) => ({
          ...t,
          _dirty: false,
        })),
      );

      showToast({
        type: "success",
        title: "저장 완료",
        message: `${selectedTeams.length}개 팀이 저장되었습니다.`,
        duration: 2000,
      });
      // origin 파라미터에 따라 돌아갈 경로를 명확히 지정
      if (origin === "profile") {
        // 온보딩(프로필 설정) 플로우에서 진입한 경우 다시 프로필 설정 모달로
        router.replace("/(modals)/post-signup-profile");
      } else if (origin === "team-center") {
        // 팀 센터에서 진입한 경우 팀 센터 상세 페이지로 복귀
        router.replace("/(details)/team-center");
      } else {
        // 그 외에는 기존 동작 유지 (스택 기반 뒤로가기)
        router.back();
      }
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
  const renderTeamGrid = useCallback((graphQLTeams: Team[]) => {
    const teamsPerRow = 3;
    const rows: React.ReactElement[] = [];

    for (let i = 0; i < graphQLTeams.length; i += teamsPerRow) {
      const rowTeams = graphQLTeams.slice(i, i + teamsPerRow);

      rows.push(
        <View key={`row-${i}`} style={themed($teamRow)}>
          {rowTeams.map((team) => {
            const teamId = team.id;
            const isSelected = safeSelectedTeams.includes(teamId);
            // 선택된 팀의 로컬 상태 정보 가져오기
            const editableTeam = teams.find((t) => t.teamId === teamId);
            const priorityInfo = getPriorityBasedSelection(teamId);
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
                      {priorityInfo.isPrimaryTeam && " ⭐"}
                    </Text>
                    {isSelected && editableTeam?._tempFavoriteDate && (
                      <Text
                        style={themed($teamCardDate)}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {new Date(editableTeam._tempFavoriteDate).toLocaleDateString(
                          "ko-KR",
                          {
                            year: "numeric",
                            month: "short",
                          },
                        )}
                        ~
                      </Text>
                    )}
                    {isSelected && editableTeam?._tempFavoritePlayerName && (
                      <Text
                        style={themed($teamCardPlayer)}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {editableTeam._tempFavoritePlayerName}
                        {editableTeam._tempFavoritePlayerNumber && ` (#${editableTeam._tempFavoritePlayerNumber})`}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
                {/* {isSelected ? (
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
                )} */}
              </View>
            );
          })}
          {/* 빈 자리 채우기: 실제 셀과 동일한 래퍼/구조로 렌더링하여 마지막 줄도 정렬 통일 */}
          {Array.from({ length: teamsPerRow - rowTeams.length }).map((_, j) => (
            <View key={`empty-${i}-${j}`} style={themed($teamItemColumn)}>
              <View style={[themed($teamCard), { opacity: 0 }]} />
              <View style={themed($teamSettingsPlaceholder)} />
            </View>
          ))}
        </View>,
      );
    }
    return rows;
  }, [teams, safeSelectedTeams, theme.colors.tint, theme.colors.text, theme.colors.border, theme.colors.card, themed]);

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
            {isLoading ? "저장 중..." : "저장 (색상 즉시 적용)"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 안내 섹션 */}
      <View style={themed($descriptionSection)}>
        <Text style={themed($descriptionTitle)}>응원할 팀을 선택하세요</Text>
        <Text style={themed($descriptionText)}>
          여러 팀을 선택할 수 있으며, 첫 번째로 선택한 팀이 주 팀으로
          설정됩니다. 선택 시 즉시 앱 색상이 변경됩니다.
        </Text>
        {safeSelectedTeams.length > 0 && (
          <Text style={themed($selectedCountText)}>
            {safeSelectedTeams.length}개 팀 선택됨
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
        onClose={() => {
          setShowSettings(false);
          setPendingTeamId(null);
          setPendingOriginalTeamId(null);
        }}
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
        onSelectFavoritePlayer={() => {
          setShowSettings(false);
          setShowPlayerSelector(true);
        }}
        teamId={pendingTeamId || undefined}
      />

      {/* 팬이 된 날짜 선택 Month Picker */}
      <FavoriteMonthPicker
        visible={showCalendar}
        onClose={handleCalendarCancel}
        onSelect={handleFavoriteDateSelect}
        selectedDate={
          pendingOriginalTeamId
            ? teams.find((t) => t.teamId === pendingOriginalTeamId)?._tempFavoriteDate || undefined
            : undefined
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

      {/* 최애 선수 선택 팝업 */}
      <FavoritePlayerSelector
        visible={showPlayerSelector}
        onClose={() => {
          setShowPlayerSelector(false);
          setPendingTeamId(null);
          setPendingOriginalTeamId(null);
        }}
        teamId={pendingTeamId || TEAM_IDS.DOOSAN}
        onSelect={(player) => {
          if (!pendingOriginalTeamId) return;

          setTeams((prev) =>
            prev.map((t) =>
              t.teamId === pendingOriginalTeamId
                ? {
                    ...t,
                    _tempFavoritePlayerName: player.name,
                    _tempFavoritePlayerNumber: player.number,
                    _dirty:
                      t._dirty ||
                      t._tempFavoritePlayerName !== player.name ||
                      t._tempFavoritePlayerNumber !== player.number,
                  }
                : t,
            ),
          );

          setShowPlayerSelector(false);
          setPendingTeamId(null);
          setPendingOriginalTeamId(null);
        }}
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

const $teamCardPlayer: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 10,
  color: colors.tint,
  textAlign: "center",
  marginTop: 1,
  fontWeight: "600",
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

/* 커밋 메세지: refactor(team-selection): useTeamColorSelection hook 활용하여 코드 중복 제거 */
