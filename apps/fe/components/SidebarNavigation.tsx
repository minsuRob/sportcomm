import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from "react-native";
import { useRouter, usePathname } from "expo-router";
import { Home, Search, User } from "lucide-react-native";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";

interface NavigationItem {
  name: string;
  label: string;
  icon: React.ComponentType<{ color: string; size: number }>;
  route: string;
}

const navigationItems: NavigationItem[] = [
  {
    name: "feed",
    label: "Feed",
    icon: Home,
    route: "/(app)/feed",
  },
  {
    name: "search",
    label: "Search",
    icon: Search,
    route: "/(app)/search",
  },
  {
    name: "profile",
    label: "Profile",
    icon: User,
    route: "/(app)/profile",
  },
];

/**
 * 데스크톱용 사이드바 네비게이션 컴포넌트
 * 좌측에 고정된 사이드바 형태로 네비게이션을 제공합니다
 */
export default function SidebarNavigation() {
  const { themed, theme } = useAppTheme();
  const router = useRouter();
  const pathname = usePathname();

  const handleNavigation = (route: string) => {
    router.push(route as any);
  };

  return (
    <View style={themed($container)}>
      {/* 로고 영역 */}
      <View style={themed($logoContainer)}>
        <Text style={themed($logoText)}>SportComm</Text>
      </View>

      {/* 네비게이션 메뉴 */}
      <View style={themed($menuContainer)}>
        {navigationItems.map((item) => {
          const isActive = pathname.includes(item.name);
          const IconComponent = item.icon;

          return (
            <TouchableOpacity
              key={item.name}
              style={[themed($menuItem), isActive && themed($activeMenuItem)]}
              onPress={() => handleNavigation(item.route)}
            >
              <IconComponent
                color={isActive ? theme.colors.tint : theme.colors.textDim}
                size={24}
              />
              <Text
                style={[themed($menuText), isActive && themed($activeMenuText)]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// --- 스타일 정의 ---
const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  width: 240,
  height: "100%",
  backgroundColor: colors.background,
  borderRightWidth: 1,
  borderRightColor: colors.border,
  paddingVertical: spacing.lg,
});

const $logoContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingBottom: spacing.xl,
  borderBottomWidth: 1,
  borderBottomColor: "rgba(0,0,0,0.1)",
  marginBottom: spacing.lg,
});

const $logoText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 24,
  fontWeight: "bold",
  color: colors.tint,
});

const $menuContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
});

const $menuItem: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.md,
  borderRadius: 8,
  marginBottom: spacing.xs,
});

const $activeMenuItem: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tint + "20", // 20% 투명도
});

const $menuText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  marginLeft: spacing.md,
  fontSize: 16,
  fontWeight: "500",
  color: colors.textDim,
});

const $activeMenuText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  fontWeight: "600",
});
