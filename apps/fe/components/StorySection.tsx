import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ViewStyle,
  TextStyle,
  ImageStyle,
} from "react-native";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";

/**
 * 스토리 데이터 타입
 */
interface Story {
  id: string;
  username: string;
  avatar: string;
  timestamp: string;
}

interface StorySectionProps {
  stories?: Story[];
}

/**
 * 상단 스토리 섹션 컴포넌트
 * 가로 스크롤로 사용자 스토리를 표시
 */
export default function StorySection({ stories }: StorySectionProps) {
  const { themed } = useAppTheme();

  // 기본 스토리 데이터 (Liam Carter, Olivia Bennett)
  const defaultStories: Story[] = [
    {
      id: "1",
      username: "Liam Carter",
      avatar:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuBAs31Z9e7tE4MEe4qOvL8tmInV3OnopXRbbPUHDNNX03bqTEq8OptDvE69aED3dCTsdjrOwx-hh1WXCjmg5AYjZlUdYzfIIRgWjRUH-M9jwhugMxisjA2Z2Hd4ajK0GpMA-fJeZFJtEKyQiIn9dx72icpJF4oCeubT-vK2wYemuAfrGCJ7rPocUTEmkQX8nHZi448NpsOXSVMbeBOH4dfm6DlSZyuaL0ft8FIXoRor76NK0vugaMl5-BtfZCvuB-ZAfsCo_NUYfJ3k",
      timestamp: "2h",
    },
    {
      id: "2",
      username: "Olivia Bennett",
      avatar:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDbZAUqiC4EuK-5kdExi0PpejzCUG3G89OwPLNFJ1mxN3M3bNOuduF4ANYhDPJsskNLf2HImBjTtrWjn0u13cWpSdzCLk-wcFqeIEgOlOa3TEPIrIm5fPTpNvGTA2yEZaI9OKliF5pN5UjidJO5mfGJIaAOlsIe-nwxrf2QcWP4L9eMura7Cs0ke5uqixuWYP6NgIZDClGPedAB5drBTgNRqVkGMdnaLXPV9xsR97aWRW_e2Hc1sWnzJEq0GcfI5g4TFywqcHShauI_",
      timestamp: "4h",
    },
  ];

  const displayStories = stories || defaultStories;

  /**
   * 스토리 아이템 렌더링
   */
  const renderStoryItem = (story: Story) => (
    <TouchableOpacity key={story.id} style={themed($storyItem)}>
      <View style={themed($storyImageContainer)}>
        <Image source={{ uri: story.avatar }} style={themed($storyImage)} />
      </View>
      <View style={themed($storyInfo)}>
        <Text style={themed($storyUsername)} numberOfLines={1}>
          {story.username}
        </Text>
        <Text style={themed($storyTimestamp)}>{story.timestamp}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={themed($container)}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={themed($scrollContent)}
      >
        {displayStories.map(renderStoryItem)}
      </ScrollView>
    </View>
  );
}

// --- 스타일 정의 ---
const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  paddingVertical: spacing.sm,
  borderBottomWidth: 1,
  borderBottomColor: colors.border + "30",
});

const $scrollContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  gap: spacing.sm,
});

const $storyItem: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "flex-start",
  minWidth: 120,
  marginRight: spacing.sm,
});

const $storyImageContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: "100%",
  aspectRatio: 16 / 9,
  borderRadius: 12,
  overflow: "hidden",
  position: "relative",
});

const $storyImage: ThemedStyle<ImageStyle> = () => ({
  width: "100%",
  height: "100%",
});

const $storyInfo: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.xs,
  width: "100%",
});

const $storyUsername: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  fontWeight: "600",
  color: colors.text,
});

const $storyTimestamp: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
  marginTop: 2,
});
