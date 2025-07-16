import React from "react";
import { View, ViewStyle } from "react-native";
import { Tabs } from "expo-router";
import { Slot } from "expo-router";
import { createClient, Provider, cacheExchange, fetchExchange } from "urql";
import { FontAwesome } from "@expo/vector-icons";
import { useResponsive } from "@/lib/hooks/useResponsive";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import SidebarNavigation from "@/components/SidebarNavigation";

// urql 클라이언트 생성 - NestJS 백엔드와 연결
const client = createClient({
  url: "http://localhost:3000/graphql",
  exchanges: [cacheExchange, fetchExchange],
});

/**
 * 모바일용 탭 레이아웃 컴포넌트
 * 화면 하단에 탭 네비게이션을 표시합니다
 */
function MobileTabLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="feed"
        options={{
          title: "Feed",
          tabBarIcon: ({ color }) => (
            <FontAwesome size={28} name="home" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color }) => (
            <FontAwesome size={28} name="search" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <FontAwesome size={28} name="user" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

/**
 * 데스크톱용 사이드바 레이아웃 컴포넌트
 * 좌측 사이드바와 메인 콘텐츠 영역으로 구성됩니다
 */
function DesktopSidebarLayout() {
  const { themed } = useAppTheme();

  return (
    <View style={themed($desktopContainer)}>
      <SidebarNavigation />
      <View style={themed($contentArea)}>
        <Slot />
      </View>
    </View>
  );
}

/**
 * 반응형 레이아웃 컴포넌트
 * 화면 크기에 따라 모바일/데스크톱 레이아웃을 동적으로 전환합니다
 */
function ResponsiveLayout() {
  const { isDesktop } = useResponsive();

  // 500px 이상: 데스크톱 레이아웃 (사이드바)
  // 500px 미만: 모바일 레이아웃 (하단 탭)
  return isDesktop ? <DesktopSidebarLayout /> : <MobileTabLayout />;
}

/**
 * 메인 레이아웃 컴포넌트
 * urql Provider로 감싸서 GraphQL 클라이언트를 제공합니다
 */
export default function Layout() {
  return (
    <Provider value={client}>
      <ResponsiveLayout />
    </Provider>
  );
}

// --- 스타일 정의 ---
const $desktopContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  flexDirection: "row",
});

const $contentArea: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
});
