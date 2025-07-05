import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import AppNavigator from "./navigations/AppNavigator";
import { createClient, Provider } from 'urql';

// Create a urql client pointing to your NestJS backend
const client = createClient({
  url: 'http://localhost:3000/graphql', // Ensure this is your correct GraphQL endpoint
});

export default function App() {
  return (
    <Provider value={client}>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </Provider>
  );
}
