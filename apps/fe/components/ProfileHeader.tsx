import React from "react";
import { View, Text, Image } from "react-native";

// Define a user type for the props, which will be passed down from the screen.
interface UserProfile {
  nickname: string;
  bio: string;
  profileImageUrl?: string;
}

interface ProfileHeaderProps {
  user: UserProfile;
}

/**
 * A component to display the main user profile information at the top of the profile screen.
 * It uses the className prop for styling, following the NativeWind v4 pattern, and
 * utilizes semantic colors defined in the Tailwind configuration for theme consistency.
 */
export default function ProfileHeader({ user }: ProfileHeaderProps) {
  // Provide a fallback avatar image if the user doesn't have one.
  const avatarUrl =
    user.profileImageUrl || `https://i.pravatar.cc/150?u=${user.nickname}`;

  return (
    <View className="items-center p-4 bg-card">
      <Image
        source={{ uri: avatarUrl }}
        className="w-24 h-24 rounded-full mb-4 border-2 border-border"
      />
      <Text className="text-2xl font-bold text-foreground">
        {user.nickname}
      </Text>
      <Text className="text-base text-muted-foreground mt-2 text-center">
        {user.bio}
      </Text>
    </View>
  );
}
