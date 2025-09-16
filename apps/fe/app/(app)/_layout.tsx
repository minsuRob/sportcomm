import React, { useState } from "react";
import { View, ViewStyle, useWindowDimensions, Text, TouchableOpacity } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { Slot } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useResponsive } from "@/lib/hooks/useResponsive";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import SidebarNavigation from "@/components/SidebarNavigation";
import { isWeb } from "@/lib/platform";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useAuth } from "@/lib/auth/context/AuthContext";
import AppDialog from "@/components/ui/AppDialog";

/**
 * 모바일용 탭 레이아웃 컴포넌트
 * 화면 하단에 탭 네비게이션을 표시합니다
 */
function MobileTabLayout() {
  const { theme } = useAppTheme();
  const { currentUser } = useCurrentUser();
  const { user: currentAuthUser } = useAuth();
  const router = useRouter();

  // 팀 메인 컬러 (fallback 처리)
  const teamMain = theme.colors.teamMain ?? theme.colors.tint;
  const points: number = currentUser?.points ?? 0;
  const pointsLabel: string = `${points.toLocaleString()}P`;

  // 로그인 필요 다이얼로그 상태
  const [loginDialogVisible, setLoginDialogVisible] = useState(false);

  // 로그인 다이얼로그 핸들러
  const handleLoginDialogConfirm = () => {
    setLoginDialogVisible(false);
    router.push("/(details)/auth");
  };

  const handleLoginDialogCancel = () => {
    setLoginDialogVisible(false);
  };

  // 탭 클릭 핸들러
  const handleTabPress = (routeName: string, defaultNavigation: () => void, event?: any) => {
    // 팀, 상점, 프로필 탭이고 로그인이 안 되어있는 경우
    if ((routeName === "team-center" || routeName === "shop" || routeName === "profile") && !currentAuthUser) {
      setLoginDialogVisible(true);
      // 다이얼로그가 표시되면 기본 네비게이션을 막아 탭 전환을 방지
      return;
    }

    // 로그인된 경우: 이벤트 전파를 막고 탭 전환 허용
    event?.preventDefault?.();
    event?.stopPropagation?.();
    defaultNavigation();
  };

  // 커스텀 탭 버튼 컴포넌트
  const createCustomTabButton = (routeName: string) => (props: any) => {
    const { onPress, ...otherProps } = props;
    return (
      <TouchableOpacity
        {...otherProps}
          onPress={(e: any) => {
            handleTabPress(routeName, onPress, e);
            e.preventDefault?.();
            e.stopPropagation?.();
          }}
      />
    );
  };

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarActiveTintColor: teamMain, // 활성 탭 색상을 팀 메인 컬러로 설정
          tabBarInactiveTintColor: theme.colors.textDim,
          tabBarStyle: {
            height: 52,
            paddingTop: 4,
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
          tabBarButton: createCustomTabButton("team-center"),
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: "상점",
          // 커스텀 아이콘: 상점 아이콘 우측 상단에 포인트 말풍선 표시
          tabBarIcon: ({ color }) => (
            <View style={{ alignItems: "center", justifyContent: "center", position: "relative" }}>
              <Ionicons name="bag-handle-outline" size={26} color={color} />
              <View
                style={{
                  position: "absolute",
                  top: -6,
                  right: -16,
                  backgroundColor: color,
                  borderRadius: 10,
                  minWidth: 20,
                  height: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 4,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.2,
                  shadowRadius: 2,
                  elevation: 3,
                }}
              >
                <Text
                  style={{
                    color: "white",
                    fontSize: 9,
                    fontWeight: "800",
                    fontFamily: "SpaceGrotesk-SemiBold",
                    textAlign: "center",
                  }}
                  numberOfLines={1}
                >
                  {pointsLabel}
                </Text>
              </View>
            </View>
          ),
          tabBarButton: createCustomTabButton("shop"),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "프로필",
          tabBarIcon: ({ color }) => (
            <Ionicons name="person" size={26} color={color} />
          ),
          tabBarButton: createCustomTabButton("profile"),
        }}
      />
      </Tabs>

      {/* 로그인 필요 다이얼로그 */}
      <AppDialog
        visible={loginDialogVisible}
        onClose={handleLoginDialogCancel}
        onConfirm={handleLoginDialogConfirm}
        title="로그인이 필요한 기능입니다"
        description="이 기능을 이용하려면 로그인이 필요합니다."
        confirmText="예"
        cancelText="아니오"
        dismissOnBackdrop={false}
      />
    </>
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
              // 사이드바(280px)를 제외한 나머지 공간 사용
              // width: "100%",
              maxWidth: Math.min(640, screenWidth * 0.8),
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
  // 콘텐츠 영역이 사이드바를 제외한 전체 공간을 사용하도록 설정
  // maxWidth: "none", // maxWidth 제한 제거
  // 이미지 컨테이너 최적화를 위한 스타일
  ...(isWeb() && {
    borderRadius: 8,
    overflow: "hidden",
  }),
});
