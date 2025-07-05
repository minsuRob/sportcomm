import React from "react";
import { View, Text, Image } from "react-native";
import { styled } from "nativewind/styled";

// Define a user type for the props.
// This can be expanded as needed.
interface UserProfile {
  nickname: string;
  bio: string;
  profileImageUrl?: string;
}

interface ProfileHeaderProps {
  user: UserProfile;
}

// Styled Components using NativeWind for consistency
const Container = styled(View, "items-center p-4 bg-white dark:bg-gray-800");
const Avatar = styled(Image, "w-24 h-24 rounded-full mb-4");
const Nickname = styled(
  Text,
  "text-2xl font-bold text-gray-900 dark:text-white",
);
const Bio = styled(
  Text,
  "text-base text-gray-600 dark:text-gray-400 mt-2 text-center",
);

export default function ProfileHeader({ user }: ProfileHeaderProps) {
  // Use a fallback avatar if no profile image is provided
  const avatarUrl =
    user.profileImageUrl || `https://i.pravatar.cc/150?u=${user.nickname}`;

  return (
    <Container>
      <Avatar source={{ uri: avatarUrl }} />
      <Nickname>{user.nickname}</Nickname>
      <Bio>{user.bio}</Bio>
    </Container>
  );
}
