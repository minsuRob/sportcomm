import React from "react";
import { View, ViewStyle } from "react-native";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { isWeb } from "@/lib/platform";
import { IMAGE_CONSTANTS } from "@/lib/image";

const PostCardSkeleton = () => {
  const { themed } = useAppTheme();

  return (
    <View style={themed($container)}>
      <View style={themed($header)}>
        <View style={themed($avatar)} />
        <View style={{ flex: 1 }}>
          <View style={[themed($textLine), { width: "50%" }]} />
          <View style={[themed($textLine), { width: "30%", marginTop: 4 }]} />
        </View>
      </View>
      <View style={themed($media)} />
      <View style={themed($actions)}>
        <View style={themed($actionButton)} />
        <View style={themed($actionButton)} />
        <View style={themed($actionButton)} />
      </View>
    </View>
  );
};

const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.card,
  borderRadius: 16,
  marginHorizontal: spacing.md,
  marginBottom: spacing.lg,
  padding: spacing.sm,
  borderWidth: 1,
  borderColor: colors.border,
});

const $header: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  padding: spacing.sm,
});

const $avatar: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: colors.border,
  marginRight: spacing.sm,
});

const $textLine: ThemedStyle<ViewStyle> = ({ colors }) => ({
  height: 16,
  backgroundColor: colors.border,
  borderRadius: 4,
});

const $media: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: "100%",
  height: isWeb()
    ? IMAGE_CONSTANTS.WEB.MIN_HEIGHT
    : IMAGE_CONSTANTS.MOBILE.MIN_HEIGHT,
  backgroundColor: colors.border,
  borderRadius: 8,
  marginTop: 8,
});

const $actions: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-around",
  padding: spacing.sm,
  marginTop: 4,
});

const $actionButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 40,
  height: 24,
  backgroundColor: colors.border,
  borderRadius: 4,
});

export default PostCardSkeleton;
