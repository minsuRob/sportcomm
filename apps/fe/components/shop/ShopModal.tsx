import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import type { User } from "@/lib/auth";
import ShopItem from "./ShopItem";
import AppDialog from "@/components/ui/AppDialog";

// 상점 아이템 타입 정의
export interface ShopItemData {
  id: string;
  name: string;
  description: string;
  price: number;
  category: "decoration" | "boost" | "premium" | "special";
  icon: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  isAvailable: boolean;
  discount?: number; // 할인율 (0-100)
}

interface ShopModalProps {
  visible: boolean;
  onClose: () => void;
  currentUser: User | null;
  onPurchase?: (item: ShopItemData) => Promise<void>;
}

// 상점 아이템 목록 (실제로는 API에서 가져올 데이터)
const SHOP_ITEMS: ShopItemData[] = [
  {
    id: "profile_frame_gold",
    name: "골드 프로필 테두리",
    description: "프로필에 고급스러운 골드 테두리를 추가합니다",
    price: 500,
    category: "decoration",
    icon: "🏆",
    rarity: "epic",
    isAvailable: true,
  },
  {
    id: "post_boost_3days",
    name: "게시물 부스트 (3일)",
    description: "게시물을 3일간 상단에 고정시킵니다",
    price: 200,
    category: "boost",
    icon: "🚀",
    rarity: "common",
    isAvailable: true,
    discount: 20,
  },
  {
    id: "premium_badge",
    name: "프리미엄 배지",
    description: "특별한 프리미엄 사용자 배지를 획득합니다",
    price: 1000,
    category: "premium",
    icon: "⭐",
    rarity: "legendary",
    isAvailable: true,
  },
  {
    id: "custom_emoji_pack",
    name: "커스텀 이모지 팩",
    description: "독점 이모지 20개를 사용할 수 있습니다",
    price: 300,
    category: "decoration",
    icon: "😎",
    rarity: "rare",
    isAvailable: true,
  },
  {
    id: "highlight_comment",
    name: "댓글 하이라이트",
    description: "댓글을 눈에 띄게 강조 표시합니다",
    price: 100,
    category: "boost",
    icon: "💬",
    rarity: "common",
    isAvailable: true,
  },
  {
    id: "team_supporter_badge",
    name: "팀 서포터 배지",
    description: "좋아하는 팀의 공식 서포터 배지를 획득합니다",
    price: 750,
    category: "special",
    icon: "🏅",
    rarity: "epic",
    isAvailable: true,
    discount: 15,
  },
];

/**
 * 상점 모달 컴포넌트
 * 사용자가 포인트로 다양한 아이템을 구매할 수 있는 상점 UI
 */
export default function ShopModal({
  visible,
  onClose,
  currentUser,
  onPurchase,
}: ShopModalProps) {
  const { themed, theme } = useAppTheme();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [purchasingItemId, setPurchasingItemId] = useState<string | null>(null);

  // 다이얼로그 상태
  const [showInsufficientPointsDialog, setShowInsufficientPointsDialog] =
    useState(false);
  const [showPurchaseConfirmDialog, setShowPurchaseConfirmDialog] =
    useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");
  const [selectedItem, setSelectedItem] = useState<ShopItemData | null>(null);

  const categories = [
    { key: "all", label: "전체", icon: "grid-outline" },
    { key: "decoration", label: "꾸미기", icon: "color-palette-outline" },
    { key: "boost", label: "부스트", icon: "trending-up-outline" },
    { key: "premium", label: "프리미엄", icon: "diamond-outline" },
    { key: "special", label: "특별", icon: "star-outline" },
  ];

  // 카테고리별 필터링
  const filteredItems = SHOP_ITEMS.filter(
    (item) => selectedCategory === "all" || item.category === selectedCategory,
  );

  // 구매 처리
  const handlePurchase = async (item: ShopItemData) => {
    if (!currentUser) return;

    const userPoints = currentUser.points ?? 0;
    const finalPrice = item.discount
      ? Math.floor(item.price * (1 - item.discount / 100))
      : item.price;

    if (userPoints < finalPrice) {
      setDialogMessage(
        `이 아이템을 구매하려면 ${finalPrice}P가 필요합니다.\n현재 보유: ${userPoints}P`,
      );
      setShowInsufficientPointsDialog(true);
      return;
    }

    setSelectedItem(item);
    setDialogMessage(`${item.name}을(를) ${finalPrice}P에 구매하시겠습니까?`);
    setShowPurchaseConfirmDialog(true);
  };

  // 구매 확인 처리
  const handleConfirmPurchase = async () => {
    if (!selectedItem || !onPurchase) return;

    setPurchasingItemId(selectedItem.id);
    setShowPurchaseConfirmDialog(false);

    try {
      await onPurchase(selectedItem);
      setDialogMessage(`${selectedItem.name}을(를) 성공적으로 구매했습니다!`);
      setShowSuccessDialog(true);
    } catch (error) {
      setDialogMessage("구매 중 오류가 발생했습니다.");
      setShowErrorDialog(true);
    } finally {
      setPurchasingItemId(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={themed($modalOverlay)}>
        <View style={themed($modalContent)}>
          {/* 헤더 */}
          <View style={themed($header)}>
            <View style={themed($headerLeft)}>
              <Text style={themed($title)}>상점</Text>
              <Text style={themed($subtitle)}>
                포인트로 특별한 아이템을 구매하세요
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={themed($closeButton)}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* 포인트 잔액 */}
          <View style={themed($balanceSection)}>
            <View style={themed($balanceCard)}>
              <Text style={themed($balanceLabel)}>보유 포인트</Text>
              <Text style={themed($balanceAmount)}>
                {currentUser?.points ?? 0}P
              </Text>
            </View>
          </View>

          {/* 카테고리 탭 */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={themed($categoryTabs)}
            contentContainerStyle={themed($categoryTabsContent)}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category.key}
                style={[
                  themed($categoryTab),
                  selectedCategory === category.key &&
                    themed($categoryTabActive),
                ]}
                onPress={() => setSelectedCategory(category.key)}
              >
                <Ionicons
                  name={category.icon as any}
                  size={18}
                  color={
                    selectedCategory === category.key
                      ? theme.colors.tint
                      : theme.colors.textDim
                  }
                />
                <Text
                  style={[
                    themed($categoryTabText),
                    selectedCategory === category.key &&
                      themed($categoryTabTextActive),
                  ]}
                >
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* 상품 목록 */}
          <ScrollView style={themed($itemsContainer)}>
            <View style={themed($itemsGrid)}>
              {filteredItems.map((item) => (
                <ShopItem
                  key={item.id}
                  item={item}
                  onPurchase={() => handlePurchase(item)}
                  isPurchasing={purchasingItemId === item.id}
                  canAfford={
                    (currentUser?.points ?? 0) >=
                    (item.discount
                      ? Math.floor(item.price * (1 - item.discount / 100))
                      : item.price)
                  }
                />
              ))}
            </View>
          </ScrollView>
        </View>
      </View>

      {/* 포인트 부족 다이얼로그 */}
      <AppDialog
        visible={showInsufficientPointsDialog}
        onClose={() => setShowInsufficientPointsDialog(false)}
        title="포인트 부족"
        description={dialogMessage}
        confirmText="확인"
        onConfirm={() => setShowInsufficientPointsDialog(false)}
      />

      {/* 구매 확인 다이얼로그 */}
      <AppDialog
        visible={showPurchaseConfirmDialog}
        onClose={() => setShowPurchaseConfirmDialog(false)}
        title="구매 확인"
        description={dialogMessage}
        confirmText="구매"
        cancelText="취소"
        onConfirm={handleConfirmPurchase}
      />

      {/* 구매 성공 다이얼로그 */}
      <AppDialog
        visible={showSuccessDialog}
        onClose={() => setShowSuccessDialog(false)}
        title="구매 완료"
        description={dialogMessage}
        confirmText="확인"
        onConfirm={() => setShowSuccessDialog(false)}
      />

      {/* 구매 실패 다이얼로그 */}
      <AppDialog
        visible={showErrorDialog}
        onClose={() => setShowErrorDialog(false)}
        title="구매 실패"
        description={dialogMessage}
        confirmText="확인"
        onConfirm={() => setShowErrorDialog(false)}
      />
    </Modal>
  );
}

// 스타일 정의
const $modalOverlay: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  backgroundColor: "rgba(0, 0, 0, 0.6)",
  justifyContent: "flex-end",
  alignItems: "center", // 넓은 화면에서 콘텐츠를 가로 중앙 정렬
});

const $modalContent: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.background,
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  maxHeight: "90%",
  minHeight: "70%",
  // 웹/와이드 화면에서 중앙 정렬 및 최대 너비 제한
  width: "100%",
  maxWidth: 640,
  alignSelf: "center",
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

const $balanceSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
});

const $balanceCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.tint + "15",
  borderRadius: 16,
  padding: spacing.lg,
  alignItems: "center",
  borderWidth: 1,
  borderColor: colors.tint + "30",
});

const $balanceLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
  fontWeight: "600",
  marginBottom: 4,
});

const $balanceAmount: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 28,
  fontWeight: "900",
  color: colors.tint,
});

const $categoryTabs: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  // 가로 스크롤 바 컨테이너 - 불필요한 세로 확장 방지
  paddingHorizontal: spacing.lg,
  marginBottom: spacing.md,
  flexGrow: 0,
  flexShrink: 0,
  // 웹 환경에서 height 늘어나는 케이스 대응 (auto 비슷한 효과)
  alignSelf: "flex-start",
  // 배경 추가시 카드처럼 보이도록 할 수도 있으나 현재는 투명 유지
  // backgroundColor: colors.backgroundAlt,
});

const $categoryTabsContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
  flexDirection: "row",
  alignItems: "center",
  flexWrap: "nowrap",
  paddingVertical: 0,
});

const $categoryTab: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderRadius: 20,
  backgroundColor: colors.backgroundAlt,
  gap: spacing.xs,
  alignSelf: "flex-start", // 세로 방향으로 늘어나지 않도록 고정
});

const $categoryTabActive: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tint + "20",
  borderWidth: 1,
  borderColor: colors.tint + "40",
});

const $categoryTabText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  fontWeight: "600",
  color: colors.textDim,
});

const $categoryTabTextActive: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
});

const $itemsContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $itemsGrid: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingBottom: spacing.xl,
  gap: spacing.md,
});
