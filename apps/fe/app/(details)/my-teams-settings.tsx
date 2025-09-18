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
// @ts-ignore: ambient declaration 임시 사용 (패키지 설치 전 진단 억제)
import DraggableFlatList, {
  RenderItemParams,
} from "react-native-draggable-flatlist";
import { useQuery, useMutation } from "@apollo/client";
import {
  GET_MY_TEAMS,
  UPDATE_MY_TEAMS,
  type GetMyTeamsResult,
  type UpdateMyTeamsResult,
  type UserTeam,
} from "@/lib/graphql/teams";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { useAuth } from "@/lib/auth/context/AuthContext";
import FavoriteMonthPicker from "@/components/team/FavoriteMonthPicker";
import FavoritePlayerSelector from "@/components/team/FavoritePlayerSelector";
import PhotoCardSelector from "@/components/team/PhotoCardSelector";
import { TEAM_IDS } from "@/lib/team-data/players";
import TeamLogo from "@/components/TeamLogo";
import { showToast } from "@/components/CustomToast";

/**
 * My Teams 상세 설정 페이지
 *
 * 요구사항:
 * - 기존 TeamSettingsPopover 에 있던 항목(좋아한 날짜 / 최애 선수 / 포토카드)을
 *   팝오버 형태가 아닌, 각 팀별로 인라인 나열
 * - 사용자 팀(UserTeam) 우선순위(priority)를 웹/안드로이드/iOS 모두에서
 *   드래그 & 드롭으로 재정렬 가능
 * - 재정렬 / 설정 변경 후 저장 시 UPDATE_MY_TEAMS 뮤테이션 활용
 *
 * 구현 전략:
 * 1) GET_MY_TEAMS 로 UserTeam 목록을 불러온 뒤 priority 오름차순 정렬하여 상태 관리
 * 2) DraggableFlatList 로 팀 블록을 드래그 재정렬
 * 3) 각 팀 블록:
 *    - 팀 헤더 (드래그 핸들, 로고, 팀명, 주 팀 배지, 변경 여부 배지)
 *    - 설정 행(좋아한 날짜, 최애 선수, 포토카드)
 * 4) 좋아한 날짜 선택 → FavoriteMonthPicker
 * 5) 최애 선수 선택 → FavoritePlayerSelector (현재 지원 팀만, 미지원이면 안내)
 * 6) 포토카드 선택 → PhotoCardSelector (현재 Mock)
 * 7) 저장 버튼: dirty 상태일 때만 활성화
 * 8) 저장 성공 후 refetch + 전역 사용자 정보 동기화 (선택)
 *
 * 주의:
 * - notificationEnabled 은 현재 UpdateMyTeamInput 에 없으므로 제외
 * - favoritePlayerName / favoritePlayerNumber / favoriteDate 만 유지
 * - priority 는 updateMyTeams 호출 시 배열 순서 기반으로 서버에서 재설정
 */

/** 로컬 편집용 타입 (GraphQL UserTeam 확장) */
interface EditableUserTeam extends UserTeam {
  _dirty?: boolean; // 해당 팀에 변경 사항이 있는지 여부 (UI 배지 표시)
  _tempFavoriteDate?: string | null; // 로컬 수정 중인 날짜
  _tempFavoritePlayerName?: string | null;
  _tempFavoritePlayerNumber?: number | null;
  _tempPhotoCardId?: string | null; // 포토카드 ID (현재 서버 미반영, UX 확장 포인트)
}

export default function MyTeamsSettingsScreen(): React.ReactElement {
  const { themed, theme } = useAppTheme();
  const { user: currentUser, accessToken, updateUser } = useAuth();

  // --- GraphQL: 내 팀 목록 조회 ---
  const {
    data: myTeamsData,
    loading: myTeamsLoading,
    error: myTeamsError,
    refetch: refetchMyTeams,
  } = useQuery<GetMyTeamsResult>(GET_MY_TEAMS, {
    fetchPolicy: "network-only",
  });

  // --- GraphQL: 업데이트 뮤테이션 ---
  const [updateMyTeams, { loading: updating }] =
    useMutation<UpdateMyTeamsResult>(UPDATE_MY_TEAMS);

  // --- 로컬 상태 (편집 전용) ---
  const [teams, setTeams] = useState<EditableUserTeam[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // 모달 상태
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const [playerSelectorVisible, setPlayerSelectorVisible] = useState(false);
  const [photoCardSelectorVisible, setPhotoCardSelectorVisible] =
    useState(false);

  // 현재 설정 중인 팀 ID
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);

  // --- 초기 데이터 동기화 ---
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
      }));
      setTeams(mapped);
    }
  }, [myTeamsData]);

  // --- 전체 Dirty 여부 ---
  const isDirty = useMemo(
    () => teams.some((t, idx) => t._dirty || t.priority !== idx),
    [teams],
  );

  // --- 새 데이터 새로고침 ---
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetchMyTeams({ fetchPolicy: "network-only" });
    } finally {
      setRefreshing(false);
    }
  }, [refetchMyTeams]);

  // --- 좋아한 날짜 선택 트리거 ---
  const openMonthPicker = (teamId: string) => {
    setActiveTeamId(teamId);
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
                t.favoriteDate !== date ||
                (t.favoriteDate || null) !== date,
            }
          : t,
      ),
    );
    setActiveTeamId(null);
    setMonthPickerVisible(false);
  };

  // --- 최애 선수 선택 트리거 ---
  const openPlayerSelector = (teamId: string) => {
    setActiveTeamId(teamId);
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
                t.favoritePlayerName !== player.name ||
                t.favoritePlayerNumber !== player.number,
            }
          : t,
      ),
    );
    setActiveTeamId(null);
    setPlayerSelectorVisible(false);
  };

  // --- 포토카드 선택 트리거 (서버 반영 X) ---
  const openPhotoCardSelector = (teamId: string) => {
    setActiveTeamId(teamId);
    setPhotoCardSelectorVisible(true);
  };

  const handleSelectPhotoCard = (cardId: string) => {
    if (!activeTeamId) return;
    setTeams((prev) =>
      prev.map((t) =>
        t.teamId === activeTeamId
          ? {
              ...t,
              _tempPhotoCardId: cardId,
              _dirty: true, // 현재 서버 반영 없음 → 변경 배지
            }
          : t,
      ),
    );
    setActiveTeamId(null);
    setPhotoCardSelectorVisible(false);
  };

  // --- Drag & Drop 완료 ---
  const handleDragEnd = useCallback(
    ({ data }: { data: EditableUserTeam[] }) => {
      // 새 순서를 priority 오름차순으로 재할당 (로컬)
      const updated = data.map((t, idx) => ({
        ...t,
        priority: idx,
      }));
      setTeams(updated);
    },
    [],
  );

  // --- 저장 처리 ---
  const handleSave = useCallback(async () => {
    if (updating || !isDirty) return;

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
      const payload = teams.map((t) => ({
        teamId: t.teamId,
        favoriteDate: t._tempFavoriteDate || null,
        favoritePlayerName: t._tempFavoritePlayerName || null,
        favoritePlayerNumber:
          typeof t._tempFavoritePlayerNumber === "number"
            ? t._tempFavoritePlayerNumber
            : null,
      }));

      const { errors, data } = await updateMyTeams({
        variables: { teams: payload },
        context: {
          headers: {
            authorization: accessToken ? `Bearer ${accessToken}` : "",
          },
        },
      });

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      // 서버 반영 성공 → refetch
      const refetched = await refetchMyTeams({ fetchPolicy: "network-only" });
      const newMyTeams = refetched?.data?.myTeams || [];

      // 전역 사용자 정보에도 동기화 (선택)
      await updateUser({ myTeams: newMyTeams } as any);

      showToast({
        type: "success",
        title: "저장 완료",
        message: "My Teams 설정이 저장되었습니다.",
        duration: 2000,
      });
    } catch (e: any) {
      showToast({
        type: "error",
        title: "저장 실패",
        message: e?.message || "변경사항 저장 중 오류가 발생했습니다.",
        duration: 3000,
      });
    }
  }, [
    teams,
    updating,
    isDirty,
    updateMyTeams,
    refetchMyTeams,
    currentUser,
    accessToken,
    updateUser,
  ]);

  // --- 개별 팀 블록 렌더 ---
  const renderTeamItem = useCallback(
    ({
      item,
      drag,
      isActive,
      getIndex,
    }: RenderItemParams<EditableUserTeam>) => {
      const idx = getIndex?.() ?? item.priority;
      const isPrimary = idx === 0;
      const dirty = item._dirty || item.priority !== idx;

      const dateLabel = item._tempFavoriteDate
        ? new Date(item._tempFavoriteDate).toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "short",
          })
        : "날짜 선택";

      const playerLabel = item._tempFavoritePlayerName
        ? `${item._tempFavoritePlayerName} (#${item._tempFavoritePlayerNumber ?? "?"})`
        : "최애 선수";

      const photoLabel = item._tempPhotoCardId
        ? `포토카드 #${item._tempPhotoCardId}`
        : "포토카드";

      return (
        <View
          style={[
            themed($teamCard),
            isActive && { opacity: 0.85 },
            dirty && { borderColor: theme.colors.tint },
          ]}
        >
          {/* 헤더 행 */}
          <View style={themed($teamHeaderRow)}>
            {/* 드래그 핸들 */}
            <TouchableOpacity
              onPressIn={drag}
              style={themed($dragHandle)}
              accessibilityLabel="순서 변경 드래그 (탭하여 이동)"
              activeOpacity={0.7}
            >
              <Ionicons
                name="reorder-three"
                size={26}
                color={theme.colors.textDim}
              />
            </TouchableOpacity>

            {/* 로고 & 이름 */}
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
              <Text style={themed($priorityValue)}>{idx + 1}</Text>
            </View>
          </View>

          {/* 설정 버튼 행 */}
          <View style={themed($settingsRow)}>
            {/* 좋아한 날짜 */}
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
              <Text style={themed($settingText)} numberOfLines={1}>
                {dateLabel}
              </Text>
            </TouchableOpacity>

            {/* 최애 선수 */}
            <TouchableOpacity
              style={themed($settingButton)}
              onPress={() => {
                // FavoritePlayerSelector 가 현재 DOOSAN 만 지원이라면 제한 처리
                // 지원 목록 검사
                const supportedIds = Object.values(TEAM_IDS) as string[];
                if (!supportedIds.includes(item.teamId)) {
                  showToast({
                    type: "warning",
                    title: "지원 예정",
                    message:
                      "해당 팀은 최애 선수 선택이 아직 지원되지 않습니다.",
                    duration: 2200,
                  });
                  return;
                }
                openPlayerSelector(item.teamId);
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

            {/* 포토카드 */}
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
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [theme.colors.tint, theme.colors.textDim, themed],
  );

  // --- 메인 로딩 / 오류 상태 처리 ---
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

  return (
    <SafeAreaView style={themed($container)}>
      {/* 헤더 */}
      <View style={themed($header)}>
        <Text style={themed($headerTitle)}>My Teams 상세설정</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!isDirty || updating}
          style={[
            themed($saveButton),
            (!isDirty || updating) && { opacity: 0.45 },
          ]}
        >
          <Ionicons
            name="save-outline"
            size={18}
            color="#fff"
            style={{ marginRight: 4 }}
          />
          <Text style={themed($saveButtonText)}>
            {updating ? "저장 중..." : "변경사항 저장"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 안내/설명 */}
      <ScrollView
        style={themed($introWrapper)}
        contentContainerStyle={themed($introContent)}
        horizontal={false}
        showsHorizontalScrollIndicator={false}
      >
        <Text style={themed($introTitle)}>설정 방법</Text>
        <Text style={themed($introText)}>
          - 팀 카드를 탭 후 바로 드래그하여 순서를 변경하면 우선순위가
          재설정됩니다.
          {"\n"}- 첫 번째 팀이 주 팀으로 표시됩니다.
          {"\n"}- 좋아한 날짜 / 최애 선수 / 포토카드를 각 팀별로 설정하세요.
          {"\n"}- 작업 후 상단의 [변경사항 저장] 버튼을 눌러 반영합니다.
        </Text>
      </ScrollView>

      {/* 드래그 리스트 */}
      <View style={themed($listWrapper)}>
        <DraggableFlatList
          data={teams}
          keyExtractor={(item) => item.id}
          onDragEnd={handleDragEnd}
          renderItem={renderTeamItem}
          activationDistance={Platform.OS === "web" ? 12 : 0}
          containerStyle={themed($flatListContainer)}
          contentContainerStyle={themed($flatListContent)}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={themed($emptyBox)}>
              <Text style={themed($emptyText)}>
                선택된 My Team 이 없습니다.
              </Text>
            </View>
          }
        />
      </View>

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
        }}
        teamId={
          (activeTeamId as any) ||
          TEAM_IDS.DOOSAN /* 지원 외 팀 접근 시에도 안전 처리 */
        }
        onSelect={(p) => handleSelectPlayer(p)}
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

      {/* 하단 저장 고정 바 (선택적 UX) */}
      {isDirty && !updating && (
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

      {/* 글로벌 업데이트 로딩 오버레이 (선택) */}
      {updating && (
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

const $introWrapper: ThemedStyle<ViewStyle> = () => ({
  maxHeight: 140,
});

const $introContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingTop: spacing.md,
  paddingBottom: spacing.sm,
});

const $introTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  fontWeight: "700",
  color: colors.text,
  marginBottom: 4,
});

const $introText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  lineHeight: 18,
  color: colors.textDim,
  whiteSpace: "pre-wrap",
});

const $listWrapper: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  paddingHorizontal: spacing.md,
  paddingBottom: spacing.xl,
});

const $flatListContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $flatListContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingBottom: spacing.xxl * 2,
  gap: spacing.md,
});

const $teamCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderWidth: 1.5,
  borderColor: colors.border,
  borderRadius: 16,
  padding: spacing.md,
  backgroundColor: colors.card,
  marginBottom: spacing.md,
  shadowColor: "#000",
  shadowOpacity: 0.06,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
});

const $teamHeaderRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  marginBottom: spacing.sm,
});

const $dragHandle: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingRight: spacing.sm,
  paddingVertical: spacing.xs,
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
  maxWidth: "32%",
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
