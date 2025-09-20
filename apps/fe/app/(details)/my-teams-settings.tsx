import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  ViewStyle,
  TextStyle,
  RefreshControl,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "@apollo/client";
import {
  GET_MY_TEAMS,
  UPDATE_MY_TEAMS_PRIORITY,
  UPDATE_MY_TEAMS,
  type GetMyTeamsResult,
  type UpdateMyTeamsPriorityResult,
  type UpdateMyTeamsResult,
  type UserTeam,
} from "@/lib/graphql/teams";
import { type TeamId, deriveTeamSlug } from "@/lib/team-data/players";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { useAuth } from "@/lib/auth/context/AuthContext";
import FavoriteMonthPicker from "@/components/team/FavoriteMonthPicker";
import FavoritePlayerSelector from "@/components/team/FavoritePlayerSelector";
import PhotoCardSelector from "@/components/team/PhotoCardSelector";
import { TEAM_IDS } from "@/lib/team-data/players";
import TeamLogo from "@/components/TeamLogo";
import PriorityTeamList from "@/components/team/PriorityTeamList";
import { showToast } from "@/components/CustomToast";

/** =========================================
 *  변경 개요 (드래그 → 탭 기반 우선순위)
 *  -----------------------------------------
 *  1. 기존 DraggableFlatList 제거
 *  2. 상단 "팀 순번" 바에서 선택된 팀 우선순위를 원형 버튼으로 표시
 *     - X 버튼으로 선택 해제 가능
 *  3. "팀 선택" 영역에 (선택되지 않은) My Team 목록을 칩 형태로 표시
 *     - 탭하면 우선순위 맨 뒤에 추가
 *     - 이미 선택된 칩을 다시 탭하면 맨 뒤로 이동 (요구사항)
 *  4. 팀 상세 카드는 선택된 팀만 순번대로 출력 (기존 디자인 유지)
 *  5. 순번 및 상세 설정(날짜 / 선수 / 포토카드)은 저장 버튼 누르기 전까지 로컬에만 반영
 *  6. 저장 시 UPDATE_MY_TEAMS_PRIORITY 호출 → priority(순서)만 일괄 전송
 *  7. Dirty 판단:
 *      - 순서 변경
 *      - 선택 / 해제
 *      - 상세 설정 변경
 *  8. 최대 5개 팀 유지 (기존 정책 가정). 선택 수 안내 문구 표시.
 *  ========================================= */

/** 로컬 편집용 타입 확장
 *  - GraphQL 타입 모듈 해석 실패 시(diagnostics)에도 컴파일 가능하도록
 *    실제로 사용하는 필드를 명시적으로 선언
 *  - 서버 스키마 변경 시 여기 필드도 함께 유지/보수 필요
 */
interface EditableUserTeam extends UserTeam {
  /* ==== 로컬 확장 필드 (UserTeam 기본 필드 확장) ==== */
  _dirty?: boolean;
  _tempFavoriteDate?: string | null;
  _tempFavoritePlayerName?: string | null;
  _tempFavoritePlayerNumber?: number | null;
  _tempPhotoCardId?: string | null;
  /** 탭 기반 선택 여부 (선택된 팀만 우선순위/상세 설정 노출) */
  _selected: boolean;
  /** 최초 로딩 시의 priority (Dirty 판단 보조) */
  _initialPriority?: number | null;
}

/** 최대 선택 가능 팀 수 (정책 가정) */
const MAX_TEAMS = 5;

export default function MyTeamsSettingsScreen(): React.ReactElement {
  const { themed, theme, setTeamColorOverride } = useAppTheme();
  const { user: currentUser, accessToken, updateUser } = useAuth();

  // --- GraphQL: 내 팀 목록 조회 ---
  const {
    data: myTeamsData,
    loading: myTeamsLoading,
    error: myTeamsError,
    refetch: refetchMyTeams,
  } = useQuery<GetMyTeamsResult>(GET_MY_TEAMS, { fetchPolicy: "network-only" });

  // --- GraphQL: 업데이트 뮤테이션 ---
  const [updateMyTeamsPriority, { loading: updatingPriority }] =
    useMutation<UpdateMyTeamsPriorityResult>(UPDATE_MY_TEAMS_PRIORITY);

  const [updateMyTeams, { loading: updatingDetails }] =
    useMutation<UpdateMyTeamsResult>(UPDATE_MY_TEAMS);

  // --- 로컬 상태 ---
  const [teams, setTeams] = useState<EditableUserTeam[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // 모달 상태
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const [playerSelectorVisible, setPlayerSelectorVisible] = useState(false);
  const [photoCardSelectorVisible, setPhotoCardSelectorVisible] =
    useState(false);

  // 현재 설정 중인 팀 ID 및 이름
  const [activeTeamId, setActiveTeamId] = useState<TeamId | null>(null);
  const [activeTeamName, setActiveTeamName] = useState<string | null>(null);

  // 최초 로딩 시 선택된 팀 순서 저장 (Dirty 판단용)
  const initialSelectedOrderRef = useRef<string[]>([]);

  /** 초기 데이터 → 로컬 구조로 매핑 */
  useEffect(() => {
    if (myTeamsData?.myTeams) {
      // priority 오름차순 정렬
      const sorted = [...myTeamsData.myTeams].sort(
        (a, b) => (a.priority ?? 999) - (b.priority ?? 999),
      );
      const mapped: EditableUserTeam[] = sorted.map((t) => ({
        ...t,
        _dirty: false,
        _tempFavoriteDate: t.favoriteDate || null,
        _tempFavoritePlayerName: t.favoritePlayerName || null,
        _tempFavoritePlayerNumber:
          typeof t.favoritePlayerNumber === "number"
            ? t.favoritePlayerNumber
            : null,
        _tempPhotoCardId: null,
        _selected: typeof t.priority === "number", // priority 존재하면 선택된 것으로 처리
        _initialPriority: t.priority ?? null,
      }));
      setTeams(mapped);
      // 최초 선택 순서 저장
      initialSelectedOrderRef.current = mapped
        .filter((t) => t._selected)
        .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999))
        .map((t) => t.teamId);
    }
  }, [myTeamsData]);

  /** 선택된 팀들을 현재 우선순위 순서로 계산 */
  const selectedTeams = useMemo(
    () =>
      teams
        .filter((t) => t._selected)
        .sort((a, b) => {
          // priority 값이 현재 로컬에서 재사용되지만, 안전하게 index 기반도 허용
          return (a.priority ?? 999) - (b.priority ?? 999);
        }),
    [teams],
  );

  /** 선택되지 않은 팀 목록 */
  const unselectedTeams = useMemo(
    () => teams.filter((t) => !t._selected),
    [teams],
  );

  /** 전체 Dirty 판단
   *  - 선택/해제/순서 변경
   *  - 상세 값 변경 (_tempFavoriteDate, _tempFavoritePlayerName 등)
   */
  const isDirty = useMemo(() => {
    // (1) 선택 상태 변경 (선택 해제되었거나 새로 선택된 경우)
    const initialSet = new Set(initialSelectedOrderRef.current);
    const currentSelectedIds = selectedTeams.map((t) => t.teamId);

    const selectionChanged =
      currentSelectedIds.length !== initialSelectedOrderRef.current.length ||
      currentSelectedIds.some((id) => !initialSet.has(id)) ||
      initialSelectedOrderRef.current.some(
        (origId) => !currentSelectedIds.includes(origId),
      );

    // (2) 순서 변경
    const orderChanged =
      !selectionChanged &&
      initialSelectedOrderRef.current.some(
        (teamId, idx) => teamId !== currentSelectedIds[idx],
      );

    // (3) 상세 값 변경 (좋아한 날짜, 최애 선수 등)
    const detailsChanged = teams.some((team) => team._dirty);

    return selectionChanged || orderChanged || detailsChanged;
  }, [teams, selectedTeams]);

  /** 새로고침 */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetchMyTeams({ fetchPolicy: "network-only" });
    } finally {
      setRefreshing(false);
    }
  }, [refetchMyTeams]);

  /** 좋아한 날짜 선택 */
  const openMonthPicker = (teamId: string) => {
    setActiveTeamId(teamId as TeamId);
    setMonthPickerVisible(true);
  };

  const handleSelectFavoriteDate = (date: string) => {
    if (!activeTeamId) return;
    setTeams((prev) =>
      prev.map((t) =>
        t.teamId === activeTeamId
          ? {
              ...t,
              _tempFavoriteDate: date,
              _dirty:
                t._dirty ||
                t._tempFavoriteDate !== date,
            }
          : t,
      ),
    );
    setActiveTeamId(null);
    setMonthPickerVisible(false);
  };

  /** 최애 선수 선택 */
  const openPlayerSelector = (teamId: string, teamName: string) => {
    setActiveTeamId(teamId as TeamId); // UUID로 저장용 ID 설정
    setActiveTeamName(teamName); // 팀 이름으로 선수 검색용
    setPlayerSelectorVisible(true);
  };

  const handleSelectPlayer = (player: {
    name: string;
    number: number;
    id?: string;
  }) => {
    if (!activeTeamId) return;
    setTeams((prev) =>
      prev.map((t) =>
        t.teamId === activeTeamId
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
    setActiveTeamId(null);
    setPlayerSelectorVisible(false);
  };

  /** 포토카드 선택 (서버 반영 X) */
  const openPhotoCardSelector = (teamId: string) => {
    setActiveTeamId(teamId as TeamId);
    setPhotoCardSelectorVisible(true);
  };

  const handleSelectPhotoCard = (cardId: string) => {
    if (!activeTeamId) return;
    setTeams((prev) =>
      prev.map((t) =>
        t.teamId === activeTeamId
          ? { ...t, _tempPhotoCardId: cardId, _dirty: true }
          : t,
      ),
    );
    setActiveTeamId(null);
    setPhotoCardSelectorVisible(false);
  };

  /** 팀 선택 / 재선택 (맨 뒤 이동) */
  const handleSelectTeam = useCallback(
    (teamId: string) => {
      setTeams((prev) => {
        // 현재 선택된 목록
        const selected = prev
          .filter((t) => t._selected)
          .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));

        const isAlreadySelected = selected.some((t) => t.teamId === teamId);

        let newSelectedOrder: EditableUserTeam[];

        if (isAlreadySelected) {
          // 재선택 → 맨 뒤 이동
          newSelectedOrder = [
            ...selected.filter((t) => t.teamId !== teamId),
            selected.find((t) => t.teamId === teamId)!,
          ];
        } else {
          // 새 선택 → 마지막에 추가 (최대 수 제한)
          if (selected.length >= MAX_TEAMS) {
            showToast({
              type: "warning",
              title: "선택 제한",
              message: `최대 ${MAX_TEAMS}개 팀까지 선택 가능합니다.`,
              duration: 2200,
            });
            return prev;
          }
          const newTeam = prev.find((t) => t.teamId === teamId);
          if (!newTeam) return prev;
          newSelectedOrder = [...selected, { ...newTeam, _selected: true }];
        }

        // priority 재할당
        newSelectedOrder = newSelectedOrder.map((t, idx) => ({
          ...t,
          priority: idx,
        }));

        // 전체 목록 재구성
        return prev
          .map((t) => {
            const replaced = newSelectedOrder.find(
              (n) => n.teamId === t.teamId,
            );
            if (replaced) return replaced;
            if (isAlreadySelected && t.teamId === teamId) {
              // 재선택 케이스에서 이미 replaced 처리됨
              return t;
            }
            // 새 선택이 아닌 기존 팀
            if (!replaced && t.teamId === teamId && !isAlreadySelected) {
              // 새로 선택된 팀이었는데 newSelectedOrder 에 이미 반영됨 -> 여기 안옴
              return t;
            }
            // 선택되지 않은 팀은 priority 제거
            return {
              ...t,
              _selected:
                !!t._selected && t._selected && t.priority !== undefined
                  ? t._selected
                  : t._selected,
              priority: t._selected ? t.priority : t.priority,
            };
          })
          .map((t) =>
            newSelectedOrder.find((s) => s.teamId === t.teamId)
              ? { ...t, _selected: true }
              : {
                  ...t,
                  _selected:
                    t._selected &&
                    newSelectedOrder.some((s) => s.teamId === t.teamId),
                },
          )
          .map((t) => {
            // 선택되지 않은 팀 처리
            if (!newSelectedOrder.some((s) => s.teamId === t.teamId)) {
              return {
                ...t,
                _selected:
                  t._selected &&
                  newSelectedOrder.some((s) => s.teamId === t.teamId),
              };
            }
            return t;
          })
          .map((t) => {
            // 선택되지 않은 팀 priority 제거
            if (!newSelectedOrder.some((s) => s.teamId === t.teamId)) {
              return { ...t, priority: null };
            }
            return t;
          });
      });
    },
    [setTeams],
  );

  /** 선택해제 (X 버튼) */
  const handleUnselectTeam = useCallback((teamId: string) => {
    setTeams((prev) => {
      // 해당 팀 제외 후 재정렬
      const remaining = prev
        .filter((t) => t._selected && t.teamId !== teamId)
        .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999))
        .map((t, idx) => ({ ...t, priority: idx }));

      return prev.map((t) => {
        if (t.teamId === teamId) {
          return {
            ...t,
            _selected: false,
            priority: null,
          };
        }
        const updated = remaining.find((r) => r.teamId === t.teamId);
        return updated ? updated : t;
      });
    });
  }, []);

  /** 저장 */
  const handleSave = useCallback(async () => {
    if (updatingPriority || updatingDetails || !isDirty) return;

    if (!currentUser) {
      showToast({
        type: "error",
        title: "인증 필요",
        message: "로그인이 필요합니다.",
        duration: 2500,
      });
      return;
    }

    try {
      // 현재 선택된 팀 순서대로 priority payload 구성
      // teamIds 배열(현재 순서)만 서버로 전달하여 priority를 경량 업데이트
      const orderedTeamIds = selectedTeams.map((t) => t.teamId);

      const { errors } = await updateMyTeamsPriority({
        variables: { teamIds: orderedTeamIds },
      });

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      // 선택된 모든 팀의 상세 정보(좋아한 날짜, 최애 선수) 업데이트
      // 변경사항이 없어도 선택된 팀은 유지되어야 함
      const { errors: detailErrors } = await updateMyTeams({
        variables: {
          teams: selectedTeams.map((team) => ({
            teamId: team.teamId,
            favoriteDate: team._tempFavoriteDate || null,
            favoritePlayerName: team._tempFavoritePlayerName || null,
            favoritePlayerNumber: team._tempFavoritePlayerNumber ?? null,
          })),
        },
      });

      if (detailErrors && detailErrors.length > 0) {
        throw new Error(detailErrors[0].message);
      }

      // 서버 반영 후 재조회 (최신 데이터 동기화)
      const refetched = await refetchMyTeams({ fetchPolicy: "network-only" });
      const newMyTeams = refetched?.data?.myTeams || [];
      await updateUser({ myTeams: newMyTeams } as any);

      // 첫 번째 팀의 색상을 자동으로 앱 테마에 적용
      if (selectedTeams.length > 0) {
        const firstTeam = selectedTeams[0];
        try {
          const teamSlug = deriveTeamSlug(firstTeam.team.name);
          await setTeamColorOverride(firstTeam.teamId, teamSlug);
          // console.log(`첫 번째 팀(${firstTeam.team.name}) 색상을 앱 테마에 적용했습니다.`);
        } catch (colorError) {
          console.warn("팀 색상 설정 실패:", colorError);
          // 색상 설정 실패해도 저장 성공으로 처리
        }
      }

      showToast({
        type: "success",
        title: "저장 완료",
        message: "팀 설정이 저장되었습니다.",
        duration: 1800,
      });

      // 초기 순서 갱신
      initialSelectedOrderRef.current = orderedTeamIds;

      // 로컬 priority / dirty 초기화
      setTeams((prev) =>
        prev.map((t) => {
          const updated = newMyTeams.find((n) => n.teamId === t.teamId);
          if (updated) {
            return {
              ...t,
              priority: updated.priority,
              _tempFavoriteDate: updated.favoriteDate || null,
              _tempFavoritePlayerName: (updated as any).favoritePlayerName || null,
              _tempFavoritePlayerNumber: (updated as any).favoritePlayerNumber ?? null,
              _dirty: false,
              _selected: true,
              _initialPriority: updated.priority ?? null,
            };
          }
          return {
            ...t,
            _dirty: false,
            _initialPriority: null,
          };
        }),
      );
    } catch (e: any) {
      showToast({
        type: "error",
        title: "저장 실패",
        message: e?.message || "우선순위 저장 중 오류가 발생했습니다.",
        duration: 3000,
      });
    }
  }, [
    updatingPriority,
    updatingDetails,
    isDirty,
    currentUser,
    accessToken,
    selectedTeams,
    teams,
    updateMyTeamsPriority,
    updateMyTeams,
    refetchMyTeams,
    updateUser,
  ]);

  /** 팀 카드 렌더 */
  const renderTeamCard = useCallback(
    (item: EditableUserTeam, index: number) => {
      const isPrimary = index === 0;
      const dirty = item._dirty;

      const dateLabel = item._tempFavoriteDate
        ? new Date(item._tempFavoriteDate).toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "short",
          })
        : "좋아한 날짜";

      const playerLabel = item._tempFavoritePlayerName
        ? `${item._tempFavoritePlayerName} (#${item._tempFavoritePlayerNumber ?? "?"})`
        : "최애 선수";

      const photoLabel = item._tempPhotoCardId
        ? `포토카드 #${item._tempPhotoCardId}`
        : "포토카드";

      return (
        <View
          key={item.id}
          style={[
            themed($teamCard),
            dirty && { borderColor: theme.colors.tint },
          ]}
        >
          {/* 헤더 */}
          <View style={themed($teamHeaderRow)}>
            {/* (드래그 핸들 제거) → 빈 영역 배치 or 아이콘 변경 */}
            <View style={themed($placeholderHandle)}>
              <Ionicons
                name="analytics-outline"
                size={22}
                color={theme.colors.textDim}
              />
            </View>

            <View style={themed($teamMeta)}>
              <TeamLogo
                logoUrl={item.team.logoUrl}
                fallbackIcon={item.team.icon}
                teamName={item.team.name}
                size={46}
              />
              <View style={themed($teamTitleWrap)}>
                <Text style={themed($teamName)} numberOfLines={1}>
                  {item.team.name}
                </Text>
                <View style={themed($badgesRow)}>
                  {isPrimary && (
                    <View style={[themed($badge), themed($primaryBadge)]}>
                      <Text style={themed($badgeText)}>주 팀</Text>
                    </View>
                  )}
                  {dirty && (
                    <View style={[themed($badge), themed($dirtyBadge)]}>
                      <Text style={themed($badgeText)}>변경됨</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            <View style={themed($priorityBox)}>
              <Text style={themed($priorityLabel)}>우선순위</Text>
              <Text style={themed($priorityValue)}>{index + 1}</Text>
            </View>
          </View>

          {/* 설정 버튼 행 */}
          <View style={themed($settingsRow)}>
            <TouchableOpacity
              style={themed($settingButton)}
              onPress={() => openMonthPicker(item.teamId)}
              activeOpacity={0.85}
            >
              <Ionicons
                name="heart-outline"
                size={16}
                color={theme.colors.tint}
              />
              <Text style={themed($settingText)}>
                {dateLabel}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={themed($settingButton)}
              onPress={() => {
                const supportedIds = Object.values(TEAM_IDS) as string[];
                // if (!supportedIds.includes(item.teamId)) {
                //   showToast({
                //     type: "warning",
                //     title: "지원 예정",
                //     message:
                //       "해당 팀은 최애 선수 선택이 아직 지원되지 않습니다.",
                //     duration: 2200,
                //   });
                //   return;
                // }
                openPlayerSelector(item.teamId, item.team.name);  
              }}
              activeOpacity={0.85}
            >
              <Ionicons
                name="baseball-outline"
                size={16}
                color={theme.colors.tint}
              />
              <Text style={themed($settingText)} numberOfLines={1}>
                {playerLabel}
              </Text>
            </TouchableOpacity>

            {/* <TouchableOpacity
              style={themed($settingButton)}
              onPress={() => openPhotoCardSelector(item.teamId)}
              activeOpacity={0.85}
            >
              <Ionicons
                name="images-outline"
                size={16}
                color={theme.colors.tint}
              />
              <Text style={themed($settingText)} numberOfLines={1}>
                {photoLabel}
              </Text>
            </TouchableOpacity> */}
          </View>
        </View>
      );
    },
    [theme.colors.tint, theme.colors.textDim, themed],
  );

  // --- 로딩 / 오류 처리 ---
  if (myTeamsLoading && teams.length === 0) {
    return (
      <SafeAreaView style={themed($container)}>
        <View style={themed($centerFill)}>
          <ActivityIndicator size="large" color={theme.colors.tint} />
          <Text style={themed($loadingText)}>내 팀 정보를 불러오는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (myTeamsError) {
    return (
      <SafeAreaView style={themed($container)}>
        <View style={themed($centerFill)}>
          <Text style={themed($errorText)}>
            My Teams 정보를 불러오지 못했습니다.
          </Text>
          <TouchableOpacity
            style={themed($retryButton)}
            onPress={handleRefresh}
          >
            <Text style={themed($retryButtonText)}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  /** 선택 가능 잔여 수 */
  const remainingSlots = MAX_TEAMS - selectedTeams.length;

  return (
    <SafeAreaView style={themed($container)}>
      {/* 헤더 */}
      <View style={themed($header)}>
        <Text style={themed($headerTitle)}>My Teams 상세설정</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!isDirty || updatingPriority || updatingDetails}
          style={[
            themed($saveButton),
            (!isDirty || updatingPriority || updatingDetails) && { opacity: 0.45 },
          ]}
        >
          <Ionicons
            name="save-outline"
            size={18}
            color="#fff"
            style={{ marginRight: 4 }}
          />
          <Text style={themed($saveButtonText)}>
            {updatingPriority || updatingDetails ? "저장 중..." : "변경사항 저장"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={themed($mainScroll)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={themed($mainContent)}
      >
        {/* 팀 순번 영역 */}
        <View style={themed($sectionBlock)}>
          <Text style={themed($sectionTitle)}>팀 순번</Text>
          {selectedTeams.length === 0 && (
            <Text style={themed($emptyHelperText)}>
              선택된 팀이 없습니다. 아래에서 팀을 선택해 주세요.
            </Text>
          )}
          <PriorityTeamList
            teams={selectedTeams}
            size={40}
            startIndex={0}
            onRemove={handleUnselectTeam}
          />
        </View>

        {/* 팀 선택 영역 */}
        <View style={themed($sectionBlock)}>
          <Text style={themed($sectionTitle)}>팀 선택</Text>
          <Text style={themed($selectionHelperText)}>
            {selectedTeams.length}개의 팀이 선택되었습니다.{" "}
            {/* {remainingSlots > 0
              ? `${remainingSlots}개의 팀을 더 선택할 수 있습니다.`
              : "최대 팀 수를 모두 선택했습니다."} */}
            {"\n"}이미 선택된 팀을 다시 선택하면 우선순위가 맨 뒤로 이동합니다.
          </Text>

          <View style={themed($chipsWrap)}>
            {/* 선택된 팀도 칩으로 노출 (비활성화) / 요구사항: 이미 선택된 것 비활성 */}
            {teams.map((t) => {
              const isSelected = t._selected;
              return (
                <TouchableOpacity
                  key={t.teamId}
                  style={[themed($teamChip), isSelected && { opacity: 0.35 }]}
                  onPress={() => {
                    if (isSelected) {
                      // 재선택 → 맨 뒤 이동
                      handleSelectTeam(t.teamId);
                    } else {
                      handleSelectTeam(t.teamId);
                    }
                  }}
                  disabled={!t._selected && selectedTeams.length >= MAX_TEAMS}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      themed($teamChipText),
                      isSelected && { fontWeight: "700" },
                    ]}
                  >
                    {t.team.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 팀 상세 카드 (선택된 팀만) */}
        <View style={themed($cardsWrapper)}>
          {selectedTeams.map((t, idx) => renderTeamCard(t, idx))}
          {selectedTeams.length === 0 && (
            <View style={themed($emptyBox)}>
              <Text style={themed($emptyText)}>
                선택된 My Team 이 없습니다.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* 좋아한 날짜 Month Picker */}
      <FavoriteMonthPicker
        visible={monthPickerVisible}
        onClose={() => {
          setMonthPickerVisible(false);
          setActiveTeamId(null);
        }}
        onSelect={handleSelectFavoriteDate}
        selectedDate={
          activeTeamId
            ? teams.find((t) => t.teamId === activeTeamId)?._tempFavoriteDate ||
              undefined
            : undefined
        }
        teamName={
          activeTeamId
            ? teams.find((t) => t.teamId === activeTeamId)?.team.name
            : undefined
        }
        teamColor={
          activeTeamId
            ? teams.find((t) => t.teamId === activeTeamId)?.team.color ||
              theme.colors.tint
            : theme.colors.tint
        }
      />

      {/* 최애 선수 선택 (지원 팀만) */}
      <FavoritePlayerSelector
        visible={playerSelectorVisible}
        onClose={() => {
          setPlayerSelectorVisible(false);
          setActiveTeamId(null);
          setActiveTeamName(null);
        }}
        teamId={activeTeamName ? deriveTeamSlug(activeTeamName) || TEAM_IDS.DOOSAN : TEAM_IDS.DOOSAN}
        onSelect={(p) => handleSelectPlayer(p)}
        initialSelectedPlayerId={undefined} // 현재 선택된 선수 하이라이트는 나중에 구현
        title={activeTeamName ? `${activeTeamName} 최애 선수 선택` : "최애 선수 선택"}
      />

      {/* 포토카드 선택 (Mock) */}
      <PhotoCardSelector
        visible={photoCardSelectorVisible}
        onClose={() => {
          setPhotoCardSelectorVisible(false);
          setActiveTeamId(null);
        }}
        onSelectCard={(cardId) => handleSelectPhotoCard(cardId)}
      />

      {/* 하단 고정 저장 바 */}
      {isDirty && !updatingPriority && !updatingDetails && (
        <View style={themed($bottomBar)}>
          <TouchableOpacity
            style={themed($bottomSaveButton)}
            onPress={handleSave}
            activeOpacity={0.85}
          >
            <Ionicons name="save" size={18} color="#fff" />
            <Text style={themed($bottomSaveText)}>변경사항 저장</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 글로벌 저장 진행 오버레이 */}
      {(updatingPriority || updatingDetails) && (
        <View style={themed($overlay)}>
          <ActivityIndicator size="large" color={theme.colors.tint} />
          <Text style={themed($overlayText)}>저장 중...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

/* ================================
   스타일 (ThemedStyle)
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
  zIndex: 10,
});

const $headerTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
  fontWeight: "700",
  color: colors.text,
});

const $saveButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: colors.tint,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderRadius: 10,
});

const $saveButtonText: ThemedStyle<TextStyle> = () => ({
  color: "#fff",
  fontWeight: "700",
  fontSize: 14,
});

const $mainScroll: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $mainContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingBottom: spacing.xxl * 2.5,
});

const $sectionBlock: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingTop: spacing.lg,
});

const $sectionTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 15,
  fontWeight: "700",
  color: colors.text,
  marginBottom: 8,
});

const $emptyHelperText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
});


const $selectionHelperText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
  lineHeight: 18,
  marginBottom: 8,
  whiteSpace: "pre-wrap",
});

const $chipsWrap: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.sm,
  marginBottom: spacing.md,
});

const $teamChip: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.sm,
  borderRadius: 26,
  backgroundColor: colors.backgroundAlt,
  borderWidth: 1,
  borderColor: colors.border,
});

const $teamChipText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 13,
  fontWeight: "600",
  color: colors.text,
});

const $cardsWrapper: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingBottom: spacing.xxl,
  gap: spacing.md,
});

const $teamCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderWidth: 1.5,
  borderColor: colors.border,
  borderRadius: 16,
  padding: spacing.md,
  backgroundColor: colors.card,
  shadowColor: "#000",
  shadowOpacity: 0.06,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
  marginBottom: spacing.md,
});

const $teamHeaderRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  marginBottom: spacing.sm,
});

const $placeholderHandle: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingRight: spacing.sm,
  paddingVertical: spacing.xs,
  width: 30,
  alignItems: "center",
});

const $teamMeta: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  flex: 1,
  gap: spacing.md,
});

const $teamTitleWrap: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $teamName: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  fontWeight: "700",
  color: colors.text,
  marginBottom: 4,
});

const $badgesRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.xs,
});

const $badge: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 20,
});

const $badgeText: ThemedStyle<TextStyle> = () => ({
  fontSize: 10,
  fontWeight: "700",
  color: "#fff",
});

const $primaryBadge: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tint,
});

const $dirtyBadge: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.warning || colors.tint,
});

const $priorityBox: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  alignItems: "center",
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 12,
  backgroundColor: colors.backgroundAlt,
  borderWidth: 1,
  borderColor: colors.border,
  minWidth: 64,
});

const $priorityLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 10,
  color: colors.textDim,
  fontWeight: "600",
});

const $priorityValue: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  fontWeight: "800",
  color: colors.text,
});

const $settingsRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.sm,
});

const $settingButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs + 2,
  borderRadius: 14,
  backgroundColor: colors.backgroundAlt,
  borderWidth: 1,
  borderColor: colors.border,
  gap: spacing.xs,
  maxWidth: "35%",
  flexGrow: 1,
});

const $settingText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 11,
  fontWeight: "600",
  color: colors.text,
  flexShrink: 1,
});

const $emptyBox: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingVertical: spacing.xl,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 14,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: colors.card,
  marginTop: spacing.lg,
});

const $emptyText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
});

const $centerFill: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  padding: spacing.lg,
});

const $loadingText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  marginTop: spacing.md,
  color: colors.textDim,
  fontSize: 15,
});

const $errorText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
  fontSize: 14,
  fontWeight: "600",
  marginBottom: 8,
});

const $retryButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.tint,
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.sm,
  borderRadius: 10,
});

const $retryButtonText: ThemedStyle<TextStyle> = () => ({
  color: "#fff",
  fontWeight: "700",
});

const $bottomBar: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,
  padding: spacing.md,
  backgroundColor: colors.card + "F0",
  borderTopWidth: 1,
  borderTopColor: colors.border,
});

const $bottomSaveButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: spacing.sm,
  backgroundColor: colors.tint,
  paddingVertical: spacing.sm + 2,
  borderRadius: 14,
});

const $bottomSaveText: ThemedStyle<TextStyle> = () => ({
  color: "#fff",
  fontWeight: "700",
  fontSize: 15,
});

const $overlay: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: colors.background + "D0",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
});

const $overlayText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  marginTop: spacing.md,
  color: colors.text,
  fontWeight: "600",
  fontSize: 16,
});

// (끝) 파일 마지막 - 커밋 메시지 제거됨
