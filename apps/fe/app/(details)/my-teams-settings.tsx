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

/**
 * 변경 개요:
 * - 헤더 영역을 post-signup-profile.tsx 의 헤더 구조/스타일과 유사하게 단순 텍스트 버튼 스타일로 변경
 *   (우측 캡슐형 배경 버튼 → 텍스트 버튼, 타이틀 색상 tint 적용, padding 조정)
 * - 저장 버튼 상태 문구: "저장" / "저장 중..."
 * - 비활성화 시 색상 textDim 적용
 */

/** 로컬 편집용 타입 확장 */
interface EditableUserTeam extends UserTeam {
  _dirty?: boolean;
  _tempFavoriteDate?: string | null;
  _tempFavoritePlayerName?: string | null;
  _tempFavoritePlayerNumber?: number | null;
  _tempPhotoCardId?: string | null;
  _selected: boolean;
  _initialPriority?: number | null;
}

/** 최대 선택 가능 팀 수 */
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
        _selected: typeof t.priority === "number",
        _initialPriority: t.priority ?? null,
      }));
      setTeams(mapped);
      initialSelectedOrderRef.current = mapped
        .filter((t) => t._selected)
        .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999))
        .map((t) => t.teamId);
    }
  }, [myTeamsData]);

  /** 선택된 팀 (priority 오름차순) */
  const selectedTeams = useMemo(
    () =>
      teams
        .filter((t) => t._selected)
        .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999)),
    [teams],
  );

  /** 선택되지 않은 팀 */
  const unselectedTeams = useMemo(
    () => teams.filter((t) => !t._selected),
    [teams],
  );

  /** Dirty 판단 */
  const isDirty = useMemo(() => {
    const initialSet = new Set(initialSelectedOrderRef.current);
    const currentSelectedIds = selectedTeams.map((t) => t.teamId);

    const selectionChanged =
      currentSelectedIds.length !== initialSelectedOrderRef.current.length ||
      currentSelectedIds.some((id) => !initialSet.has(id)) ||
      initialSelectedOrderRef.current.some(
        (origId) => !currentSelectedIds.includes(origId),
      );

    const orderChanged =
      !selectionChanged &&
      initialSelectedOrderRef.current.some(
        (teamId, idx) => teamId !== currentSelectedIds[idx],
      );

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
              _dirty: t._dirty || t._tempFavoriteDate !== date,
            }
          : t,
      ),
    );
    setActiveTeamId(null);
    setMonthPickerVisible(false);
  };

  /** 최애 선수 선택 */
  const openPlayerSelector = (teamId: string, teamName: string) => {
    setActiveTeamId(teamId as TeamId);
    setActiveTeamName(teamName);
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

  /** 포토카드 선택 (Mock 로컬만) */
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

  /** 팀 선택 / 재선택 (재선택 시 맨 뒤 이동) */
  const handleSelectTeam = useCallback(
    (teamId: string) => {
      setTeams((prev) => {
        const selected = prev
          .filter((t) => t._selected)
          .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));

        const isAlreadySelected = selected.some((t) => t.teamId === teamId);
        let newSelectedOrder: EditableUserTeam[];

        if (isAlreadySelected) {
          newSelectedOrder = [
            ...selected.filter((t) => t.teamId !== teamId),
            selected.find((t) => t.teamId === teamId)!,
          ];
        } else {
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

        newSelectedOrder = newSelectedOrder.map((t, idx) => ({
          ...t,
            priority: idx,
          }));

        return prev
          .map((t) => {
            const replaced = newSelectedOrder.find(
              (n) => n.teamId === t.teamId,
            );
            if (replaced) return replaced;
            return !newSelectedOrder.some((s) => s.teamId === t.teamId)
              ? { ...t, _selected: false, priority: null }
              : t;
          })
          .map((t) =>
            newSelectedOrder.some((s) => s.teamId === t.teamId)
              ? { ...t, _selected: true }
              : t,
          );
      });
    },
    [setTeams],
  );

  /** 선택 해제 */
  const handleUnselectTeam = useCallback((teamId: string) => {
    setTeams((prev) => {
      const remaining = prev
        .filter((t) => t._selected && t.teamId !== teamId)
        .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999))
        .map((t, idx) => ({ ...t, priority: idx }));

      return prev.map((t) => {
        if (t.teamId === teamId) {
          return { ...t, _selected: false, priority: null };
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
      const orderedTeamIds = selectedTeams.map((t) => t.teamId);
      const { errors } = await updateMyTeamsPriority({
        variables: { teamIds: orderedTeamIds },
      });
      if (errors && errors.length > 0) throw new Error(errors[0].message);

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
      if (detailErrors && detailErrors.length > 0)
        throw new Error(detailErrors[0].message);

      const refetched = await refetchMyTeams({ fetchPolicy: "network-only" });
      const newMyTeams = refetched?.data?.myTeams || [];
      await updateUser({ myTeams: newMyTeams } as any);

      if (selectedTeams.length > 0) {
        const firstTeam = selectedTeams[0];
        try {
          const teamSlug = deriveTeamSlug(firstTeam.team.name);
            await setTeamColorOverride(firstTeam.teamId, teamSlug);
        } catch (colorError) {
          console.warn("팀 색상 설정 실패:", colorError);
        }
      }

      showToast({
        type: "success",
        title: "저장 완료",
        message: "팀 설정이 저장되었습니다.",
        duration: 1800,
      });

      initialSelectedOrderRef.current = orderedTeamIds;
      setTeams((prev) =>
        prev.map((t) => {
          const updated = newMyTeams.find((n) => n.teamId === t.teamId);
          if (updated) {
            return {
              ...t,
              priority: updated.priority,
              _tempFavoriteDate: updated.favoriteDate || null,
              _tempFavoritePlayerName: (updated as any).favoritePlayerName || null,
              _tempFavoritePlayerNumber:
                (updated as any).favoritePlayerNumber ?? null,
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

      // const photoLabel = item._tempPhotoCardId
      //   ? `포토카드 #${item._tempPhotoCardId}`
      //   : "포토카드";

      return (
        <View
          key={item.id}
          style={[
            themed($teamCard),
            dirty && { borderColor: theme.colors.tint },
          ]}
        >
          <View style={themed($teamHeaderRow)}>
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
              <Text style={themed($settingText)}>{dateLabel}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={themed($settingButton)}
              onPress={() =>
                openPlayerSelector(item.teamId, item.team.name)
              }
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

            {/* 향후 포토카드 기능 재활성화 시 사용
            <TouchableOpacity
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

  /** 선택 가능 잔여 수 (UI 에서는 현재 안내문 일부 비활성) */
  // const remainingSlots = MAX_TEAMS - selectedTeams.length;

  return (
    <SafeAreaView style={themed($container)}>
      {/* 헤더 (post-signup-profile 스타일 적용) */}
      <View style={themed($header)}>
        <Text style={themed($headerTitle)}>My Teams 상세설정</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!isDirty || updatingPriority || updatingDetails}
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text
            style={[
              themed($saveText),
              (!isDirty || updatingPriority || updatingDetails) &&
                themed($saveTextDisabled),
            ]}
          >
            {updatingPriority || updatingDetails ? "저장 중..." : "저장"}
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
            {selectedTeams.length}개의 팀이 선택되었습니다.{"\n"}
            이미 선택된 팀을 다시 선택하면 우선순위가 맨 뒤로 이동합니다.
          </Text>

          <View style={themed($chipsWrap)}>
            {teams.map((t) => {
              const isSelected = t._selected;
              return (
                <TouchableOpacity
                  key={t.teamId}
                  style={[themed($teamChip), isSelected && { opacity: 0.35 }]}
                  onPress={() => handleSelectTeam(t.teamId)}
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

        {/* 팀 상세 카드 */}
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

      {/* 최애 선수 선택 */}
      <FavoritePlayerSelector
        visible={playerSelectorVisible}
        onClose={() => {
          setPlayerSelectorVisible(false);
          setActiveTeamId(null);
          setActiveTeamName(null);
        }}
        teamId={
          activeTeamName
            ? deriveTeamSlug(activeTeamName) || TEAM_IDS.DOOSAN
            : TEAM_IDS.DOOSAN
        }
        onSelect={(p) => handleSelectPlayer(p)}
        initialSelectedPlayerId={undefined}
        title={
          activeTeamName
            ? `${activeTeamName} 최애 선수 선택`
            : "최애 선수 선택"
        }
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

      {/* 하단 고정 저장 바 (Dirty 시 표시) */}
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

      {/* 저장 진행 오버레이 */}
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

/** post-signup-profile 스타일 참고한 헤더 */
const $header: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.lg,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
  backgroundColor: colors.background,
});

const $headerTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
  fontWeight: "700",
  color: colors.tint,
});

const $saveText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.tint,
  fontWeight: "600",
});

const $saveTextDisabled: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
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

/**
 * 설명:
 * - 헤더를 post-signup-profile.tsx 스타일로 단순화 (타이틀 tint, 우측 텍스트 버튼)
 * - 기존 캡슐형 저장 버튼 제거 후 상태별 색상 처리
 * - 나머지 비즈니스 로직(팀 선택/우선순위/저장)은 기존 유지
 *
 * 유지보수 포인트:
 * - post-signup-profile 헤더 스타일이 추후 공통 컴포넌트화 된다면 해당 부분 추출 고려
 * - 저장 로직(setTeamColorOverride) 실패 시에도 성공 UX 유지
 */
