import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import {
  getPlayersByTeam,
  type PlayerRecord,
  type TeamId,
} from "@/lib/team-data/players";

/**
 * 최애 선수 선택 모달
 * - 팀별 선수 목록을 그리드로 표시
 * - 검색(부분 문자열) 기능 제공
 * - 클릭 시 onSelect 콜백 즉시 호출 (확장: 확인 버튼 모드로 변경 가능)
 * - 추후 DB 연동을 고려하여 최소 의존 데이터 구조 유지
 */
export interface FavoritePlayerSelectorProps {
  visible: boolean;
  onClose: () => void;
  teamId: TeamId;
  onSelect: (player: PlayerRecord) => void;
  initialSelectedPlayerId?: string;
  title?: string; // 커스텀 타이틀 (없으면 기본)
}

const GRID_COLUMNS = 3; // 한 줄에 표시할 컬럼 수 (3명씩 표시)

export default function FavoritePlayerSelector({
  visible,
  onClose,
  teamId,
  onSelect,
  initialSelectedPlayerId,
  title,
}: FavoritePlayerSelectorProps) {
  const { themed, theme } = useAppTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | undefined>(
    initialSelectedPlayerId,
  );

  // visible 변경 시 검색/선택 초기화 여부 (현재는 유지 - 필요시 리셋)
  useEffect(() => {
    if (visible && initialSelectedPlayerId) {
      setSelectedId(initialSelectedPlayerId);
    }
  }, [visible, initialSelectedPlayerId]);

  // 팀별 선수 목록 (정렬: 등번호 ASC)
  const players = useMemo(
    () => {

      // teamId 유효성 검증
      if (!teamId) {
        console.warn("teamId가 유효하지 않습니다:", teamId);
        return [];
      }

      const teamPlayers = getPlayersByTeam(teamId);

      if (teamPlayers.length === 0) {
        console.warn(`팀 "${teamId}"의 선수 데이터를 찾을 수 없습니다.`);
      }

      return teamPlayers
        .slice()
        .sort((a, b) => a.number - b.number);
    },
    [teamId],
  );

  // 검색 필터링 (이름 포함 / 번호 일치)
  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) return players;
    const q = searchQuery.trim();
    const num = Number(q);
    return players.filter(
      (p) =>
        p.name.includes(q) ||
        (!Number.isNaN(num) && p.number === num) ||
        String(p.number).includes(q),
    );
  }, [players, searchQuery]);

  const handleSelect = (player: PlayerRecord) => {
    setSelectedId(player.id);
    onSelect(player);
    onClose(); // 즉시 닫기 (확장: confirm 모드 지원)
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={themed($overlay)}>
        <View style={themed($container)}>
          {/* 헤더 */}
          <View style={themed($headerRow)}>
            <Text style={themed($titleText)}>
              {title || "최애 선수 선택"}
            </Text>
            <TouchableOpacity
              style={themed($iconButton)}
              onPress={onClose}
              accessibilityLabel="close"
            >
              <Ionicons name="close" size={22} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* 검색 입력 */}
          <View style={themed($searchWrapper)}>
            <Ionicons
              name="search"
              size={18}
              color={theme.colors.textDim}
              style={themed($searchIcon)}
            />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="이름 또는 등번호 검색"
              placeholderTextColor={theme.colors.textDim}
              style={themed($searchInput)}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                style={themed($clearBtn)}
              >
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={theme.colors.textDim}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* 선수 그리드 */}
          <ScrollView
            style={themed($list)}
            contentContainerStyle={themed($listContent)}
          >
            {filteredPlayers.length === 0 ? (
              <View style={themed($emptyBox)}>
                <Text style={themed($emptyText)}>선수 없음</Text>
              </View>
            ) : (
              <View style={themed($grid)}>
                {filteredPlayers.map((player) => {
                  const selected = player.id === selectedId;
                  return (
                    <TouchableOpacity
                      key={player.id}
                      style={[
                        themed($cell),
                        selected && [
                          themed($cellSelected),
                          { borderColor: theme.colors.tint },
                        ],
                      ]}
                      activeOpacity={0.85}
                      onPress={() => handleSelect(player)}
                    >
                      <Text
                        style={[
                          themed($playerNumber),
                          selected && { color: theme.colors.tint },
                        ]}
                      >
                        {player.number}
                      </Text>
                      <Text
                        style={[
                          themed($playerName),
                          selected && { color: theme.colors.tint },
                        ]}
                        numberOfLines={1}
                      >
                        {player.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// --- 스타일 정의 ---
const $overlay: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.55)",
  justifyContent: "center",
  alignItems: "center",
});

const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  width: "95%",
  maxWidth: 480,
  maxHeight: "85%",
  backgroundColor: colors.background,
  borderRadius: 18,
  padding: spacing.sm,
  shadowColor: "#000",
  shadowOpacity: 0.25,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 8,
});

const $headerRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: spacing.md,
});

const $titleText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
  fontWeight: "700",
  color: colors.text,
});

const $iconButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.xs,
  borderRadius: 8,
});

const $searchWrapper: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: colors.card,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 12,
  paddingHorizontal: spacing.sm,
  marginBottom: spacing.md,
});

// Ionicons 는 Text 기반 컴포넌트이므로 TextStyle 사용
const $searchIcon: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginRight: spacing.xs,
});

const $searchInput: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  flex: 1,
  paddingVertical: spacing.sm,
  color: colors.text,
  fontSize: 14,
});

const $clearBtn: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.xs,
});

const $list: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $listContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingBottom: spacing.lg,
});

const $emptyBox: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingVertical: spacing.xl,
  alignItems: "center",
  justifyContent: "center",
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 12,
  backgroundColor: colors.card,
});

const $emptyText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  fontSize: 14,
});

const $grid: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "space-around",
  paddingHorizontal: spacing.sm,
});

const $cell: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  // 3열 그리드를 위해 flex 사용 (가장 안정적인 방법)
  flex: 1,
  maxWidth: `${100 / GRID_COLUMNS}%`,
  minWidth: 90,
  margin: spacing.xs,
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.sm,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 14,
  backgroundColor: colors.card,
  alignItems: "center",
  justifyContent: "center",
});

const $cellSelected: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tint + "10",
  borderWidth: 2,
});

const $playerNumber: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 20,
  fontWeight: "800",
  color: colors.text,
  marginBottom: 4,
});

const $playerName: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  fontWeight: "600",
  color: colors.text,
});

// commit: fix(team): 최애선수 선택 모달 스타일 타입 및 width 계산 수정
