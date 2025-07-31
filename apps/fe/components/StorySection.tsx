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
 * 개별 스토리 아이템 컴포넌트 (고정 크기 적용)
 */
const StoryItem = ({ story }: { story: Story }) => {
  const { themed } = useAppTheme();

  return (
    <TouchableOpacity style={themed($storyItem)}>
      <View style={themed($storyImageContainer)}>
        <Image
          source={{ uri: story.avatar }}
          style={themed($storyImage)}
          resizeMode="cover"
          onError={() =>
            console.warn(`Failed to load story image: ${story.avatar}`)
          }
          // iOS 성능 최적화
          fadeDuration={200}
          loadingIndicatorSource={{
            uri: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
          }}
        />
        {story.timestamp === "Live" && (
          <View style={themed($liveIndicator)}>
            <Text style={themed($liveText)}>LIVE</Text>
          </View>
        )}
      </View>
      <View style={themed($storyInfo)}>
        <Text style={themed($storyUsername)} numberOfLines={1}>
          {story.username}
        </Text>
        <Text style={themed($storyTimestamp)}>{story.timestamp}</Text>
      </View>
    </TouchableOpacity>
  );
};

/**
 * 스토리 섹션 컴포넌트
 * 가로 스크롤로 스포츠/e스포츠 주요 소식 및 사용자 스토리를 표시
 */
export default function StorySection({ stories }: StorySectionProps) {
  const { themed } = useAppTheme();

  // 기본 스토리 데이터 (스포츠/e스포츠 주요 소식)
  const defaultStories: Story[] = [
    {
      id: "1",
      username: "World Cup 2023",
      avatar:
        "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=735&auto=format&fit=crop",
      timestamp: "Live",
    },
    {
      id: "2",
      username: "NBA Finals",
      avatar:
        "https://images.unsplash.com/photo-1518406432532-9cbef5697723?q=80&w=735&auto=format&fit=crop",
      timestamp: "2h",
    },
    {
      id: "3",
      username: "League of Legends",
      avatar:
        "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1470&auto=format&fit=crop",
      timestamp: "4h",
    },
    {
      id: "4",
      username: "Premier League",
      avatar:
        "https://images.unsplash.com/photo-1590761799834-6e87176323df?q=80&w=1473&auto=format&fit=crop",
      timestamp: "Today",
    },
  ];

  const displayStories = stories || defaultStories;

  return (
    <View style={themed($container)}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={themed($scrollContent)}
      >
        {displayStories.map((story) => (
          <StoryItem key={story.id} story={story} />
        ))}
      </ScrollView>
    </View>
  );
}

// --- 스타일 정의 ---
const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.backgroundAlt,
  paddingVertical: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
  marginBottom: spacing.sm,
});

const $scrollContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.sm,
  // gap 제거 - marginRight로 간격 조정
});

const $liveIndicator: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  position: "absolute",
  top: spacing.xs,
  right: spacing.xs,
  backgroundColor: colors.energy,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xxxs,
  borderRadius: 4,
});

const $liveText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 10,
  fontWeight: "800",
  letterSpacing: 0.5,
});

const $storyItem: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  alignItems: "flex-start",
  width: 140, // 고정 너비
  height: 120, // 고정 높이
  marginRight: spacing.md, // 아이템 간 간격
  borderRadius: 12,
  overflow: "hidden",
  backgroundColor: colors.card,
  shadowColor: colors.shadowLight,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.2,
  shadowRadius: 5,
  elevation: 4,
  // iOS에서 더 나은 성능을 위한 추가 속성
  shouldRasterizeIOS: true,
  rasterizationScale: 2,
});

const $storyImageContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: "100%",
  height: 80, // 고정 높이로 변경
  overflow: "hidden",
  position: "relative",
  borderBottomWidth: 2,
  borderBottomColor: colors.tint,
});

const $storyImage: ThemedStyle<ImageStyle> = () => ({
  width: "100%",
  height: "100%",
  opacity: 0.9,
});

const $storyInfo: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  width: "100%",
  flex: 1, // 남은 공간 차지
  padding: spacing.sm,
  backgroundColor: colors.card,
  justifyContent: "center", // 세로 중앙 정렬
});

const $storyUsername: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12, // 폰트 크기 축소
  fontWeight: "700",
  color: colors.text,
  letterSpacing: 0.2,
});

const $storyTimestamp: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 10, // 폰트 크기 축소
  color: colors.accent,
  marginTop: 2,
  fontWeight: "500",
});
