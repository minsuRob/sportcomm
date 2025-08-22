import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolateColor,
} from "react-native-reanimated";
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
  // Reanimated 기반 진행도 값 (현재 활성 탭의 인덱스)
  const progress = useSharedValue(0);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  /**
   * 탭 변경 핸들러
   */
  const handleTabPress = useCallback(
    (tabKey: string, index: number) => {
      onTabChange(tabKey);
      // 스프링 애니메이션으로 부드럽게 이동
      progress.value = withSpring(index, {
        damping: 18,
        stiffness: 180,
        mass: 0.8,
      });
    },
    [onTabChange, progress],
  );

  const activeIndex = tabs.findIndex((tab) => tab.key === activeTab);
  // 외부에서 activeTab이 바뀌는 경우 동기화
  useEffect(() => {
    progress.value = withSpring(activeIndex, {
      damping: 18,
      stiffness: 180,
      mass: 0.8,
    });
  }, [activeIndex, progress]);

  const onSegmentLayout = useCallback((e: any) => {
    setContainerWidth(e.nativeEvent.layout.width);
  }, []);

  const segmentWidth = useMemo(() => {
    if (tabs.length === 0) return 0;
    return containerWidth / tabs.length;
  }, [containerWidth, tabs.length]);

  // 활성 탭 배경( pill ) 인디케이터 애니메이션 스타일
  const indicatorStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: segmentWidth * progress.value,
        },
      ],
      width: Math.max(segmentWidth, 0),
    } as ViewStyle;
  }, [segmentWidth]);

  return (
    <View style={themed($container)}>
      <View style={themed($segmentWrapper)} onLayout={onSegmentLayout}>
        {/* 이동형 배경 인디케이터 */}
        <Animated.View
          style={[themed($indicator), indicatorStyle]}
          pointerEvents="none"
        />

        {/* 탭 버튼들 */}
        {tabs.map((tab, index) => {
          const animatedTextStyle = useAnimatedStyle(() => {
            // Pager-dots 예제의 색상 보간 아이디어 차용
            const activeColor = theme.colors.tint;
            const inactiveColor = theme.colors.textDim;
            return {
              color: interpolateColor(
                progress.value,
                [index - 1, index, index + 1],
                [inactiveColor, activeColor, inactiveColor],
              ),
            } as TextStyle;
          }, [index, theme.colors.tint, theme.colors.textDim]);

          return (
            <TouchableOpacity
              key={tab.key}
              style={themed($tab)}
              onPress={() => handleTabPress(tab.key, index)}
              accessibilityRole="button"
            >
              <Animated.Text
                style={[
                  themed($tabText),
                  animatedTextStyle,
                  { fontWeight: activeIndex === index ? "700" : "500" },
                ]}
              >
                {tab.title}
              </Animated.Text>
            </TouchableOpacity>
          );
        })}

        {/* onLayout은 상위 컨테이너에서 측정 */}
      </View>
    </View>
  );
}

// --- 스타일 정의 ---
const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.backgroundAlt,
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.sm,
  position: "relative",
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $segmentWrapper: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: colors.background,
  borderRadius: 9999,
  padding: 4,
  height: 42,
  marginBottom: spacing.sm,
  borderWidth: 1,
  borderColor: colors.border,
  overflow: "hidden",
});

const $tab: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
});

const $tabText: ThemedStyle<TextStyle> = () => ({
  fontSize: 16,
  textAlign: "center",
  letterSpacing: 0.5,
});

const $indicator: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: "absolute",
  left: 0,
  top: 4,
  bottom: 4,
  borderRadius: 9999,
  backgroundColor: colors.tint,
  opacity: 0.15,
});

// 레이아웃 프로브 제거: 웹에서 포인터 이벤트를 가로채는 문제 방지
