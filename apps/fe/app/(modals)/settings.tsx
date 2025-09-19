import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useAuth } from "@/lib/auth/context/AuthContext";
import { showToast } from "@/components/CustomToast";

/**
 * 안드로이드에서 LayoutAnimation 활성화
 */
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * 설정 화면 컴포넌트
 * - 테마 / 언어 / 앱 색상 / 도움말 / 로그아웃
 * - 수정사항: 상단 헤더에 뒤로가기 버튼 추가 및 제목을 가운데 정렬
 */
export default function SettingsScreen() {
  const { themed, theme, toggleTheme, setAppColor, appColor } = useAppTheme();
  const router = useRouter();
  const { switchLanguage, currentLanguage } = useTranslation();
  // 전역 AuthContext 사용: 로컬 currentUser 상태 제거
  const { user: currentUser, signOut } = useAuth();

  // 펼쳐진 설정 섹션 상태
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  /**
   * 현재 사용자 세션 불러오기
   */
  // (제거됨) 개별 세션 로드 useEffect: AuthProvider가 이미 부트스트랩 처리

  /**
   * 로그아웃 처리
   */
  const handleLogout = async (): Promise<void> => {
    try {
      await signOut();
      showToast({
        type: "success",
        title: "로그아웃 성공",
        message: "로그아웃이 완료되었습니다.",
      });
      router.push("/feed");
    } catch (error) {
      console.error("로그아웃 중 오류 발생:", error);
      showToast({
        type: "error",
        title: "로그아웃 실패",
        message: "로그아웃 처리 중 오류가 발생했습니다.",
      });
    }
  };

  /**
   * 도움말 (향후 확장)
   */
  const handleHelp = (): void => {
    // TODO: 도움말 화면 이동
    //console.log("도움말 진입 예정");
  };

  /**
   * 드롭다운(아코디언) 토글
   */
  const toggleSection = (section: string): void => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSection(expandedSection === section ? null : section);
  };

  /**
   * 언어 선택
   */
  const handleLanguageSelect = (language: "ko" | "en"): void => {
    switchLanguage(language);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSection(null);
  };

  /**
   * 앱 대표 색상 선택
   */
  const handleAppColorSelect = (color: string): void => {
    setAppColor(color as any);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSection(null);
  };

  return (
    <View style={themed($container)}>
      {/* ---------- 헤더: 뒤로가기 + 제목 중앙 정렬 ---------- */}
      <View style={themed($header)}>
        {/* 뒤로가기 버튼 (좌측) */}
        <TouchableOpacity
          style={themed($headerSide)}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="뒤로가기"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>

        {/* 중앙 제목 (flex:1 로 정확히 가운데 정렬) */}
        <Text style={themed($headerTitle)}>설정</Text>

        {/* 우측 더미 영역: 좌측 버튼과 폭 균형 맞춰 제목을 시각적으로 정확히 중앙에 고정 */}
        <View style={themed($headerSide)} />
      </View>
      {/* ---------- /헤더 ---------- */}

      {/* 설정 메뉴 컨테이너 */}
      <View style={themed($menuContainer)}>
        {/* 테마 설정 */}
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

        {/* 언어 설정 */}
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

        {/* 앱 색상 설정 */}
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

        {/* 도움말 */}
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

        {/* 로그아웃 */}
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

/* -------------------------------------------------
 * 유틸: 색상 이름 → 실제 HEX/RGB 값
 * ------------------------------------------------- */
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

/* -------------------------------------------------
 * 유틸: 색상 이름 → 한국어 표현
 * ------------------------------------------------- */
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

/**
 * 고정(비테마) 스타일: 미세 색상 미리보기
 */
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

/* -------------------------------------------------
 * Themed 스타일
 * ------------------------------------------------- */
const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
});

/**
 * 헤더: 좌/우 동일 폭 영역 확보 후 가운데 제목 배치
 */
const $header: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.lg,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

/**
 * 좌/우 사이드 영역 (너비 고정)
 */
const $headerSide: ThemedStyle<ViewStyle> = () => ({
  width: 44,
  justifyContent: "center",
  alignItems: "flex-start",
});

/**
 * 중앙 제목
 */
const $headerTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  flex: 1,
  textAlign: "center",
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
  paddingLeft: 54, // 아이콘 영역 정렬
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

// commit: feat(fe): 설정 화면 헤더에 뒤로가기 버튼 추가 및 제목 중앙 정렬
