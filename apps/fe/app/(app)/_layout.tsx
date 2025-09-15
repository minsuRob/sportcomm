import React from "react";
import { View, ViewStyle, useWindowDimensions } from "react-native";
import { Tabs } from "expo-router";
import { Slot } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useResponsive } from "@/lib/hooks/useResponsive";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import SidebarNavigation from "@/components/SidebarNavigation";
import { isWeb } from "@/lib/platform";

/**
 * 모바일용 탭 레이아웃 컴포넌트
 * 화면 하단에 탭 네비게이션을 표시합니다
 */
function MobileTabLayout() {
  const { theme } = useAppTheme();

  // 팀 메인 컬러 (fallback 처리)
  const teamMain = theme.colors.teamMain ?? theme.colors.tint;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: teamMain, // 활성 탭 색상을 팀 메인 컬러로 설정
        tabBarInactiveTintColor: theme.colors.textDim,
        tabBarStyle: {
          height: 60,
          paddingTop: 6,
          paddingBottom: 8,
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
          borderTopWidth: 0.5,
        },
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: "피드",
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "검색",
          tabBarIcon: ({ color }) => (
            <Ionicons name="search" size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="team-center"
        options={{
          title: "팀",
          tabBarIcon: ({ color }) => (
            <Ionicons name="trophy-outline" size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: "상점",
          tabBarIcon: ({ color }) => (
            <Ionicons name="bag-handle-outline" size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "프로필",
          tabBarIcon: ({ color }) => (
            <Ionicons name="person" size={26} color={color} />
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
  const { width: screenWidth } = useWindowDimensions();

  return (
    <View style={themed($desktopContainer)}>
      <SidebarNavigation />
      <View style={themed($contentArea)}>
        <View
          style={[
            themed($contentWrapper),
            {
              maxWidth: Math.min(640, screenWidth * 0.8), // 화면 크기에 따른 동적 조정
              paddingHorizontal: screenWidth > 1200 ? 24 : 16, // 큰 화면에서 더 큰 여백
            },
          ]}
        >
          <Slot />
        </View>
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
  return <ResponsiveLayout />;
}

// --- 스타일 정의 ---
const $desktopContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  flexDirection: "row",
});

const $contentArea: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
  // 웹에서 콘텐츠 영역 중앙 정렬
  alignItems: "center",
  paddingHorizontal: 8, // 최소 여백으로 줄임
  // 이미지 비율 최적화를 위한 추가 스타일
  ...(isWeb() && {
    paddingTop: 16,
    paddingBottom: 16,
  }),
});

const $contentWrapper: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: "100%",
  flex: 1,
  backgroundColor: colors.background,
  // 이미지 컨테이너 최적화를 위한 스타일
  ...(isWeb() && {
    borderRadius: 8,
    overflow: "hidden",
  }),
});
