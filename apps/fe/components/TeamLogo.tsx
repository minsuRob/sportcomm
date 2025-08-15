import React from "react";
import {
  View,
  Text,
  Image,
  ViewStyle,
  TextStyle,
  ImageStyle,
} from "react-native";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";

interface TeamLogoProps {
  logoUrl?: string | null;
  fallbackIcon?: string;
  teamName?: string;
  size: number;
}

export default function TeamLogo({
  logoUrl,
  fallbackIcon,
  teamName,
  size,
}: TeamLogoProps) {
  const { themed } = useAppTheme();

  const $logoStyle: ImageStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  const $fallbackContainerStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    justifyContent: "center",
    alignItems: "center",
  };

  const $fallbackTextStyle: TextStyle = {
    fontSize: size * 0.6,
  };

  if (logoUrl) {
    return (
      <Image source={{ uri: logoUrl }} style={themed([$logo, $logoStyle])} />
    );
  }

  if (fallbackIcon) {
    return (
      <View style={themed([$fallbackContainer, $fallbackContainerStyle])}>
        <Text style={[$fallbackText, $fallbackTextStyle]}>{fallbackIcon}</Text>
      </View>
    );
  }

  return (
    <View style={themed([$fallbackContainer, $fallbackContainerStyle])}>
      <Text style={[$fallbackText, $fallbackTextStyle]}>
        {teamName?.charAt(0) || "T"}
      </Text>
    </View>
  );
}

const $logo: ThemedStyle<ImageStyle> = ({ colors }) => ({
  borderWidth: 1,
  borderColor: colors.border,
});

const $fallbackContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.card,
  borderWidth: 1,
  borderColor: colors.border,
});

const $fallbackText: TextStyle = {
  color: "white",
  fontWeight: "bold",
};
