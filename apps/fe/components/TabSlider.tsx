import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  ViewStyle,
  TextStyle,
} from "react-native";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";

interface Tab {
  key: string;
  title: string;
}

interface TabSliderProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabKey: string) => void;
}

/**
 * 슬라이드 탭 컴포넌트
 * Feed와 Chat 탭을 전환할 수 있는 슬라이더
 */
export default function TabSlider({
  tabs,
  activeTab,
  onTabChange,
}: TabSliderProps) {
  const { themed, theme } = useAppTheme();
  const [indicatorAnimation] = useState(new Animated.Value(0));

  /**
   * 탭 변경 핸들러
   */
  const handleTabPress = (tabKey: string, index: number) => {
    onTabChange(tabKey);

    // 인디케이터 애니메이션
    Animated.spring(indicatorAnimation, {
      toValue: index,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  };

  const activeIndex = tabs.findIndex((tab) => tab.key === activeTab);

  return (
    <View style={themed($container)}>
      <View style={themed($tabContainer)}>
        {tabs.map((tab, index) => (
          <TouchableOpacity
            key={tab.key}
            style={themed($tab)}
            onPress={() => handleTabPress(tab.key, index)}
          >
            <Text
              style={[
                themed($tabText),
                {
                  color:
                    activeTab === tab.key
                      ? theme.colors.text
                      : theme.colors.textDim,
                  fontWeight: activeTab === tab.key ? "700" : "500",
                },
              ]}
            >
              {tab.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 활성 탭 인디케이터 */}
      <Animated.View
        style={[
          themed($indicator),
          {
            left: indicatorAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: ["0%", "50%"],
            }),
          },
        ]}
      />
    </View>
  );
}

// --- 스타일 정의 ---
const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  paddingHorizontal: spacing.md,
  paddingTop: spacing.sm,
  position: "relative",
});

const $tabContainer: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  justifyContent: "space-around",
});

const $tab: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  alignItems: "center",
  paddingVertical: spacing.md,
});

const $tabText: ThemedStyle<TextStyle> = () => ({
  fontSize: 16,
  textAlign: "center",
});

const $indicator: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: "absolute",
  bottom: 0,
  width: "50%",
  height: 3,
  backgroundColor: colors.text,
  borderRadius: 2,
});
