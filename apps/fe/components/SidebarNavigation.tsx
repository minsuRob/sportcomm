import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from "react-native";
import { useRouter, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";

interface NavigationItem {
  name: string;
  label: string;
  icon: (props: { color: string; size: number }) => React.ReactElement;
  route: string;
}

const navigationItems: NavigationItem[] = [
  {
    name: "feed",
    label: "피드",
    icon: (props) => <Ionicons name="home" {...props} />,
    route: "/(app)/feed",
  },
  {
    name: "search",
    label: "검색",
    icon: (props) => <Ionicons name="search" {...props} />,
    route: "/(app)/search",
  },
  {
    name: "team-center",
    label: "팀",
    icon: (props) => <Ionicons name="trophy-outline" {...props} />,
    route: "/(app)/team-center",
  },
  {
    name: "shop",
    label: "상점",
    icon: (props) => <Ionicons name="bag-handle-outline" {...props} />,
    route: "/(app)/shop",
  },
  {
    name: "profile",
    label: "프로필",
    icon: (props) => <Ionicons name="person" {...props} />,
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

  // 팀 메인/서브 컬러 (오버라이드 없으면 tint/accent 사용)
  const teamMain = theme.colors.teamMain ?? theme.colors.tint;
  const teamSub = theme.colors.teamSub ?? theme.colors.accent;

  const handleNavigation = (route: string) => {
    router.push(route as any);
  };

  return (
    <View style={themed($container)}>
      {/* 로고 영역 */}
      <View style={themed($logoContainer)}>
        <Text style={themed($logoText)}>SportCommm</Text>
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
                color={isActive ? teamMain : theme.colors.textDim}
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
  width: 280, // 더 넓은 사이드바
  height: "100%",
  backgroundColor: colors.background,
  borderRightWidth: 1,
  borderRightColor: colors.border,
  paddingVertical: spacing.xl,
  paddingHorizontal: spacing.lg,
});

const $logoContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingBottom: spacing.xl,
  marginBottom: spacing.xl,
});

const $logoText: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  fontSize: 28,
  fontWeight: "bold",
  color: colors.teamMain ?? colors.tint,
  letterSpacing: -0.5,
  fontFamily: typography.logo.normal,
});

const $menuContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.xs,
});

const $menuItem: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: spacing.lg,
  paddingHorizontal: spacing.lg,
  borderRadius: 12,
  minHeight: 56, // 더 큰 터치 영역
});

const $activeMenuItem: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: (colors.teamMain ?? colors.tint) + "15", // 팀 메인 색상 기반 15% 투명 배경
});

const $menuText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  marginLeft: spacing.lg,
  fontSize: 18,
  fontWeight: "500",
  color: colors.textDim,
});

/*
커밋 메시지 (git): refactor(nav): SidebarNavigation 팀 컬러 teamMain/teamSub 적용
*/

const $activeMenuText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.teamMain ?? colors.tint,
  fontWeight: "700", // 더 굵게
});
