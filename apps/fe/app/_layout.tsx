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
import { initializeSupabase, supabase } from "@/lib/supabase/client";

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
  const [appInitialized, setAppInitialized] = React.useState(false);

  React.useEffect(() => {
    // 앱의 핵심 서비스들을 초기화합니다.
    const initializeApp = async () => {
      try {
        // 병렬로 초기화 실행
        await Promise.all([initializeI18n(), initializeSupabase()]);

        // --- DEBUG: Supabase 세션 상태 확인 ---
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          console.log("✅ [_layout.tsx] Supabase session found:", {
            userId: session.user.id,
            tokenExists: !!session.access_token,
          });
        } else {
          console.log("❌ [_layout.tsx] No Supabase session found.");
        }
        // --- END DEBUG ---
      } catch (error) {
        console.error("App initialization failed:", error);
      } finally {
        setAppInitialized(true);
      }
    };

    initializeApp();
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
    <ApolloProvider client={client}>
      <AppThemeProvider>
        <RootLayoutNav />
        <CustomToast />
        <Toast />
      </AppThemeProvider>
    </ApolloProvider>
  );
}
