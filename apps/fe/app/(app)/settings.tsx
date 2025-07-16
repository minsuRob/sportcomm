import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  Alert,
} from "react-native";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import {
  ChevronRight,
  LogOut,
  HelpCircle,
  Sun,
  Moon,
  Globe,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "@/lib/i18n/useTranslation";

/**
 * 설정 화면 컴포넌트
 * 앱의 다양한 설정을 관리합니다.
 */
export default function SettingsScreen() {
  const { themed, theme, toggleTheme } = useAppTheme();
  const router = useRouter();
  const { switchLanguage, currentLanguage } = useTranslation();

  /**
   * 로그아웃 처리 함수
   */
  const handleLogout = (): void => {
    // TODO: 로그아웃 로직 구현
    console.log("로그아웃");
  };

  /**
   * 도움말 화면으로 이동하는 함수
   */
  const handleHelp = (): void => {
    // TODO: 도움말 화면 이동 로직 구현
    console.log("도움말");
  };

  /**
   * 언어 변경 처리 함수
   */
  const handleLanguage = (): void => {
    Alert.alert(
      "언어 변경",
      "사용할 언어를 선택해주세요.",
      [
        {
          text: "한국어",
          onPress: () => switchLanguage("ko"),
        },
        {
          text: "English",
          onPress: () => switchLanguage("en"),
        },
        {
          text: "취소",
          style: "cancel",
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={themed($container)}>
      {/* 헤더 */}
      <View style={themed($header)}>
        <Text style={themed($headerTitle)}>설정</Text>
      </View>

      {/* 설정 메뉴 */}
      <View style={themed($menuContainer)}>
        {/* 로그아웃 */}
        <TouchableOpacity style={themed($menuItem)} onPress={handleLogout}>
          <LogOut color={theme.colors.text} size={24} />
          <Text style={themed($menuItemText)}>로그아웃</Text>
          <ChevronRight color={theme.colors.textDim} size={20} />
        </TouchableOpacity>

        {/* 도움말 */}
        <TouchableOpacity style={themed($menuItem)} onPress={handleHelp}>
          <HelpCircle color={theme.colors.text} size={24} />
          <Text style={themed($menuItemText)}>도움말</Text>
          <ChevronRight color={theme.colors.textDim} size={20} />
        </TouchableOpacity>

        {/* 테마 변경 */}
        <TouchableOpacity style={themed($menuItem)} onPress={toggleTheme}>
          {theme.isDark ? (
            <Sun color={theme.colors.text} size={24} />
          ) : (
            <Moon color={theme.colors.text} size={24} />
          )}
          <Text style={themed($menuItemText)}>테마</Text>
          <Text style={themed($menuItemValue)}>
            {theme.isDark ? "다크" : "라이트"}
          </Text>
        </TouchableOpacity>

        {/* 언어 설정 */}
        <TouchableOpacity style={themed($menuItem)} onPress={handleLanguage}>
          <Globe color={theme.colors.text} size={24} />
          <Text style={themed($menuItemText)}>언어</Text>
          <Text style={themed($menuItemValue)}>
            {currentLanguage === "ko" ? "한국어" : "English"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// --- 스타일 정의 ---
const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
});

const $header: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.lg,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $headerTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 24,
  fontWeight: "bold",
  color: colors.text,
});

const $menuContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.lg,
});

const $menuItem: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.lg,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $menuItemText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  flex: 1,
  marginLeft: spacing.md,
  fontSize: 18,
  color: colors.text,
});

const $menuItemValue: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  color: colors.textDim,
});