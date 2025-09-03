import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
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
import { User, getSession, saveSession } from "@/lib/auth";
import { emitSessionChange } from "@/lib/auth/user-session-events";
import { showToast } from "@/components/CustomToast";
import TeamLogo from "@/components/TeamLogo";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  const [teamFavoriteDates, setTeamFavoriteDates] = useState<
    Record<string, string>
  >({});
  // 최애 선수 { name, number } 상태 (팀별)
  const [teamFavoritePlayers, setTeamFavoritePlayers] = useState<
    Record<string, { name?: string; number?: number }>
  >({});
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [pendingTeamId, setPendingTeamId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsAnchor, setSettingsAnchor] = useState<{
    top: number;
    left: number;
  } | null>(null);

  // GraphQL 쿼리 및 뮤테이션
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
        error.message.includes("Cannot read properties of undefined") ||
        error.message.includes("Unauthorized") ||
        error.message.includes("로그인")
      ) {
        setAuthError("인증 오류가 발생했습니다. 다시 로그인해주세요.");
      }
    },
  });

  const [updateMyTeams, { loading: updateLoading, error: updateError }] =
    useMutation<UpdateMyTeamsResult>(UPDATE_MY_TEAMS);

  // 전체 로딩 상태
  const isLoading = sportsLoading || myTeamsLoading || updateLoading;

  // 사용자 정보 로드 및 인증 확인
  useEffect(() => {
    const loadUserAndCheckAuth = async () => {
      try {
        const { token, user, isAuthenticated: authStatus } = await getSession();
        setIsAuthenticated(authStatus);

        if (user) {
          setCurrentUser(user);
        } else if (!token) {
          console.warn("인증되지 않은 사용자가 팀 선택 화면에 접근");
          setAuthError("로그인이 필요한 기능입니다.");
          showToast({
            type: "error",
            title: "인증 필요",
            message: "로그인이 필요한 기능입니다.",
            duration: 2000,
          });
          setTimeout(() => router.back(), 500);
        }

        console.log("인증 상태:", {
          isAuthenticated: authStatus,
          hasToken: !!token,
          hasUser: !!user,
          userId: user?.id,
          tokenLength: token?.length || 0,
        });
      } catch (error) {
        console.error("인증 확인 중 오류 발생:", error);
        setAuthError("인증 상태를 확인할 수 없습니다.");
      }
    };
    loadUserAndCheckAuth();
  }, [router]);

  // 사용자가 선택한 팀 목록 로드
  useEffect(() => {
    if (myTeamsData?.myTeams) {
      try {
        console.log(
          "MyTeams 데이터 확인:",
          JSON.stringify(myTeamsData.myTeams, null, 2),
        );

        const teamIds: string[] = [];
        const favoriteDates: Record<string, string> = {};
        const favoritePlayers: Record<
          string,
          { name?: string; number?: number }
        > = {};

        myTeamsData.myTeams.forEach((userTeam) => {
          console.log("UserTeam 객체:", userTeam);

          if (!userTeam.team) {
            console.error("UserTeam에 team 객체가 없음:", userTeam);
            return;
          }

          teamIds.push(userTeam.team.id);

          // favoriteDate가 있으면 저장
          if (userTeam.favoriteDate) {
            favoriteDates[userTeam.team.id] = userTeam.favoriteDate;
          }
          if (
            (userTeam as any).favoritePlayerName ||
            (userTeam as any).favoritePlayerNumber !== undefined
          ) {
            favoritePlayers[userTeam.team.id] = {
              name: (userTeam as any).favoritePlayerName,
              number: (userTeam as any).favoritePlayerNumber,
            };
          }
        });

        setSelectedTeams(teamIds);
        setTeamFavoriteDates(favoriteDates);
        setTeamFavoritePlayers(favoritePlayers);
        console.log("사용자가 선택한 팀 목록 로드 성공:", teamIds);
        console.log("팀별 favoriteDate 로드 성공:", favoriteDates);
        console.log("팀별 favoritePlayer 로드 성공:", favoritePlayers);
      } catch (error) {
        console.error("팀 목록 처리 중 오류 발생:", error);
      }
    }
  }, [myTeamsData]);

  // 인증 오류 발생 시 처리
  useEffect(() => {
    if (myTeamsError) {
      console.error("myTeams 쿼리 오류:", myTeamsError);
      if (isAuthenticated === false) {
        showToast({
          type: "error",
          title: "인증 오류",
          message: "인증 정보가 만료되었습니다. 다시 로그인해주세요.",
          duration: 3000,
        });
      }
    }
  }, [myTeamsError, isAuthenticated]);

  /**
   * 팀 선택/해제 핸들러
   */
  const handleTeamSelect = (teamId: string) => {
    setSelectedTeams((prev) => {
      if (prev.includes(teamId)) {
        // 이미 선택된 팀이면 해제
        setTeamFavoriteDates((prevDates) => {
          const newDates = { ...prevDates };
          delete newDates[teamId];
          return newDates;
        });
        // 팀 설정 버튼 숨김
        setShowSettings(false);
        return prev.filter((id) => id !== teamId);
      } else {
        // 선택만 수행. 팀 설정 버튼은 별도 버튼 클릭 시 노출
        return [...prev, teamId];
      }
    });
  };

  /**
   * 팀 설정 버튼 클릭 시 팝오버 오픈
   */
  const openTeamSettings = (teamId: string, pageX: number, pageY: number) => {
    setPendingTeamId(teamId);
    setShowCalendar(false);
    setShowSettings(true);
    setSettingsAnchor({ top: pageY + 8, left: pageX - 110 });
  };

  /**
   * 팬이 된 날짜 선택 핸들러
   */
  const handleFavoriteDateSelect = (favoriteDate: string) => {
    if (pendingTeamId) {
      // 팀 추가 및 favoriteDate 저장
      // 팀은 이미 선택되어 있으므로 날짜만 저장
      setTeamFavoriteDates((prev) => ({
        ...prev,
        [pendingTeamId]: favoriteDate,
      }));
    }
    setPendingTeamId(null);
    setShowCalendar(false);
  };

  /**
   * 캘린더 취소 핸들러
   */
  const handleCalendarCancel = () => {
    setPendingTeamId(null);
    setShowCalendar(false);
  };

  /**
   * 인증 상태 확인 함수
   */
  const checkAuthentication = async () => {
    try {
      const { token, user, isAuthenticated: authStatus } = await getSession();

      console.log("인증 상태 확인:", {
        hasToken: !!token,
        tokenLength: token?.length || 0,
        hasUser: !!user,
        isAuthenticated: authStatus,
      });

      if (!authStatus) {
        setIsAuthenticated(false);
        setAuthError("인증 정보가 유효하지 않습니다.");
        showToast({
          type: "error",
          title: "인증 필요",
          message: "로그인이 필요한 기능입니다.",
          duration: 3000,
        });
        return false;
      }

      setIsAuthenticated(true);
      return true;
    } catch (error) {
      console.error("인증 확인 중 오류 발생:", error);
      setAuthError("인증 상태를 확인할 수 없습니다.");
      return false;
    }
  };

  /**
   * 팀 선택 저장 핸들러
   */
  const handleSave = async () => {
    if (isLoading) return;

    console.log("팀 저장 시도...");

    // 인증 상태 확인
    const isAuthValid = await checkAuthentication();
    if (!isAuthValid) {
      console.error("인증 실패 - 팀 저장 취소");
      setTimeout(() => router.back(), 1000);
      return;
    }

    // 사용자 정보 확인
    if (!currentUser) {
      console.error("사용자 정보 없음 - 팀 저장 취소");
      showToast({
        type: "error",
        title: "인증 필요",
        message: "팀 선택을 저장하려면 로그인이 필요합니다.",
        duration: 3000,
      });
      return;
    }

    // 토큰 상태 재확인
    const { token } = await getSession();
    if (!token) {
      console.error("토큰 없음 - 팀 저장 취소");
      showToast({
        type: "error",
        title: "인증 오류",
        message: "인증 정보가 만료되었습니다. 다시 로그인해주세요.",
        duration: 3000,
      });
      setTimeout(() => router.back(), 1000);
      return;
    }

    if (selectedTeams.length === 0) {
      showToast({
        type: "warning",
        title: "팀 선택 필요",
        message: "최소 1개 이상의 팀을 선택해주세요.",
        duration: 3000,
      });
      return;
    }

    try {
      console.log("팀 선택 저장 요청 시작:", selectedTeams);

      // 세션 정보 가져오기
      const sessionInfo = await getSession();
      console.log("저장 요청 전 세션 상태:", {
        hasToken: !!sessionInfo.token,
        tokenLength: sessionInfo.token?.length || 0,
        hasUser: !!sessionInfo.user,
        userId: sessionInfo.user?.id,
        isAuthenticated: sessionInfo.isAuthenticated,
      });

      // GraphQL 뮤테이션으로 팀 선택 업데이트
      const { data, errors } = await updateMyTeams({
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
            authorization: sessionInfo.token
              ? `Bearer ${sessionInfo.token}`
              : "",
          },
        },
      });

      if (errors) {
        console.error("GraphQL 뮤테이션 오류:", errors);
        throw new Error(errors[0].message);
      }

      console.log("팀 선택 저장 성공:", data);

      // 사용자 팀 목록 다시 조회 (신규: refetch 결과를 세션 및 전역 이벤트에 반영)
      const refetched = await refetchMyTeams({ fetchPolicy: "network-only" });
      try {
        const newMyTeams = refetched?.data?.myTeams || [];
        // 현재 세션 사용자 불러오기
        const sessionInfoAfter = await getSession();
        const sessionUser = sessionInfoAfter.user;

        if (sessionUser) {
          // 세션 사용자 객체에 최신 myTeams 병합
          await saveSession({
            ...sessionUser,
            myTeams: newMyTeams,
          } as any);

          // 세션 변경 이벤트 브로드캐스트 (feed 등에서 즉시 반영)
          emitSessionChange({
            user: { ...sessionUser, myTeams: newMyTeams } as any,
            token: sessionInfoAfter.token,
            reason: "update",
          });
          
        } else {
          console.warn(
            "세션 사용자 정보를 찾지 못해 myTeams 세션 반영을 건너뜀",
          );
        }
      } catch (sessionSyncError) {
        console.warn("MyTeams 세션 반영 중 오류:", sessionSyncError);
      }

      // My Teams 변경 시 필터를 새로운 My Teams로 재설정
      try {
        await AsyncStorage.setItem(
          "selected_team_filter",
          JSON.stringify(selectedTeams),
        );
        
      } catch (error) {
        console.error("필터 재설정 실패:", error);
      }

      showToast({
        type: "success",
        title: "My Teams 저장 완료",
        message:
          selectedTeams.length > 0
            ? `${selectedTeams.length}개 팀이 My Teams로 저장되었습니다!`
            : "My Teams가 저장되었습니다.",
        duration: 2000,
      });

      router.back();
    } catch (error) {
      console.error("팀 선택 저장 실패:", error);

      // 인증 관련 오류인지 확인
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes("login") ||
        errorMessage.includes("로그인") ||
        errorMessage.includes("인증") ||
        errorMessage.includes("auth") ||
        errorMessage.includes("token") ||
        errorMessage.includes("토큰") ||
        errorMessage.includes("undefined") ||
        errorMessage.includes("Unauthorized")
      ) {
        console.error("인증 오류 발생:", errorMessage);

        showToast({
          type: "error",
          title: "인증 오류",
          message: "인증에 문제가 발생했습니다. 다시 로그인해주세요.",
          duration: 3000,
        });

        setTimeout(() => router.back(), 1000);

        getSession().then(({ token, user }) => {
          
        });
      } else {
        showToast({
          type: "error",
          title: "저장 실패",
          message: "팀 선택을 저장하는 중 오류가 발생했습니다.",
          duration: 3000,
        });
      }
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
   * 팀 그리드 렌더링 (여러 개 표시)
   */
  const renderTeamGrid = (teams: Team[]) => {
    console.log(
      "렌더링할 팀 목록:",
      teams.map((t) => ({ id: t.id, name: t.name })),
    );
    console.log("현재 선택된 팀 ID 목록:", selectedTeams);

    const rows = [];
    const teamsPerRow = 3; // 3개씩 표시

    for (let i = 0; i < teams.length; i += teamsPerRow) {
      const rowTeams = teams.slice(i, i + teamsPerRow);
      rows.push(
        <View key={i} style={themed($teamRow)}>
          {rowTeams.map((team) => {
            const teamId = team.id;
            const isSelected = selectedTeams.includes(teamId);
            console.log(
              `팀 ${team.name} (ID: ${teamId}): ${isSelected ? "선택됨" : "선택안됨"}`,
            );

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
                        ? team.color + "20"
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
                    >
                      {team.name}
                    </Text>
                    {isSelected && teamFavoriteDates[teamId] && (
                      <Text style={themed($teamCardDate)}>
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

                {/* 팀 설정 버튼 (선택된 팀에만 표시). 나머지는 placeholder로 높이 유지 */}
                {isSelected ? (
                  <TouchableOpacity
                    style={[
                      themed($teamSettingsButton),
                      { borderColor: team.color },
                    ]}
                    onPress={(e) =>
                      openTeamSettings(
                        teamId,
                        e.nativeEvent?.pageX || 0,
                        e.nativeEvent?.pageY || 0,
                      )
                    }
                    activeOpacity={0.85}
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

  // 인증 오류 처리
  if (authError) {
    console.log("인증 오류로 인한 화면 렌더링:", authError);

    getSession().then(({ token, user, isAuthenticated }) => {
      console.log("인증 오류 화면 - 세션 상태:", {
        hasToken: !!token,
        tokenLength: token?.length || 0,
        hasUser: !!user,
        userId: user?.id,
        isAuthenticated,
      });
    });

    return (
      <View style={[themed($container), themed($errorContainer)]}>
        <Text style={themed($errorText)}>{authError}</Text>
        <TouchableOpacity
          style={themed($retryButton)}
          onPress={() => {
            
            router.back();
          }}
        >
          <Text style={themed($retryButtonText)}>로그인 화면으로</Text>
        </TouchableOpacity>
      </View>
    );
  }

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

  // 디버깅을 위한 로그
  console.log("Sports data:", sports);
  console.log("Current sport:", currentSport);
  console.log("Current sport teams:", currentSport?.teams);

  return (
    <View style={themed($container)}>
      {/* 헤더 */}
      <View style={themed($header)}>
        <TouchableOpacity onPress={() => router.back()}>
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

      {/* 로딩 중 표시 */}
      {updateLoading && (
        <View style={themed($loadingOverlay)}>
          <ActivityIndicator size="large" color={theme.colors.tint} />
          <Text style={themed($loadingText)}>데이터 저장 중...</Text>
        </View>
      )}

      {/* 인증 오류 메시지 */}
      {myTeamsError && (
        <View
          style={[
            themed($errorContainer),
            { position: "absolute", bottom: 20, left: 20, right: 20 },
          ]}
        >
          <Text style={themed($errorText)}>
            {myTeamsError.message.includes("인증") ||
            myTeamsError.message.includes("Unauthorized") ||
            myTeamsError.message.includes("token")
              ? "인증 정보가 만료되었습니다. 다시 로그인해주세요."
              : "팀 정보를 불러오는 중 오류가 발생했습니다."}
          </Text>
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
          // 최애 선수 로컬 상태 갱신 + 즉시 백엔드 반영
          if (!pendingTeamId) return;
          const updatedPlayers = {
            ...teamFavoritePlayers,
            [pendingTeamId]: {
              name: player.name,
              number: player.number,
            },
          };
          // 1) 로컬 상태 먼저 업데이트 (UI 즉시 반영)
          setTeamFavoritePlayers(updatedPlayers);
          // 2) 기존 선택된 팀 전체를 그대로 다시 전송 (favoriteDate 로직과 동일한 패턴 유지)
          try {
            // NOTE: 즉시 저장 - 커스텀 헤더 제거 (CORS: 'x-refresh-session' 차단 이슈 해결)
            await updateMyTeams({
              variables: {
                teams: selectedTeams.map((teamId) => ({
                  teamId,
                  favoriteDate: teamFavoriteDates[teamId] || null,
                  favoritePlayerName: updatedPlayers[teamId]?.name || null,
                  favoritePlayerNumber: updatedPlayers[teamId]?.number ?? null,
                })),
              },
            });
            // (선택) 추후 성공 토스트 추가 가능
          } catch (error) {
            console.error("최애 선수 즉시 저장 실패:", error);
            // (선택) 실패 시 롤백 로직 또는 사용자 알림 추가 가능
          }
        }}
      />

      {/* 팬이 된 날짜 선택 (연/월) */}
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
                .flatMap((sport) => sport.teams)
                .find((team) => team.id === pendingTeamId)?.name
            : undefined
        }
        teamColor={
          pendingTeamId && sportsData
            ? sportsData.sports
                .flatMap((sport) => sport.teams)
                .find((team) => team.id === pendingTeamId)?.color
            : "#FF0000"
        }
      />
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

const $saveButtonText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 14,
  fontWeight: "600",
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

const $selectedCountText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 14,
  color: colors.tint,
  fontWeight: "600",
  marginTop: spacing.sm,
});

const $scrollContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
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

const $teamSettingsText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  fontWeight: "600",
  color: colors.tint,
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
