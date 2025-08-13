import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import type { ShopItemData } from "./ShopModal";

interface ShopItemProps {
  item: ShopItemData;
  onPurchase: () => void;
  isPurchasing: boolean;
  canAfford: boolean;
}

/**
 * 상점 아이템 컴포넌트
 * 개별 상점 아이템을 표시하고 구매 기능을 제공합니다
 */
export default function ShopItem({
  item,
  onPurchase,
  isPurchasing,
  canAfford,
}: ShopItemProps) {
  const { themed, theme } = useAppTheme();

  // 희귀도별 색상 매핑
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "common":
        return "#9CA3AF"; // 회색
      case "rare":
        return "#3B82F6"; // 파란색
      case "epic":
        return "#8B5CF6"; // 보라색
      case "legendary":
        return "#F59E0B"; // 황금색
      default:
        return theme.colors.textDim;
    }
  };

  // 카테고리별 배경 그라데이션
  const getCategoryGradient = (category: string) => {
    switch (category) {
      case "decoration":
        return "#FF6B9D20"; // 핑크
      case "boost":
        return "#4ECDC420"; // 청록색
      case "premium":
        return "#FFD93D20"; // 황금색
      case "special":
        return "#A8E6CF20"; // 민트색
      default:
        return theme.colors.backgroundAlt;
    }
  };

  const finalPrice = item.discount
    ? Math.floor(item.price * (1 - item.discount / 100))
    : item.price;

  const rarityColor = getRarityColor(item.rarity);
  const categoryBg = getCategoryGradient(item.category);

  return (
    <View style={[themed($container), { backgroundColor: categoryBg }]}>
      {/* 할인 배지 */}
      {item.discount && (
        <View style={[themed($discountBadge), { backgroundColor: "#EF4444" }]}>
          <Text style={themed($discountText)}>-{item.discount}%</Text>
        </View>
      )}

      {/* 희귀도 인디케이터 */}
      <View
        style={[themed($rarityIndicator), { backgroundColor: rarityColor }]}
      />

      {/* 아이템 아이콘 */}
      <View style={themed($iconContainer)}>
        <Text style={themed($icon)}>{item.icon}</Text>
      </View>

      {/* 아이템 정보 */}
      <View style={themed($content)}>
        <Text style={themed($name)} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={themed($description)} numberOfLines={2}>
          {item.description}
        </Text>

        {/* 가격 정보 */}
        <View style={themed($priceContainer)}>
          {item.discount ? (
            <>
              <Text style={themed($originalPrice)}>{item.price}P</Text>
              <Text style={themed($finalPrice)}>{finalPrice}P</Text>
            </>
          ) : (
            <Text style={themed($finalPrice)}>{item.price}P</Text>
          )}
        </View>
      </View>

      {/* 구매 버튼 */}
      <TouchableOpacity
        style={[
          themed($purchaseButton),
          !canAfford && themed($purchaseButtonDisabled),
          !item.isAvailable && themed($purchaseButtonUnavailable),
        ]}
        onPress={onPurchase}
        disabled={!canAfford || !item.isAvailable || isPurchasing}
        activeOpacity={0.7}
      >
        {isPurchasing ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <>
            <Ionicons
              name={canAfford ? "card-outline" : "lock-closed-outline"}
              size={16}
              color="white"
            />
            <Text style={themed($purchaseButtonText)}>
              {!item.isAvailable ? "품절" : !canAfford ? "포인트 부족" : "구매"}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

// 스타일 정의
const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.card,
  borderRadius: 16,
  padding: spacing.md,
  borderWidth: 1,
  borderColor: colors.border,
  position: "relative",
  overflow: "hidden",
});

const $discountBadge: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  position: "absolute",
  top: spacing.sm,
  right: spacing.sm,
  paddingHorizontal: spacing.xs,
  paddingVertical: 2,
  borderRadius: 8,
  zIndex: 1,
});

const $discountText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 10,
  fontWeight: "700",
});

const $rarityIndicator: ThemedStyle<ViewStyle> = () => ({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  height: 3,
});

const $iconContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  marginBottom: spacing.sm,
});

const $icon: ThemedStyle<TextStyle> = () => ({
  fontSize: 32,
});

const $content: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  marginBottom: spacing.sm,
});

const $name: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 16,
  fontWeight: "700",
  color: colors.text,
  marginBottom: spacing.xs,
});

const $description: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 12,
  color: colors.textDim,
  lineHeight: 16,
  marginBottom: spacing.sm,
});

const $priceContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
});

const $originalPrice: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
  textDecorationLine: "line-through",
});

const $finalPrice: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  fontWeight: "800",
  color: colors.tint,
});

const $purchaseButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: colors.tint,
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  borderRadius: 12,
  gap: spacing.xs,
});

const $purchaseButtonDisabled: ThemedStyle<ViewStyle> = () => ({
  backgroundColor: "#9CA3AF",
});

const $purchaseButtonUnavailable: ThemedStyle<ViewStyle> = () => ({
  backgroundColor: "#EF4444",
});

const $purchaseButtonText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 14,
  fontWeight: "600",
});
