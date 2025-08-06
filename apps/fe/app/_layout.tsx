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
import { client } from "@/lib/api/client";

import {
  ThemeProvider as AppThemeProvider,
  useAppTheme,
} from "@/lib/theme/context";
import { customFontsToLoad } from "@/lib/theme/typography";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { initializeI18n } from "@/lib/i18n";
import { initializeSupabase } from "@/lib/supabase/client";
import { tokenManager } from "@/lib/auth/token-manager";

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
        <Slot />
      </GlobalWebLayout>
      <PortalHost />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts(customFontsToLoad);
  const [i18nInitialized, setI18nInitialized] = React.useState(false);
  const [supabaseInitialized, setSupabaseInitialized] = React.useState(false);
  const [tokenManagerInitialized, setTokenManagerInitialized] =
    React.useState(false);

  React.useEffect(() => {
    // 앱의 핵심 서비스들을 초기화합니다.
    const initializeApp = async () => {
      try {
        // 병렬로 초기화 실행
        const [i18nResult, supabaseResult] = await Promise.allSettled([
          initializeI18n(),
          initializeSupabase(),
        ]);

        if (i18nResult.status === "rejected") {
          console.error("i18n 초기화 실패:", i18nResult.reason);
        }
        setI18nInitialized(true);

        if (supabaseResult.status === "rejected") {
          console.error("Supabase 초기화 실패:", supabaseResult.reason);
        }
        setSupabaseInitialized(true);
      } catch (error) {
        console.error("앱 초기화 실패:", error);
        // 실패 시에도 앱이 멈추지 않도록 상태를 업데이트합니다.
        setI18nInitialized(true);
        setSupabaseInitialized(true);
      }
    };

    initializeApp();

    // 앱 시작 시 토큰 매니저 초기화
    // Supabase 클라이언트가 초기화된 후, 세션 정보를 로드합니다.
    console.log("🚀 앱 시작 - 토큰 매니저 초기화 시도");
    tokenManager.getCurrentSession(); // 이 호출로 내부 리스너가 설정됩니다.
    setTokenManagerInitialized(true);
  }, []);

  React.useEffect(() => {
    if (
      fontsLoaded &&
      i18nInitialized &&
      supabaseInitialized &&
      tokenManagerInitialized
    ) {
      // 모든 초기화가 완료되면 스플래시 화면을 숨깁니다.
      SplashScreen.hideAsync();
    }
  }, [
    fontsLoaded,
    i18nInitialized,
    supabaseInitialized,
    tokenManagerInitialized,
  ]);

  // 모든 초기화가 완료될 때까지 로딩 상태를 유지합니다.
  if (
    !fontsLoaded ||
    !i18nInitialized ||
    !supabaseInitialized ||
    !tokenManagerInitialized
  ) {
    return null;
  }

  // Apollo Provider가 모든 것을 감싸서 모든 화면에서 클라이언트를 사용할 수 있게 합니다.
  return (
    <ApolloProvider client={client}>
      <AppThemeProvider>
        <RootLayoutNav />
        <CustomToast />
        <Toast />
      </AppThemeProvider>
    </ApolloProvider>
  );
}
