import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Portal } from "@rn-primitives/portal";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import PhotoCardSelector from "./PhotoCardSelector";
import FavoritePlayerSelector from "./FavoritePlayerSelector";
import {
  TEAM_IDS,
  type PlayerRecord,
  type TeamId as PlayerTeamId,
} from "@/lib/team-data/players";

export interface TeamSettingsPopoverProps {
  visible: boolean;
  onClose: () => void;
  anchorStyle?: ViewStyle; // 팝오버 위치 조정
  onSelectFavoriteDate: () => void;
  teamId?: PlayerTeamId; // 선택된 팀 (없으면 기본 두산)
  onSelectFavoritePlayer?: (player: PlayerRecord) => void; // 최애 선수 선택 콜백
}

/**
 * 팀 설정 컨텍스트 팝오버
 * - 팀 관련 다양한 설정(좋아한 월, 최애 선수, 포토카드 등)로 진입하는 pivot
 * - 추후 항목 확장 시 items 배열만 추가/수정
 */
export default function TeamSettingsPopover({
  visible,
  onClose,
  anchorStyle,
  onSelectFavoriteDate,
  teamId = TEAM_IDS.DOOSAN, // 기본값: 두산 (차후 외부에서 주입)
  onSelectFavoritePlayer,
}: TeamSettingsPopoverProps) {
  const { themed, theme } = useAppTheme();

  // 포토카드 모달
  const [photoCardSelectorVisible, setPhotoCardSelectorVisible] =
    useState(false);

  // 최애 선수 모달
  const [favoritePlayerSelectorVisible, setFavoritePlayerSelectorVisible] =
    useState(false);

  // --- 핸들러: 포토카드 ---
  const handleOpenPhotoCard = () => {
    onClose(); // 먼저 팝오버 닫기
    setPhotoCardSelectorVisible(true);
  };

  const handleSelectCard = (cardId: string) => {
    console.log("Selected card:", cardId);
    setPhotoCardSelectorVisible(false);
  };

  // --- 핸들러: 최애 선수 ---
  const handleOpenFavoritePlayer = () => {
    onClose();
    setFavoritePlayerSelectorVisible(true);
  };

  const handleSelectFavoritePlayer = (player: PlayerRecord) => {
    console.log("Selected favorite player:", player);
    onSelectFavoritePlayer?.(player);
    setFavoritePlayerSelectorVisible(false);
  };

  // --- 메뉴 항목 정의 (확장 시 배열 요소만 추가) ---
  const items = useMemo(
    () => [
      {
        key: "favoriteDate",
        label: "좋아한 날짜",
        icon: (
          <Ionicons name="heart-outline" size={18} color={theme.colors.text} />
        ),
        onPress: () => {
          onClose();
          onSelectFavoriteDate();
        },
      },
      {
        key: "favoritePlayer",
        label: "최애선수",
        icon: (
          <Ionicons
            name="baseball-outline"
            size={18}
            color={theme.colors.text}
          />
        ),
        onPress: handleOpenFavoritePlayer,
      },
      {
        key: "photoCard",
        label: "포토카드",
        icon: (
          <Ionicons name="images-outline" size={18} color={theme.colors.text} />
        ),
        onPress: handleOpenPhotoCard,
      },
    ],
    [
      onClose,
      onSelectFavoriteDate,
      theme.colors.text,
      handleOpenPhotoCard,
      handleOpenFavoritePlayer,
    ],
  );

  if (!visible) return null;

  return (
    <>
      <Portal name="team-settings-popover">
        <View style={themed($overlay)}>
          {/* 바깥 영역 클릭 시 닫기 */}
          <TouchableOpacity
            style={themed($backdrop)}
            activeOpacity={1}
            onPress={onClose}
          />

          {/* 메뉴 카드 */}
            <View style={[themed($menuContainer), anchorStyle]}>
              {items.map((item, index) => (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    themed($menuItem),
                    index === 0 ? themed($menuItemFirst) : null,
                    index === items.length - 1 ? themed($menuItemLast) : null,
                  ]}
                  onPress={item.onPress}
                  activeOpacity={0.8}
                >
                  <View style={themed($itemLeft)}>{item.icon}</View>
                  <Text style={themed($itemText)}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
        </View>
      </Portal>

      {/* 포토카드 선택 모달 */}
      <PhotoCardSelector
        visible={photoCardSelectorVisible}
        onClose={() => setPhotoCardSelectorVisible(false)}
        onSelectCard={handleSelectCard}
      />

      {/* 최애 선수 선택 모달 */}
      <FavoritePlayerSelector
        visible={favoritePlayerSelectorVisible}
        onClose={() => setFavoritePlayerSelectorVisible(false)}
        teamId={teamId}
        onSelect={handleSelectFavoritePlayer}
      />
    </>
  );
}

// --- 스타일 ---
const $overlay: ThemedStyle<ViewStyle> = () => ({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 1000,
});

const $backdrop: ThemedStyle<ViewStyle> = () => ({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
});

const $menuContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: "absolute",
  backgroundColor: colors.card,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 12,
  minWidth: 220,
  shadowColor: "#000",
  shadowOpacity: 0.15,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 4 },
  elevation: 6,
  overflow: "hidden",
});

const $menuItem: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  backgroundColor: colors.card,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $menuItemFirst: ThemedStyle<ViewStyle> = () => ({
  borderTopLeftRadius: 12,
  borderTopRightRadius: 12,
});

const $menuItemLast: ThemedStyle<ViewStyle> = () => ({
  borderBottomWidth: 0,
  borderBottomLeftRadius: 12,
  borderBottomRightRadius: 12,
});

const $itemLeft: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginRight: spacing.sm,
});

const $itemText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.text,
});
