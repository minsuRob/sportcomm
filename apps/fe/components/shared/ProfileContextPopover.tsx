import React, { useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { Portal } from "@rn-primitives/portal";

export interface ProfileContextPopoverProps {
  visible: boolean;
  onClose: () => void;
  onOpenProfile: () => void;
  anchorStyle?: ViewStyle; // 부모에서 위치 제어
}

/**
 * 프로필 드롭다운(팝오버) 메뉴
 * - 하단 시트가 아닌, 헤더 우측 아바타 아래에 표시되는 컨텍스트 메뉴
 */
export default function ProfileContextPopover({
  visible,
  onClose,
  onOpenProfile,
  anchorStyle,
}: ProfileContextPopoverProps) {
  const { theme, toggleTheme, setAppColor, appColor, themed } = useAppTheme();
  const { currentLanguage, switchLanguage } = useTranslation();

  const items = useMemo(
    () => [
      {
        key: "openProfile",
        label: "내 프로필 열기",
        icon: (
          <Ionicons
            name="person-circle-outline"
            size={18}
            color={theme.colors.text}
          />
        ),
        onPress: () => {
          onClose();
          onOpenProfile();
        },
      },
      {
        key: "toggleTheme",
        label: theme.isDark ? "라이트 테마로" : "다크 테마로",
        icon: (
          <Ionicons
            name={theme.isDark ? "sunny-outline" : "moon-outline"}
            size={18}
            color={theme.colors.text}
          />
        ),
        onPress: () => {
          toggleTheme();
          onClose();
        },
      },
      {
        key: "toggleLanguage",
        label: currentLanguage === "ko" ? "English로 전환" : "한국어로 전환",
        icon: (
          <Ionicons name="globe-outline" size={18} color={theme.colors.text} />
        ),
        onPress: () => {
          switchLanguage(currentLanguage === "ko" ? "en" : "ko");
          onClose();
        },
      },
      (() => {
        const nextColor =
          appColor === "blue" ? "red" : appColor === "red" ? "orange" : "blue";
        const appColorKorean =
          appColor === "blue" ? "파랑" : appColor === "red" ? "빨강" : "주황";
        const nextColorKorean =
          nextColor === "blue" ? "파랑" : nextColor === "red" ? "빨강" : "주황";
        return {
          key: "toggleAppColor",
          label: `앱 색상: ${appColorKorean} → ${nextColorKorean}`,
          icon: (
            <Ionicons
              name="color-palette-outline"
              size={18}
              color={theme.colors.text}
            />
          ),
          onPress: () => {
            setAppColor(nextColor as any);
            onClose();
          },
        };
      })(),
    ],
    [
      theme,
      toggleTheme,
      currentLanguage,
      switchLanguage,
      appColor,
      setAppColor,
      onOpenProfile,
      onClose,
    ]
  );

  if (!visible) return null;

  return (
    <Portal name="profile-context-popover">
      <View style={themed($overlay)}>
        {/* 바깥 영역 클릭 시 닫기 */}
        <TouchableOpacity
          style={themed($backdrop)}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* 앵커 위치에 표시되는 팝오버 카드 */}
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
  );
}

// --- 스타일 정의 ---
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
