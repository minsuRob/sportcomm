import React, { useEffect, useRef } from "react";
import { View, ViewStyle, Animated } from "react-native";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { isWeb } from "@/lib/platform";
import { IMAGE_CONSTANTS } from "@/lib/image";

interface PostCardSkeletonProps {
  count?: number;
}

const PostCardSkeleton = ({ count = 1 }: PostCardSkeletonProps) => {
  const { themed } = useAppTheme();
  const opacityAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    // 부드러운 페이드 애니메이션
    const fadeAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.5,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    fadeAnimation.start();

    return () => {
      fadeAnimation.stop();
    };
  }, [opacityAnim]);

  const renderSkeleton = () => (
    <Animated.View style={[themed($container), { opacity: opacityAnim }]}>
      <View style={themed($header)}>
        <View style={themed($avatar)} />
        <View style={{ flex: 1 }}>
          <View style={[themed($textLine), { width: "60%" }]} />
          <View style={[themed($textLine), { width: "40%", marginTop: 6 }]} />
        </View>
      </View>

      {/* 게시물 내용 스켈레톤 */}
      <View style={themed($content)}>
        <View style={[themed($textLine), { width: "90%" }]} />
        <View style={[themed($textLine), { width: "75%", marginTop: 6 }]} />
        <View style={[themed($textLine), { width: "85%", marginTop: 6 }]} />
      </View>

      <View style={themed($media)} />

      <View style={themed($actions)}>
        <View style={themed($actionButton)} />
        <View style={themed($actionButton)} />
        <View style={themed($actionButton)} />
        <View style={themed($actionButton)} />
      </View>

      {/* 댓글 미리보기 스켈레톤 */}
      <View style={themed($comments)}>
        <View style={[themed($textLine), { width: "70%" }]} />
        <View style={[themed($textLine), { width: "50%", marginTop: 4 }]} />
      </View>
    </Animated.View>
  );

  if (count === 1) {
    return renderSkeleton();
  }

  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <React.Fragment key={index}>
          {renderSkeleton()}
        </React.Fragment>
      ))}
    </>
  );
};

// --- Styles ---
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

const $content: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.sm,
  paddingTop: spacing.xs,
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

const $comments: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  paddingHorizontal: spacing.sm,
  paddingTop: spacing.xs,
  borderTopWidth: 1,
  borderTopColor: colors.border,
  marginTop: spacing.sm,
});

export default PostCardSkeleton;
