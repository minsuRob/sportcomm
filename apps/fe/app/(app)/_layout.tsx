import React from "react";
import { Tabs } from "expo-router";
import { createClient, Provider, cacheExchange, fetchExchange } from "urql";
import { Home, PlusSquare, User as ProfileIcon } from "lucide-react-native";

// Create a urql client pointing to your NestJS backend.
// In recent urql versions, the `exchanges` property is required.
const client = createClient({
  url: "http://localhost:3000/graphql",
  exchanges: [cacheExchange, fetchExchange], // Add default exchanges
});

/**
 * This is the main layout for the (app) group, which includes all authenticated screens.
 * It sets up the bottom tab navigator.
 */
function AppTabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#1F2937", // A nice dark color for active tabs
        tabBarInactiveTintColor: "#9CA3AF", // Muted gray for inactive tabs
        headerShown: false, // Hide the default header as screens can manage their own
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: "Feed",
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "Create",
          tabBarIcon: ({ color, size }) => (
            <PlusSquare color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <ProfileIcon color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

// The default export for the layout file.
// It wraps the actual layout component with the urql Provider.
export default function Layout() {
  return (
    <Provider value={client}>
      <AppTabLayout />
    </Provider>
  );
}
