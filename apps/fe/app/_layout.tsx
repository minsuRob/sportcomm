import "../global.css";

import {
  DarkTheme,
  DefaultTheme,
  Theme,
  ThemeProvider,
} from "@react-navigation/native";
import { PortalHost } from "@rn-primitives/portal";
import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as React from "react";
import { Appearance, Platform } from "react-native";
import { createClient, Provider, cacheExchange, fetchExchange } from "urql";
import { setAndroidNavigationBar } from "../lib/android-navigation-bar";
import { NAV_THEME } from "../lib/constants";
import { useColorScheme } from "../lib/useColorScheme";
import { GRAPHQL_URL } from "@env";

// Create a urql client pointing to the NestJS backend.
// This is the single source of truth for all GraphQL operations.

const client = createClient({
  url: GRAPHQL_URL || "http://localhost:3000/graphql",
  exchanges: [cacheExchange, fetchExchange],
});

console.log(GRAPHQL_URL);

const LIGHT_THEME: Theme = {
  ...DefaultTheme,
  colors: NAV_THEME.light,
};
const DARK_THEME: Theme = {
  ...DarkTheme,
  colors: NAV_THEME.dark,
};

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

const usePlatformSpecificSetup = Platform.select({
  web: useSetWebBackgroundClassName,
  android: useSetAndroidNavigationBar,
  default: noop,
});

export default function RootLayout() {
  const { isDarkColorScheme, setColorScheme } = useColorScheme();

  React.useEffect(() => {
    // Set the initial color scheme from the OS setting.
    setColorScheme(Appearance.getColorScheme() ?? "light");

    // Listen for OS theme changes.
    const subscription = Appearance.addChangeListener((preferences) => {
      setColorScheme(preferences.colorScheme ?? "light");
    });

    return () => subscription.remove();
  }, [setColorScheme]);

  usePlatformSpecificSetup();

  // The urql Provider wraps everything, making the client available to all screens.
  return (
    <Provider value={client}>
      <ThemeProvider value={isDarkColorScheme ? DARK_THEME : LIGHT_THEME}>
        <StatusBar style={isDarkColorScheme ? "light" : "dark"} />
        <Slot />
        <PortalHost />
      </ThemeProvider>
    </Provider>
  );
}

const useIsomorphicLayoutEffect =
  Platform.OS === "web" && typeof window === "undefined"
    ? React.useEffect
    : React.useLayoutEffect;

function useSetWebBackgroundClassName() {
  const { isDarkColorScheme } = useColorScheme();

  useIsomorphicLayoutEffect(() => {
    // Adds the background color to the html element to prevent white background on overscroll.
    document.documentElement.classList.add("bg-background");
    // On web, we need to manually add/remove the 'dark' class on the html element
    if (isDarkColorScheme) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkColorScheme]);
}

function useSetAndroidNavigationBar() {
  const { colorScheme } = useColorScheme();
  React.useEffect(() => {
    setAndroidNavigationBar(colorScheme);
  }, [colorScheme]);
}

function noop() {}
