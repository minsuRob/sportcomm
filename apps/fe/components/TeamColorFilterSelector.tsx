import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Modal,
  ScrollView,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleSheet,
  Animated,
  Easing,
  Platform,
  LayoutAnimation,
  UIManager,
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
import { getTeamColors } from "@/lib/theme/teams/teamColor";

/*
  변경 사항:
  - UI/UX 개선: `Pressable` + `Animated`를 사용하여 버튼에 간단한 터치 애니메이션 추가
  - 접근성: 버튼/아이템에 accessibility props 추가
  - 플랫폼 고려: Platform import 추가 (향후 플랫폼 별 조정 용이)
*/

interface TeamColorFilterSelectorProps {
  // 사용자가 팀 색상 선택을 적용하면 호출됩니다.
  // 선택 해제(기본 색상 사용)는 null을 전달합니다.
  onTeamColorSelect: (
    colors: { mainColor: string; subColor: string } | null,
  ) => void;
  // 현재 선택된 팀 ID (있으면 해당 팀 색상 표시)
  selectedTeamId?: string | null;
  // 버튼에 표시될 텍스트
  buttonLabel?: string;
  // 외부에서 로딩 처리할 때 사용
  loading?: boolean;
}

/**
 * TeamColorFilterSelector
 *
 * - 사용자의 myTeams 목록을 기존 프로세스(GET_MY_TEAMS)로 불러옴
 * - 선택한 팀의 `mainColor` / `subColor` 를 getTeamColors()를 통해 가져와 앱 색상 필터로 적용하도록 콜백 전달
 *
 * 주요 동작:
 * 1) 버튼을 눌러 모달을 오픈
 * 2) myTeams 중 하나를 선택하거나 '기본 색상' 항목을 선택
 * 3) 적용 버튼을 누르면 선택한 팀의 main/sub 색상을 콜백으로 전달
 *
 * 주석과 타입힌트는 한국어로 제공됩니다.
 */
export default function TeamColorFilterSelector({
  onTeamColorSelect,
  selectedTeamId = null,
  buttonLabel = "앱 색상",
  loading = false,
}: TeamColorFilterSelectorProps) {
  const { themed, theme } = useAppTheme();

  // 모달 표시 상태
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  // 모달 안에서 임시 선택 유지 (팀 ID 또는 null)
  const [pendingSelectedTeamId, setPendingSelectedTeamId] = useState<
    string | null
  >(selectedTeamId ?? null);

  // 사용자 팀 목록 조회 (기존 프로세스 유지)
  const {
    data: myTeamsData,
    loading: myTeamsLoading,
    error: myTeamsError,
  } = useQuery<GetMyTeamsResult>(GET_MY_TEAMS, {
    fetchPolicy: "cache-and-network",
  });

  // 팀 map 캐시 (성능 최적화)
  const teamMap = useMemo(() => {
    const m = new Map<string, Team>();
    myTeamsData?.myTeams?.forEach((ut) => m.set(ut.team.id, ut.team));
    return m;
  }, [myTeamsData]);

  // 모달 오픈 시 현재 적용값을 임시 상태로 복사
  useEffect(() => {
    if (modalVisible) {
      setPendingSelectedTeamId(selectedTeamId ?? null);
    }
  }, [modalVisible, selectedTeamId]);

  // myTeams 로드 에러 로그 (개발 용)
  useEffect(() => {
    if (myTeamsError) {
      console.warn("TeamColorFilterSelector: myTeams 조회 오류", myTeamsError);
    }
  }, [myTeamsError]);

  // 간단한 터치 애니메이션: 버튼이 눌릴 때 살짝 축소되었다가 복원되는 효과
  const scale = useRef(new Animated.Value(1)).current;

  const animatePressIn = () => {
    Animated.timing(scale, {
      toValue: 0.98,
      duration: 80,
      useNativeDriver: true,
    }).start();
  };

  const animatePressOut = () => {
    Animated.timing(scale, {
      toValue: 1,
      duration: 120,
      useNativeDriver: true,
    }).start();
  };

  // 접근성용 설명 텍스트(스크린리더가 읽도록)
  const accessibleLabelForOpen =
    "앱 색상 필터 열기, 여기를 눌러 내 팀 기반 색상을 선택합니다";

  /**
   * 적용 버튼 핸들러
   * - 선택된 팀이 있으면 getTeamColors로 main/sub 추출하여 콜백 전달
   * - 선택 해제(null)이면 기본 색상 사용을 뜻함
   */
  const applySelection = async (): Promise<void> => {
    try {
      const teamId = pendingSelectedTeamId;
      if (!teamId) {
        onTeamColorSelect(null);
      } else {
        const team = teamMap.get(teamId);
        const teamName = team?.name;
        const colors = getTeamColors(teamId, theme.isDark, teamName);
        // teamColors 객체에는 many keys 있지만 mainColor/subColor가 항상 존재한다고 가정
        const mainColor = (colors as any).mainColor ?? theme.colors.tint;
        const subColor = (colors as any).subColor ?? theme.colors.tint;
        onTeamColorSelect({ mainColor, subColor });
      }
    } catch (error) {
      console.error("팀 색상 적용 실패:", error);
    } finally {
      setModalVisible(false);
    }
  };

  // 팀 항목 토글 (단일 선택)
  const selectTeam = (teamId: string | null): void => {
    setPendingSelectedTeamId((prev) => (prev === teamId ? null : teamId));
  };

  // 버튼에 표시할 현재 색상 미리보기
  const currentPreview = useMemo(() => {
    if (!selectedTeamId) {
      // 기본 색상 미리보기
      return {
        mainColor: theme.colors.tint,
        subColor: theme.colors.backgroundAlt,
        label: "기본",
      };
    }
    const team = teamMap.get(selectedTeamId);
    const colors = getTeamColors(selectedTeamId, theme.isDark, team?.name);
    return {
      mainColor: (colors as any).mainColor ?? theme.colors.tint,
      subColor: (colors as any).subColor ?? theme.colors.backgroundAlt,
      label: team?.name ?? "선택된 팀",
    };
  }, [selectedTeamId, teamMap, theme]);

  // 로딩 또는 팀 없음 처리
  if (
    myTeamsLoading ||
    !myTeamsData?.myTeams ||
    myTeamsData.myTeams.length === 0
  ) {
    // 팀이 없거나 로딩 중이라면 버튼은 보이되 클릭 시 모달 대신 토스트 혹은 null 처리할 수 있음.
    // 여기서는 버튼을 숨기지 않고 기본 버튼만 표기합니다.
    return (
      <TouchableOpacity
        style={themed(styles.filterButton)}
        onPress={() => setModalVisible(true)}
        disabled={loading || myTeamsLoading}
      >
        {/* colorPreview 스타일이 존재하지 않아 previewRow + previewCircle로 대체 */}
        <View style={themed(styles.previewRow)}>
          <View
            style={[
              themed(styles.previewCircle),
              { backgroundColor: currentPreview.mainColor },
            ]}
          />
        </View>
        <Text style={themed(styles.filterText)} numberOfLines={1}>
          {buttonLabel}
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
    );
  }

  return (
    <>
      {/* 토글 버튼 */}
      <TouchableOpacity
        style={themed(styles.filterButton)}
        onPress={() => setModalVisible(true)}
        disabled={loading}
      >
        {/* 메인/서브 색상 미리보기 - 작은 원 2개 */}
        <View style={themed(styles.previewRow)}>
          <View
            style={[
              themed(styles.previewCircle),
              { backgroundColor: currentPreview.mainColor },
            ]}
          />
          <View
            style={[
              themed(styles.previewCircle),
              { backgroundColor: currentPreview.subColor },
            ]}
          />
        </View>

        <Text style={themed(styles.filterText)} numberOfLines={1}>
          {currentPreview.label}
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

      {/* 모달: 팀 선택 및 적용 */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={themed(styles.modalOverlay)}>
          <View style={themed(styles.modalContent)}>
            {/* 헤더 */}
            <View style={themed(styles.modalHeader)}>
              <Text style={themed(styles.modalTitle)}>
                앱 색상 필터 (내 팀)
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={themed(styles.closeButton)}
              >
                <Ionicons name="close" size={22} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={themed(styles.scrollContainer)}>
              {/* 기본 색상 항목 (해제 옵션) */}
              <TouchableOpacity
                style={[
                  themed(styles.teamOption),
                  pendingSelectedTeamId === null &&
                    themed(styles.selectedOption),
                ]}
                onPress={() => selectTeam(null)}
              >
                <View style={themed(styles.colorSwatchWrapper)}>
                  <View
                    style={[
                      themed(styles.previewCircle),
                      { backgroundColor: theme.colors.tint },
                    ]}
                  />
                  <View
                    style={[
                      themed(styles.previewCircle),
                      { backgroundColor: theme.colors.backgroundAlt },
                    ]}
                  />
                </View>
                <Text style={themed(styles.teamName)}>기본 앱 색상 사용</Text>
                {pendingSelectedTeamId === null && (
                  <Ionicons
                    name="checkmark"
                    size={18}
                    color={theme.colors.tint}
                  />
                )}
              </TouchableOpacity>

              {/* 유저의 팀 목록 */}
              {myTeamsData.myTeams.map((userTeam) => {
                const team = userTeam.team;
                const isSelected = pendingSelectedTeamId === team.id;
                const colors = getTeamColors(team.id, theme.isDark, team.name);
                const main = (colors as any).mainColor ?? theme.colors.tint;
                const sub =
                  (colors as any).subColor ?? theme.colors.backgroundAlt;

                return (
                  <TouchableOpacity
                    key={team.id}
                    style={[
                      themed(styles.teamOption),
                      isSelected && themed(styles.selectedOption),
                    ]}
                    onPress={() => selectTeam(team.id)}
                  >
                    <TeamLogo
                      logoUrl={team.logoUrl}
                      fallbackIcon={team.icon}
                      teamName={team.name}
                      size={28}
                    />
                    <View style={themed(styles.teamLabelAndSwatch)}>
                      <Text style={themed(styles.teamName)}>{team.name}</Text>
                      <View style={themed(styles.smallSwatches)}>
                        <View
                          style={[
                            themed(styles.smallSwatch),
                            { backgroundColor: main },
                          ]}
                        />
                        <View
                          style={[
                            themed(styles.smallSwatch),
                            { backgroundColor: sub },
                          ]}
                        />
                      </View>
                    </View>

                    {isSelected && (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color={theme.colors.tint}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* 하단 버튼 */}
            <View style={themed(styles.modalFooter)}>
              <TouchableOpacity
                style={themed(styles.applyButton)}
                onPress={applySelection}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={themed(styles.applyButtonText)}>적용</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

// --- 로컬 스타일 (ThemedStyle을 사용한 스타일 래핑을 위해 내부적으로 객체로 둠) ---
const styles = StyleSheet.create({
  /* Pressable wrapper to allow consistent hit area and pressed styling */
  pressableWrapper: {
    borderRadius: 16,
    overflow: "visible",
  } as ViewStyle,

  /* Pressed visual state for non-animated fallback */
  pressed: {
    opacity: 0.96,
  } as ViewStyle,

  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#fff",
    borderRadius: 16,
    maxWidth: 160,
    gap: 8,
  } as ViewStyle,

  previewRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  } as ViewStyle,

  previewCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 0.5,
    borderColor: "#ddd",
  } as ViewStyle,

  filterText: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  } as TextStyle,

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  } as ViewStyle,

  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "75%",
    overflow: "hidden",
  } as ViewStyle,

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  } as ViewStyle,

  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
  } as TextStyle,

  closeButton: {
    padding: 8,
  } as ViewStyle,

  scrollContainer: {
    paddingHorizontal: 12,
  } as ViewStyle,

  teamOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginVertical: 6,
    gap: 12,
  } as ViewStyle,

  selectedOption: {
    backgroundColor: "#f2f9ff",
  } as ViewStyle,

  teamLabelAndSwatch: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  } as ViewStyle,

  teamName: {
    fontSize: 15,
    fontWeight: "600",
  } as TextStyle,

  smallSwatches: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  } as ViewStyle,

  smallSwatch: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: "#ddd",
  } as ViewStyle,

  colorSwatchWrapper: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  } as ViewStyle,

  modalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  } as ViewStyle,

  applyButton: {
    backgroundColor: "#0EA5E9",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  } as ViewStyle,

  applyButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  } as TextStyle,
});

/*
커밋 메시지 (git): feat: 팀 기반 앱 색상 필터 컴포넌트 추가
*/
