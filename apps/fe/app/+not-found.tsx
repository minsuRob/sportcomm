import { Link, Stack } from "expo-router";
import * as React from "react";
import { View, ViewStyle, TextStyle, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "../components/ui/text";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { useWindowDimensions } from "react-native";
import { isWeb } from "@/lib/platform";

export default function NotFoundScreen() {
  const { themed, theme } = useAppTheme();
  const { width: screenWidth } = useWindowDimensions();

  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View style={themed($container)}>
        <View
          style={[
            themed($content),
            {
              maxWidth: isWeb() ? 640 : screenWidth * 0.95,
              paddingHorizontal: isWeb() ? 16 : 8,
            },
          ]}
        >
          {/* Sportalk 로고 */}
          <View style={themed($logoRow)}>
            <Text style={themed($logoText)}>sp</Text>
            <Ionicons
              name="baseball"
              size={20}
              color={theme.colors.teamMain ?? theme.colors.tint}
              style={$baseballIcon() as any}
            />
            <Text style={themed($logoText)}>rtalk</Text>
          </View>

          <Text style={themed($errorText)}>
            찾을수 없는페이지 입니다
          </Text>

          <Link href="/" asChild>
            <TouchableOpacity style={themed($homeButton)} activeOpacity={0.8}>
              <Text style={themed($homeButtonText)}>
                홈으로 이동
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </>
  );
}

// --- 스타일 정의 ---

const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
  alignItems: "center",
  justifyContent: "center",
  paddingHorizontal: 8,
});

const $content: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: "100%",
  flex: 1,
  backgroundColor: colors.background,
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: 8,
});

// 로고 스타일 (FeedHeader.tsx에서 가져옴)
const $logoText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 24,
  fontWeight: "900",
  color: colors.teamMain ?? colors.tint,
  fontFamily: "TTTogether",
});

const $baseballIcon = (): ViewStyle => ({
  marginTop: 6,
  marginLeft: -4,
  marginRight: -4,
});

const $logoRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing?.xxs ?? 4,
  marginBottom: spacing?.lg ?? 24,
});

// 에러 텍스트 스타일
const $errorText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 20,
  fontWeight: "bold",
  color: colors.foreground,
  textAlign: "center",
  marginBottom: 24,
});

// 홈으로 이동 버튼 스타일
const $homeButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  marginTop: 16,
  paddingHorizontal: 24,
  paddingVertical: 14,
  borderRadius: 12,
  backgroundColor: colors.tint,
  alignItems: "center",
  // 버튼 그림자 효과
  shadowColor: colors.tint,
  shadowOffset: {
    width: 0,
    height: 2,
  },
  shadowOpacity: 0.25,
  shadowRadius: 4,
  elevation: 4, // Android 그림자
  // 웹용 그림자
  ...(isWeb() && {
    boxShadow: `0 2px 4px ${colors.tint}40`,
  }),
});

const $homeButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  fontWeight: "700",
  color: "#FFFFFF", // tint 색상 버튼에 흰색 텍스트
  letterSpacing: 0.5,
});
