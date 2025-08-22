import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";

// 채팅 옵션 타입 정의
export interface ChatOption {
  id: string;
  type: "emoji" | "sticker" | "effect" | "template";
  content: string;
  label?: string;
  category: string;
}

interface ChatOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectOption: (option: ChatOption) => void;
}

// 이모지 데이터
const EMOJI_DATA: ChatOption[] = [
  // 감정 표현
  { id: "happy", type: "emoji", content: "😊", category: "emotion" },
  { id: "love", type: "emoji", content: "😍", category: "emotion" },
  { id: "laugh", type: "emoji", content: "😂", category: "emotion" },
  { id: "cool", type: "emoji", content: "😎", category: "emotion" },
  { id: "wink", type: "emoji", content: "😉", category: "emotion" },
  { id: "sad", type: "emoji", content: "😢", category: "emotion" },
  { id: "angry", type: "emoji", content: "😠", category: "emotion" },
  { id: "surprised", type: "emoji", content: "😲", category: "emotion" },

  // 스포츠 관련
  { id: "soccer", type: "emoji", content: "⚽", category: "sports" },
  { id: "basketball", type: "emoji", content: "🏀", category: "sports" },
  { id: "baseball", type: "emoji", content: "⚾", category: "sports" },
  { id: "trophy", type: "emoji", content: "🏆", category: "sports" },
  { id: "medal", type: "emoji", content: "🥇", category: "sports" },
  { id: "fire", type: "emoji", content: "🔥", category: "sports" },
  { id: "clap", type: "emoji", content: "👏", category: "sports" },
  { id: "muscle", type: "emoji", content: "💪", category: "sports" },
  { id: "lightning", type: "emoji", content: "⚡", category: "sports" },
  { id: "target", type: "emoji", content: "🎯", category: "sports" },
  { id: "rocket", type: "emoji", content: "🚀", category: "sports" },
  { id: "star", type: "emoji", content: "⭐", category: "sports" },

  // 제스처
  { id: "thumbs_up", type: "emoji", content: "👍", category: "gesture" },
  { id: "thumbs_down", type: "emoji", content: "👎", category: "gesture" },
  { id: "ok_hand", type: "emoji", content: "👌", category: "gesture" },
  { id: "peace", type: "emoji", content: "✌️", category: "gesture" },
  { id: "wave", type: "emoji", content: "👋", category: "gesture" },
  { id: "pray", type: "emoji", content: "🙏", category: "gesture" },
];

// 스티커 데이터 (이미지 대신 이모지로 대체)
const STICKER_DATA: ChatOption[] = [
  {
    id: "cute_1",
    type: "sticker",
    content: "🐻",
    label: "곰돌이",
    category: "cute",
  },
  {
    id: "cute_2",
    type: "sticker",
    content: "🐱",
    label: "고양이",
    category: "cute",
  },
  {
    id: "cute_3",
    type: "sticker",
    content: "🐶",
    label: "강아지",
    category: "cute",
  },
  {
    id: "cute_4",
    type: "sticker",
    content: "🐰",
    label: "토끼",
    category: "cute",
  },
  {
    id: "cute_5",
    type: "sticker",
    content: "🐼",
    label: "판다",
    category: "cute",
  },
  {
    id: "cute_6",
    type: "sticker",
    content: "🦊",
    label: "여우",
    category: "cute",
  },

  {
    id: "sport_1",
    type: "sticker",
    content: "⚽",
    label: "축구공",
    category: "sports",
  },
  {
    id: "sport_2",
    type: "sticker",
    content: "🏀",
    label: "농구공",
    category: "sports",
  },
  {
    id: "sport_3",
    type: "sticker",
    content: "🏆",
    label: "우승컵",
    category: "sports",
  },
  {
    id: "sport_4",
    type: "sticker",
    content: "🥇",
    label: "금메달",
    category: "sports",
  },
  {
    id: "sport_5",
    type: "sticker",
    content: "🔥",
    label: "파이어",
    category: "sports",
  },
  {
    id: "sport_6",
    type: "sticker",
    content: "⚡",
    label: "번개",
    category: "sports",
  },
  {
    id: "sport_7",
    type: "sticker",
    content: "🎯",
    label: "타겟",
    category: "sports",
  },
  {
    id: "sport_8",
    type: "sticker",
    content: "🏃",
    label: "달리기",
    category: "sports",
  },

  // 음식 스티커
  {
    id: "food_1",
    type: "sticker",
    content: "🍕",
    label: "피자",
    category: "food",
  },
  {
    id: "food_2",
    type: "sticker",
    content: "🍔",
    label: "햄버거",
    category: "food",
  },
  {
    id: "food_3",
    type: "sticker",
    content: "🍟",
    label: "감자튀김",
    category: "food",
  },
  {
    id: "food_4",
    type: "sticker",
    content: "🍗",
    label: "치킨",
    category: "food",
  },
];

// 특수 효과 템플릿
const EFFECT_DATA: ChatOption[] = [
  {
    id: "sparkle",
    type: "effect",
    content: "✨",
    label: "반짝반짝",
    category: "effect",
  },
  {
    id: "rainbow",
    type: "effect",
    content: "🌈",
    label: "무지개",
    category: "effect",
  },
  {
    id: "star",
    type: "effect",
    content: "⭐",
    label: "별빛",
    category: "effect",
  },
  {
    id: "heart",
    type: "effect",
    content: "💖",
    label: "하트",
    category: "effect",
  },
  {
    id: "boom",
    type: "effect",
    content: "💥",
    label: "폭발",
    category: "effect",
  },
  {
    id: "magic",
    type: "effect",
    content: "🪄",
    label: "마법",
    category: "effect",
  },
];

// 메시지 템플릿
const TEMPLATE_DATA: ChatOption[] = [
  {
    id: "cheer_1",
    type: "template",
    content: "화이팅! 💪",
    label: "응원",
    category: "cheer",
  },
  {
    id: "cheer_2",
    type: "template",
    content: "잘했어! 👏",
    label: "칭찬",
    category: "cheer",
  },
  {
    id: "cheer_3",
    type: "template",
    content: "대박! 🔥",
    label: "감탄",
    category: "cheer",
  },
  {
    id: "cheer_4",
    type: "template",
    content: "최고야! ⭐",
    label: "최고",
    category: "cheer",
  },
  {
    id: "cheer_5",
    type: "template",
    content: "멋져! 😎",
    label: "멋짐",
    category: "cheer",
  },
  {
    id: "cheer_6",
    type: "template",
    content: "굿! 👍",
    label: "좋음",
    category: "cheer",
  },
  {
    id: "cheer_7",
    type: "template",
    content: "완벽해! ✨",
    label: "완벽",
    category: "cheer",
  },
  {
    id: "cheer_8",
    type: "template",
    content: "레전드! 🏆",
    label: "레전드",
    category: "cheer",
  },

  // 인사 메시지
  {
    id: "greeting_1",
    type: "template",
    content: "안녕하세요! 👋",
    label: "인사",
    category: "greeting",
  },
  {
    id: "greeting_2",
    type: "template",
    content: "좋은 하루! ☀️",
    label: "좋은하루",
    category: "greeting",
  },
  {
    id: "greeting_3",
    type: "template",
    content: "수고하세요! 💼",
    label: "수고",
    category: "greeting",
  },
  {
    id: "greeting_4",
    type: "template",
    content: "잘 자요! 🌙",
    label: "잘자요",
    category: "greeting",
  },

  // 감사 메시지
  {
    id: "thanks_1",
    type: "template",
    content: "고마워요! 🙏",
    label: "감사",
    category: "thanks",
  },
  {
    id: "thanks_2",
    type: "template",
    content: "정말 감사합니다! ❤️",
    label: "진심감사",
    category: "thanks",
  },
  {
    id: "thanks_3",
    type: "template",
    content: "도움 주셔서 감사해요! 🤝",
    label: "도움감사",
    category: "thanks",
  },
];

/**
 * 채팅 옵션 모달 컴포넌트
 * 이모지, 스티커, 효과, 템플릿 등을 선택할 수 있는 하단 모달
 */
export default function ChatOptionsModal({
  visible,
  onClose,
  onSelectOption,
}: ChatOptionsModalProps) {
  const { themed, theme } = useAppTheme();
  const [selectedTab, setSelectedTab] = useState<string>("emoji");

  const tabs = [
    { key: "emoji", label: "이모지", icon: "happy-outline", data: EMOJI_DATA },
    {
      key: "sticker",
      label: "스티커",
      icon: "image-outline",
      data: STICKER_DATA,
    },
    {
      key: "effect",
      label: "효과",
      icon: "sparkles-outline",
      data: EFFECT_DATA,
    },
    {
      key: "template",
      label: "템플릿",
      icon: "chatbubble-outline",
      data: TEMPLATE_DATA,
    },
  ];

  const currentTab = tabs.find((tab) => tab.key === selectedTab);
  const currentData = currentTab?.data || [];

  // 카테고리별 그룹화
  const groupedData = currentData.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<string, ChatOption[]>,
  );

  const handleSelectOption = (option: ChatOption) => {
    onSelectOption(option);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={themed($modalOverlay)}>
        <View style={themed($modalContent)}>
          {/* 헤더 */}
          <View style={themed($header)}>
            <View style={themed($headerLeft)}>
              <Text style={themed($title)}>채팅 옵션</Text>
              <Text style={themed($subtitle)}>
                메시지를 더 재미있게 꾸며보세요
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={themed($closeButton)}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* 탭 네비게이션 */}
          <View style={themed($tabContainer)}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[
                  themed($tab),
                  selectedTab === tab.key && themed($tabActive),
                ]}
                onPress={() => setSelectedTab(tab.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={20}
                  color={
                    selectedTab === tab.key
                      ? theme.colors.tint
                      : theme.colors.textDim
                  }
                />
                <Text
                  style={[
                    themed($tabText),
                    selectedTab === tab.key && themed($tabTextActive),
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 콘텐츠 영역 */}
          <ScrollView style={themed($contentContainer)}>
            {Object.entries(groupedData).map(([category, items]) => (
              <View key={category} style={themed($categorySection)}>
                <Text style={themed($categoryTitle)}>
                  {getCategoryLabel(category)}
                </Text>
                <View style={themed($itemsGrid)}>
                  {items.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={themed($optionItem)}
                      onPress={() => handleSelectOption(item)}
                      activeOpacity={0.7}
                    >
                      <Text style={themed($optionContent)}>{item.content}</Text>
                      {item.label && (
                        <Text style={themed($optionLabel)} numberOfLines={1}>
                          {item.label}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// 카테고리 라벨 매핑
function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    emotion: "감정 표현",
    sports: "스포츠",
    gesture: "제스처",
    cute: "귀여운",
    food: "음식",
    effect: "특수 효과",
    cheer: "응원 메시지",
    greeting: "인사",
    thanks: "감사",
  };
  return labels[category] || category;
}

// 스타일 정의
const $modalOverlay: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  backgroundColor: "rgba(0, 0, 0, 0.6)",
  justifyContent: "flex-end",
});

const $modalContent: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.background,
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  maxHeight: "75%",
  minHeight: "60%",
});

const $header: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-start",
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.lg,
  paddingBottom: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $headerLeft: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $title: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 24,
  fontWeight: "800",
  color: colors.text,
  marginBottom: 4,
});

const $subtitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
  fontWeight: "500",
});

const $closeButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.sm,
  marginTop: -spacing.sm,
});

const $tabContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $tab: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.xs,
  borderRadius: 12,
  gap: spacing.xs,
});

const $tabActive: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tint + "15",
});

const $tabText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  fontWeight: "600",
  color: colors.textDim,
});

const $tabTextActive: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
});

const $contentContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $categorySection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
});

const $categoryTitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 16,
  fontWeight: "700",
  color: colors.text,
  marginBottom: spacing.sm,
});

const $itemsGrid: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.sm,
  justifyContent: "space-between",
});

const $optionItem: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: colors.card,
  borderRadius: 16,
  padding: spacing.md,
  width: "18%", // 한 줄에 5개씩 배치
  aspectRatio: 1,
  borderWidth: 1,
  borderColor: colors.border,
  shadowColor: colors.text,
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 2,
  elevation: 2,
});

const $optionContent: ThemedStyle<TextStyle> = () => ({
  fontSize: 28,
  marginBottom: 2,
});

const $optionLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 9,
  fontWeight: "600",
  color: colors.textDim,
  textAlign: "center",
  lineHeight: 12,
});
