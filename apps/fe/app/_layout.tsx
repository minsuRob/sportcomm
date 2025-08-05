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

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

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

  React.useEffect(() => {
    // i18n 및 Supabase 초기화
    const initializeApp = async () => {
      try {
        // 병렬로 초기화 실행
        const [i18nResult, supabaseResult] = await Promise.allSettled([
          initializeI18n(),
          initializeSupabase(),
        ]);

        // i18n 초기화 결과 처리
        if (i18nResult.status === "rejected") {
          console.error("i18n 초기화 실패:", i18nResult.reason);
        }
        setI18nInitialized(true);

        // Supabase 초기화 결과 처리
        if (supabaseResult.status === "rejected") {
          console.error("Supabase 초기화 실패:", supabaseResult.reason);
        }
        setSupabaseInitialized(true);
      } catch (error) {
        console.error("앱 초기화 실패:", error);
        // 실패해도 앱은 실행되도록
        setI18nInitialized(true);
        setSupabaseInitialized(true);
      }
    };

    initializeApp();
  }, []);

  React.useEffect(() => {
    if (fontsLoaded && i18nInitialized && supabaseInitialized) {
      // 모든 초기화가 완료되면 스플래시 화면을 숨깁니다.
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, i18nInitialized, supabaseInitialized]);

  // 초기화가 완료되지 않았다면 아무것도 렌더링하지 않습니다.
  if (!fontsLoaded || !i18nInitialized || !supabaseInitialized) {
    return null;
  }

  // The Apollo Provider wraps everything, making the client available to all screens.
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
