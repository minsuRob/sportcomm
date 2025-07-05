import { Link, Stack } from "expo-router";
import * as React from "react";
import { View } from "react-native";

import { Text } from "../components/ui/text";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View className="flex-1 items-center justify-center bg-background p-4">
        <Text className="text-2xl font-bold text-foreground">
          This screen doesn't exist.
        </Text>

        <Link href="/" className="mt-4 rounded-md bg-primary px-4 py-2">
          <Text className="text-sm font-medium text-primary-foreground">
            Go to home screen!
          </Text>
        </Link>
      </View>
    </>
  );
}
