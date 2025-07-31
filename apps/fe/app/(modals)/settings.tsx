import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  StyleSheet,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "@/lib/i18n/useTranslation";

// 안드로이드에서 LayoutAnimation 활성화
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * 설정 화면 컴포넌트
 * 앱의 다양한 설정을 관리합니다.
 */
export default function SettingsScreen() {
  const { themed, theme, toggleTheme, setAppColor, appColor } = useAppTheme();
  const router = useRouter();
  const { switchLanguage, currentLanguage } = useTranslation();

  // 설정 섹션 상태 관리
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

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
   * 드롭다운 섹션 토글 함수
   */
  const toggleSection = (section: string): void => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSection(expandedSection === section ? null : section);
  };

  /**
   * 언어 선택 처리 함수
   */
  const handleLanguageSelect = (language: string): void => {
    switchLanguage(language);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSection(null);
  };

  /**
   * 앱 색상 선택 처리 함수
   */
  const handleAppColorSelect = (color: string): void => {
    setAppColor(color as any);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSection(null);
  };

  return (
    <View style={themed($container)}>
      {/* 헤더 */}
      <View style={themed($header)}>
        <Text style={themed($headerTitle)}>설정</Text>
      </View>

      {/* 설정 메뉴 */}
      <View style={themed($menuContainer)}>
        {/* 테마 설정 드롭다운 */}
        <View style={themed($menuSection)}>
          <TouchableOpacity
            style={themed($menuHeader)}
            onPress={() => toggleSection("theme")}
            activeOpacity={0.7}
          >
            <View style={themed($menuHeaderLeft)}>
              <View style={themed($iconContainer)}>
                {theme.isDark ? (
                  <Ionicons name="sunny" color={theme.colors.text} size={20} />
                ) : (
                  <Ionicons name="moon" color={theme.colors.text} size={20} />
                )}
              </View>
              <Text style={themed($menuHeaderText)}>테마</Text>
            </View>
            <View style={themed($menuHeaderRight)}>
              <Text style={themed($currentValueText)}>
                {theme.isDark ? "다크" : "라이트"}
              </Text>
              <Ionicons
                name={
                  expandedSection === "theme" ? "chevron-up" : "chevron-down"
                }
                color={theme.colors.textDim}
                size={18}
              />
            </View>
          </TouchableOpacity>

          {expandedSection === "theme" && (
            <View style={themed($dropdownContent)}>
              <TouchableOpacity
                style={themed([
                  $dropdownItem,
                  !theme.isDark && $selectedDropdownItem,
                ])}
                onPress={toggleTheme}
              >
                <Text
                  style={themed([
                    $dropdownItemText,
                    !theme.isDark && $selectedDropdownItemText,
                  ])}
                >
                  라이트
                </Text>
                {!theme.isDark && (
                  <Ionicons
                    name="checkmark"
                    color={theme.colors.tint}
                    size={18}
                  />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={themed([
                  $dropdownItem,
                  theme.isDark && $selectedDropdownItem,
                ])}
                onPress={toggleTheme}
              >
                <Text
                  style={themed([
                    $dropdownItemText,
                    theme.isDark && $selectedDropdownItemText,
                  ])}
                >
                  다크
                </Text>
                {theme.isDark && (
                  <Ionicons
                    name="checkmark"
                    color={theme.colors.tint}
                    size={18}
                  />
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 언어 설정 드롭다운 */}
        <View style={themed($menuSection)}>
          <TouchableOpacity
            style={themed($menuHeader)}
            onPress={() => toggleSection("language")}
            activeOpacity={0.7}
          >
            <View style={themed($menuHeaderLeft)}>
              <View style={themed($iconContainer)}>
                <Ionicons name="globe" color={theme.colors.text} size={20} />
              </View>
              <Text style={themed($menuHeaderText)}>언어</Text>
            </View>
            <View style={themed($menuHeaderRight)}>
              <Text style={themed($currentValueText)}>
                {currentLanguage === "ko" ? "한국어" : "English"}
              </Text>
              <Ionicons
                name={
                  expandedSection === "language" ? "chevron-up" : "chevron-down"
                }
                color={theme.colors.textDim}
                size={18}
              />
            </View>
          </TouchableOpacity>

          {expandedSection === "language" && (
            <View style={themed($dropdownContent)}>
              <TouchableOpacity
                style={themed([
                  $dropdownItem,
                  currentLanguage === "ko" && $selectedDropdownItem,
                ])}
                onPress={() => handleLanguageSelect("ko")}
              >
                <Text
                  style={themed([
                    $dropdownItemText,
                    currentLanguage === "ko" && $selectedDropdownItemText,
                  ])}
                >
                  한국어
                </Text>
                {currentLanguage === "ko" && (
                  <Ionicons
                    name="checkmark"
                    color={theme.colors.tint}
                    size={18}
                  />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={themed([
                  $dropdownItem,
                  currentLanguage === "en" && $selectedDropdownItem,
                ])}
                onPress={() => handleLanguageSelect("en")}
              >
                <Text
                  style={themed([
                    $dropdownItemText,
                    currentLanguage === "en" && $selectedDropdownItemText,
                  ])}
                >
                  English
                </Text>
                {currentLanguage === "en" && (
                  <Ionicons
                    name="checkmark"
                    color={theme.colors.tint}
                    size={18}
                  />
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 앱 색상 설정 드롭다운 */}
        <View style={themed($menuSection)}>
          <TouchableOpacity
            style={themed($menuHeader)}
            onPress={() => toggleSection("appColor")}
            activeOpacity={0.7}
          >
            <View style={themed($menuHeaderLeft)}>
              <View style={themed($iconContainer)}>
                <Ionicons
                  name="color-palette"
                  color={theme.colors.text}
                  size={20}
                />
              </View>
              <Text style={themed($menuHeaderText)}>앱 색상</Text>
            </View>
            <View style={themed($menuHeaderRight)}>
              <View
                style={[
                  styles.colorIndicator,
                  { backgroundColor: getColorByName(appColor) },
                ]}
              />
              <Text style={themed($currentValueText)}>
                {getColorNameInKorean(appColor)}
              </Text>
              <Ionicons
                name={
                  expandedSection === "appColor" ? "chevron-up" : "chevron-down"
                }
                color={theme.colors.textDim}
                size={18}
              />
            </View>
          </TouchableOpacity>

          {expandedSection === "appColor" && (
            <View style={themed($dropdownContent)}>
              <TouchableOpacity
                style={themed([
                  $dropdownItem,
                  appColor === "blue" && $selectedDropdownItem,
                ])}
                onPress={() => handleAppColorSelect("blue")}
              >
                <View style={themed($colorOptionContainer)}>
                  <View
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: getColorByName("blue") },
                    ]}
                  />
                  <Text
                    style={themed([
                      $dropdownItemText,
                      appColor === "blue" && $selectedDropdownItemText,
                    ])}
                  >
                    파랑
                  </Text>
                </View>
                {appColor === "blue" && (
                  <Ionicons
                    name="checkmark"
                    color={theme.colors.tint}
                    size={18}
                  />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={themed([
                  $dropdownItem,
                  appColor === "red" && $selectedDropdownItem,
                ])}
                onPress={() => handleAppColorSelect("red")}
              >
                <View style={themed($colorOptionContainer)}>
                  <View
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: getColorByName("red") },
                    ]}
                  />
                  <Text
                    style={themed([
                      $dropdownItemText,
                      appColor === "red" && $selectedDropdownItemText,
                    ])}
                  >
                    빨강
                  </Text>
                </View>
                {appColor === "red" && (
                  <Ionicons
                    name="checkmark"
                    color={theme.colors.tint}
                    size={18}
                  />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={themed([
                  $dropdownItem,
                  appColor === "orange" && $selectedDropdownItem,
                ])}
                onPress={() => handleAppColorSelect("orange")}
              >
                <View style={themed($colorOptionContainer)}>
                  <View
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: getColorByName("orange") },
                    ]}
                  />
                  <Text
                    style={themed([
                      $dropdownItemText,
                      appColor === "orange" && $selectedDropdownItemText,
                    ])}
                  >
                    주황
                  </Text>
                </View>
                {appColor === "orange" && (
                  <Ionicons
                    name="checkmark"
                    color={theme.colors.tint}
                    size={18}
                  />
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 일반 메뉴 아이템 */}
        <TouchableOpacity
          style={themed($menuHeader)}
          onPress={handleHelp}
          activeOpacity={0.7}
        >
          <View style={themed($menuHeaderLeft)}>
            <View style={themed($iconContainer)}>
              <Ionicons
                name="help-circle-outline"
                color={theme.colors.text}
                size={20}
              />
            </View>
            <Text style={themed($menuHeaderText)}>도움말</Text>
          </View>
          <Ionicons
            name="chevron-forward"
            color={theme.colors.textDim}
            size={18}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={themed($menuHeader)}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <View style={themed($menuHeaderLeft)}>
            <View style={themed($iconContainer)}>
              <Ionicons
                name="log-out-outline"
                color={theme.colors.text}
                size={20}
              />
            </View>
            <Text style={themed($menuHeaderText)}>로그아웃</Text>
          </View>
          <Ionicons
            name="chevron-forward"
            color={theme.colors.textDim}
            size={18}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * 색상 이름에 따른 실제 색상 값 반환
 */
const getColorByName = (colorName: string): string => {
  switch (colorName) {
    case "red":
      return "#EF4444";
    case "orange":
      return "#F97316";
    case "blue":
    default:
      return "rgb(14, 165, 233)";
  }
};

/**
 * 색상 이름의 한국어 표현 반환
 */
const getColorNameInKorean = (colorName: string): string => {
  switch (colorName) {
    case "red":
      return "빨강";
    case "orange":
      return "주황";
    case "blue":
    default:
      return "파랑";
  }
};

// 색상 미리보기를 위한 스타일
const styles = StyleSheet.create({
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  colorSwatch: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
});

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
  fontSize: 20,
  fontWeight: "600",
  color: colors.text,
});

const $menuContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.sm,
});

const $menuSection: ThemedStyle<ViewStyle> = ({ colors }) => ({
  marginBottom: 8,
  borderRadius: 12,
  backgroundColor: colors.card,
  overflow: "hidden",
});

const $menuHeader: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
  backgroundColor: colors.card,
});

const $menuHeaderLeft: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  alignItems: "center",
});

const $menuHeaderRight: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  alignItems: "center",
});

const $iconContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  width: 34,
  height: 34,
  borderRadius: 17,
  backgroundColor: colors.backgroundAlt,
  justifyContent: "center",
  alignItems: "center",
  marginRight: spacing.sm,
});

const $menuHeaderText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  fontWeight: "500",
  color: colors.text,
});

const $currentValueText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 14,
  color: colors.textDim,
  marginRight: spacing.xs,
});

const $dropdownContent: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.backgroundAlt,
  paddingVertical: 8,
  borderTopWidth: 1,
  borderTopColor: colors.border,
});

const $dropdownItem: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  paddingLeft: 54,
});

const $selectedDropdownItem: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.backgroundAlt,
});

const $dropdownItemText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 15,
  color: colors.text,
});

const $selectedDropdownItemText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  fontWeight: "500",
});

const $colorOptionContainer: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  alignItems: "center",
});

const $menuItemText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  flex: 1,
  marginLeft: spacing.md,
  fontSize: 16,
  color: colors.text,
});

const $menuItemValue: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
});
