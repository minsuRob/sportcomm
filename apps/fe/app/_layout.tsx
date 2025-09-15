import "../global.css";

import { ThemeProvider as NavigationThemeProvider } from "@react-navigation/native";
import { PortalHost } from "@rn-primitives/portal";
import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as React from "react";
import Toast from "react-native-toast-message";
import CustomToast from "@/components/CustomToast";
import { ApolloProvider } from "@apollo/client";
import GlobalWebLayout from "@/components/layout/GlobalWebLayout";
import { SafeAreaProvider } from "react-native-safe-area-context";
import SafeAreaWrapper from "@/components/SafeAreaWrapper";

import {
  ThemeProvider as AppThemeProvider,
  useAppTheme,
} from "@/lib/theme/context";
import { useLoadFonts } from "@/lib/fonts/useLoadFonts";
import * as SplashScreen from "expo-splash-screen";
import { initializeI18n } from "@/lib/i18n";
import { initializeSupabase, supabase } from "@/lib/supabase/client";

import { initExpoNotifications } from "@/lib/notifications/expoNotifications";
import { client } from "@/lib/api/client";
import { useRouter } from "expo-router";
import { handleNotificationResponse } from "@/lib/notifications/foregroundNotificationHandler";
import { initializeTeamCustomizations } from "@/lib/team-customization";
import { AuthProvider } from "@/lib/auth/context/AuthContext";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { navigationTheme, themeContext } = useAppTheme();

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar style={themeContext === "dark" ? "light" : "dark"} />
      <GlobalWebLayout>
        <SafeAreaWrapper edges={["top", "bottom"]}>
          <Slot />
        </SafeAreaWrapper>
      </GlobalWebLayout>
      <PortalHost />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useLoadFonts();
  const [appInitialized, setAppInitialized] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    // 앱의 핵심 서비스들을 초기화합니다.
    const initializeApp = async () => {
      try {
        // 병렬로 초기화 실행
        await Promise.all([
          initializeI18n(),
          initializeSupabase(),
          initializeTeamCustomizations(),
          initExpoNotifications({
            apolloClient: client,
            onToken: (t) => console.log("Expo token:", t),
            onReceive: (n) =>
              console.log(
                "Push received:",
                n.request?.content?.title || n.request?.identifier,
              ),
            onResponse: (r) => {
              console.log(
                "Push tapped:",
                r.notification?.request?.content?.title ||
                  r.notification?.request?.identifier,
              );
              // 알림 탭 시 적절한 화면으로 네비게이션
              handleNotificationResponse(r, router);
            },
          }),
        ]);

        // --- DEBUG: Supabase 세션 상태 확인 ---
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          // console.log("✅ [_layout.tsx] Supabase session found:", {
          //   userId: session.user.id,
          //   tokenExists: !!session.access_token,
          // });
        } else {
          console.warn("❌ [_layout.tsx] No Supabase session found.");
        }
        // --- END DEBUG ---
      } catch (error) {
        console.error("App initialization failed:", error);
      } finally {
        setAppInitialized(true);
      }
    };

    initializeApp();

    // 컴포넌트 언마운트 시 Auth 리스너 정리
    return () => {
      // AuthEventListener는 자동으로 정리됨 (useAuth 훅에서 처리)
    };
  }, []);

  React.useEffect(() => {
    if (fontsLoaded && appInitialized) {
      // 모든 초기화가 완료되면 스플래시 화면을 숨깁니다.
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, appInitialized]);

  // 모든 초기화가 완료될 때까지 로딩 상태를 유지합니다.
  if (!fontsLoaded || !appInitialized) {
    return null;
  }

  // Apollo Provider가 모든 것을 감싸서 모든 화면에서 클라이언트를 사용할 수 있게 합니다.
  return (
    <SafeAreaProvider>
      <ApolloProvider client={client}>
        {/* 전역 인증 컨텍스트: 세션/사용자 정보 단일 소스 */}
        <AuthProvider debug>
          <AppThemeProvider>
            <RootLayoutNav />
            <CustomToast />
            <Toast />
          </AppThemeProvider>
        </AuthProvider>
      </ApolloProvider>
    </SafeAreaProvider>
  );
}
