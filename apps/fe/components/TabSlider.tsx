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
  /**
   * variant:
   * - default: 기존 피드 영역 사용 (배경 + 경계선 포함)
   * - header: FeedHeader 내부 임베드용 (투명 / 더 낮은 높이 / 여백 최소화)
   */
  variant?: "default" | "header";
  /**
   * 세밀한 높이 조정이 필요한 경우(옵션)
   * variant에 따른 기본값이 우선이며, height가 넘어오면 그것을 강제 적용
   */
  height?: number;
}

/**
 * 슬라이드 탭 컴포넌트
 * Feed 와 Chat 탭 등 전환 슬라이더
 * header variant 추가로 헤더 내부에서도 재사용 가능
 */
export default function TabSlider({
  tabs,
  activeTab,
  onTabChange,
  variant = "default",
  height,
}: TabSliderProps) {
  const { themed, theme } = useAppTheme();
  // Reanimated 기반 진행도 값 (현재 활성 탭의 인덱스)
  const progress = useSharedValue(0);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  // variant 파생 값
  const isHeader = variant === "header";
  // header 에서 기본 높이 축소 (기존 42 → 34)
  const effectiveHeight = height ?? (isHeader ? 34 : 42);

  /**
   * 탭 변경 핸들러
   * - progress SharedValue 를 스프링 애니메이션으로 이동
   */
  const handleTabPress = useCallback(
    (tabKey: string, index: number) => {
      onTabChange(tabKey);
      progress.value = withSpring(index, {
        damping: 18,
        stiffness: 180,
        mass: 0.8,
      });
    },
    [onTabChange, progress],
  );

  const activeIndex = tabs.findIndex((tab) => tab.key === activeTab);

  // 외부 activeTab 변경 동기화
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

  // 활성 탭 배경(pill) 인디케이터 애니메이션 스타일
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
    <View
      style={[
        themed($container),
        // header 변형: 여백/배경/보더 최소화
        isHeader && {
          paddingHorizontal: 0,
          paddingTop: 0,
          backgroundColor: "transparent",
          borderBottomWidth: 0,
        },
      ]}
    >
      <View
        style={[
          themed($segmentWrapper),
          {
            height: effectiveHeight,
          },
          isHeader && {
            marginBottom: 0,
            backgroundColor: theme.colors.backgroundAlt, // 헤더 배경과 자연스럽게
            borderWidth: 0,
            padding: 2,
          },
        ]}
        onLayout={onSegmentLayout}
      >
        {/* 이동형 배경 인디케이터 */}
        <Animated.View
          style={[
            themed($indicator),
            indicatorStyle,
            isHeader && {
              // 헤더에서는 시각적 간섭 최소화를 위해 연한 투명도
              top: 2,
              bottom: 2,
              backgroundColor: theme.colors.tint,
              opacity: 0.12,
            },
          ]}
          pointerEvents="none"
        />

        {/* 탭 버튼들 */}
        {tabs.map((tab, index) => {
          const animatedTextStyle = useAnimatedStyle(() => {
            // 색상 보간: 현재 index 중심으로 active 색 강조
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
              style={[
                themed($tab),
                isHeader && { paddingHorizontal: 4 }, // 헤더 내 tighter spacing
              ]}
              onPress={() => handleTabPress(tab.key, index)}
              accessibilityRole="button"
            >
              <Animated.Text
                style={[
                  themed($tabText),
                  animatedTextStyle,
                  {
                    fontWeight: activeIndex === index ? "700" : "500",
                    fontSize: isHeader ? 14 : 16,
                  },
                ]}
              >
                {tab.title}
              </Animated.Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// --- 스타일 정의 (기본 variant 기준) ---
const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.backgroundAlt,
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.xxs,
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
  height: 42, // variant=default 에서만 의미. header 는 override
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
//
// 변경 사항 요약:
// - variant(header) 추가로 FeedHeader 내 임베딩 가능
// - 높이/여백/색상 동적 제어
// - height prop 제공 (필요시 세밀 조정)
// - 기존 구조/애니메이션 영향 없음
//
// 커밋 메세지: feat(TabSlider): header variant 추가 및 높이/스타일 동적 지원
