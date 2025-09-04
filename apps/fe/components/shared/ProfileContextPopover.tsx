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
import { useRouter } from "expo-router";

export interface ProfileContextPopoverProps {
  visible: boolean;
  onClose: () => void;
  onOpenProfile: () => void;
  onShopPress: () => void; // 상점(포인트 샵) 화면 열기 콜백
  onLotteryPress: () => void; // 로또/이벤트 화면 열기 콜백
  onTeamFilterPress: () => void; // 팀 피드 필터(TeamFilterSelector) 열기 콜백
  anchorStyle?: ViewStyle; // 부모에서 위치 제어
}

/**
 * 프로필 드롭다운(팝오버) 메뉴
 * - 헤더 우측 아바타 아래에 표시되는 컨텍스트 메뉴
 * - TeamFilterSelector 접근 항목 추가 (팀 필터)
 */
export default function ProfileContextPopover({
  visible,
  onClose,
  onOpenProfile,
  onShopPress,
  onLotteryPress,
  onTeamFilterPress,
  anchorStyle,
}: ProfileContextPopoverProps) {
  const { theme, toggleTheme, themed } = useAppTheme();
  const { currentLanguage, switchLanguage } = useTranslation();
  const router = useRouter();

  const items = useMemo(
    () => [
      {
        key: "privateMessages",
        label: "개인 메시지",
        icon: (
          <Ionicons
            name="chatbubbles-outline"
            size={18}
            color={theme.colors.text}
          />
        ),
        onPress: () => {
          onClose();
          router.push("/(modals)/private-chats");
        },
      },
      {
        key: "openProfile",
        label: "내 프로필",
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
        key: "teamFilter",
        label: "팀 필터",
        icon: (
          <Ionicons name="funnel-outline" size={18} color={theme.colors.text} />
        ),
        onPress: () => {
          // FeedHeader 등에 있는 TeamFilterSelector 모달 트리거
          onClose();
          onTeamFilterPress();
        },
      },
      {
        key: "lottery",
        label: "이벤트 / 추첨",
        icon: (
          <Ionicons name="ticket-outline" size={18} color={theme.colors.text} />
        ),
        onPress: () => {
          onClose();
          onLotteryPress();
        },
      },
      {
        key: "shop",
        label: "포인트 상점",
        icon: (
          <Ionicons
            name="storefront-outline"
            size={18}
            color={theme.colors.text}
          />
        ),
        onPress: () => {
          onClose();
          onShopPress();
        },
      },
      {
        key: "teamColorFilter",
        label: "앱 색상 필터 (내 팀 기반)",
        icon: (
          <Ionicons
            name="color-filter-outline"
            size={18}
            color={theme.colors.text}
          />
        ),
        onPress: () => {
          onClose();
          router.push({ pathname: "/(details)/team-colors-select" });
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
    ],
    [
      theme,
      toggleTheme,
      currentLanguage,
      switchLanguage,
      onOpenProfile,
      onClose,
      router,
      onShopPress,
      onLotteryPress,
      onTeamFilterPress,
    ],
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

/*
커밋 메세지: feat(popover): 프로필 컨텍스트 메뉴에 팀 필터(TeamFilterSelector) 진입 항목 추가
*/
