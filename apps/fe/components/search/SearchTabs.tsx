import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  StyleSheet,
} from "react-native";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";

/**
 * 검색 탭 타입 정의
 */
export type SearchTabType = "popular" | "recent" | "profile";

/**
 * 검색 탭 속성 타입 정의
 */
interface SearchTabsProps {
  /**
   * 현재 선택된 탭
   */
  activeTab: SearchTabType;

  /**
   * 탭 변경 시 호출될 함수
   */
  onTabChange: (tab: SearchTabType) => void;
}

/**
 * 검색 탭 컴포넌트
 * 인기, 최근, 프로필 탭을 표시하고 전환 기능을 제공합니다.
 */
export default function SearchTabs({
  activeTab,
  onTabChange,
}: SearchTabsProps) {
  const { themed, theme } = useAppTheme();

  /**
   * 탭 선택 핸들러
   * @param tab 선택할 탭
   */
  const handleTabPress = (tab: SearchTabType) => {
    onTabChange(tab);
  };

  return (
    <View style={themed($tabContainer)}>
      <TabButton
        label="인기"
        active={activeTab === "popular"}
        onPress={() => handleTabPress("popular")}
        theme={theme}
      />
      <TabButton
        label="최근"
        active={activeTab === "recent"}
        onPress={() => handleTabPress("recent")}
        theme={theme}
      />
      <TabButton
        label="프로필"
        active={activeTab === "profile"}
        onPress={() => handleTabPress("profile")}
        theme={theme}
      />
    </View>
  );
}

/**
 * 탭 버튼 속성 타입 정의
 */
interface TabButtonProps {
  /**
   * 탭 라벨 텍스트
   */
  label: string;

  /**
   * 활성화 상태 여부
   */
  active: boolean;

  /**
   * 클릭 시 호출될 함수
   */
  onPress: () => void;

  /**
   * 현재 테마
   */
  theme: any;
}

/**
 * 탭 버튼 컴포넌트
 * 각 탭을 표시하는 버튼입니다.
 */
function TabButton({ label, active, onPress, theme }: TabButtonProps) {
  // 활성화 상태에 따른 스타일 적용
  const containerStyle = [
    styles.tabButton,
    active && { borderBottomColor: theme.colors.tint, borderBottomWidth: 2 },
  ];

  const textStyle = [
    styles.tabButtonText,
    {
      color: active ? theme.colors.tint : theme.colors.textDim,
      fontWeight: active ? "600" : "normal",
    },
  ];

  return (
    <TouchableOpacity style={containerStyle} onPress={onPress}>
      <Text style={textStyle}>{label}</Text>
    </TouchableOpacity>
  );
}

// --- 스타일 정의 ---
const $tabContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flexDirection: "row",
  borderBottomWidth: 1,
  borderBottomColor: colors.separator,
});

const styles = StyleSheet.create({
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderBottomWidth: 0,
  },
  tabButtonText: {
    fontSize: 14,
  },
});
