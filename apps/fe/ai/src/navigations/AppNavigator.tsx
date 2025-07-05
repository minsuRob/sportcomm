import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import FeedScreen from "../screens/FeedScreen";
import CreatePostScreen from "../screens/CreatePostScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Create" component={CreatePostScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
