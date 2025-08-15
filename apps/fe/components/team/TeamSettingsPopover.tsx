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

export interface TeamSettingsPopoverProps {
  visible: boolean;
  onClose: () => void;
  anchorStyle?: ViewStyle; // 팝오버 위치 조정
  onSelectFavoriteDate: () => void;
}

/**
 * 팀 설정 컨텍스트 팝오버
 * - ProfileContextPopover와 동일한 시각 언어, 팀 설정 항목 전용
 */
export default function TeamSettingsPopover({
  visible,
  onClose,
  anchorStyle,
  onSelectFavoriteDate,
}: TeamSettingsPopoverProps) {
  const { themed, theme } = useAppTheme();
  const [photoCardSelectorVisible, setPhotoCardSelectorVisible] =
    useState(false);

  const handleOpenPhotoCard = () => {
    onClose(); // Close popover first
    setPhotoCardSelectorVisible(true);
  };

  const handleSelectCard = (cardId: string) => {
    console.log("Selected card:", cardId);
    setPhotoCardSelectorVisible(false);
  };

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
        key: "photoCard",
        label: "포토카드",
        icon: (
          <Ionicons name="images-outline" size={18} color={theme.colors.text} />
        ),
        onPress: handleOpenPhotoCard,
      },
    ],
    [onClose, onSelectFavoriteDate, theme.colors.text, handleOpenPhotoCard]
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
      <PhotoCardSelector
        visible={photoCardSelectorVisible}
        onClose={() => setPhotoCardSelectorVisible(false)}
        onSelectCard={handleSelectCard}
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
