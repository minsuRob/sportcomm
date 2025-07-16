import "../global.css";

import { ThemeProvider as NavigationThemeProvider } from "@react-navigation/native";
import { PortalHost } from "@rn-primitives/portal";
import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as React from "react";
import { Platform } from "react-native";
import { createClient, Provider, cacheExchange, fetchExchange } from "urql";
import { setAndroidNavigationBar } from "../lib/android-navigation-bar";
import { GRAPHQL_URL } from "@env";

import {
  ThemeProvider as AppThemeProvider,
  useAppTheme,
} from "@/lib/theme/context";
import { customFontsToLoad } from "@/lib/theme/typography";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";

// Create a urql client pointing to the NestJS backend.
// This is the single source of truth for all GraphQL operations.

const client = createClient({
  url: GRAPHQL_URL,
  exchanges: [cacheExchange, fetchExchange],
});

console.log(GRAPHQL_URL);

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

function RootLayoutNav() {
  const { navigationTheme, themeContext } = useAppTheme();

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar style={themeContext === "dark" ? "light" : "dark"} />
      <Slot />
      <PortalHost />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts(customFontsToLoad);

  React.useEffect(() => {
    if (fontsLoaded) {
      // 폰트가 로드되면 스플래시 화면을 숨깁니다.
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // 폰트가 로드되지 않았다면 아무것도 렌더링하지 않습니다.
  if (!fontsLoaded) {
    return null;
  }

  // The urql Provider wraps everything, making the client available to all screens.
  return (
    <Provider value={client}>
      <AppThemeProvider>
        <RootLayoutNav />
      </AppThemeProvider>
    </Provider>
  );
}
