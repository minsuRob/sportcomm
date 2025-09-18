import React, { useState, useMemo } from "react";
/**
 * GraphQL 인벤토리/구매 연동 완료:
 * - 서버 인벤토리 조회: GET_MY_INVENTORY
 * - 구매 처리: PURCHASE_ITEM
 * - 실패 시 기존 포인트 차감 + 로컬 인벤토리 fallback
 */
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import type { User } from "@/lib/auth";
import ShopItem from "./ShopItem";
import AppDialog from "@/components/ui/AppDialog";
import { useMutation, useQuery } from "@apollo/client";
import { DEDUCT_USER_POINTS } from "@/lib/graphql/admin";
import { GET_MY_INVENTORY, PURCHASE_ITEM } from "@/lib/graphql/shop";
import { showToast } from "@/components/CustomToast";

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

// 포인트 이력 타입 정의
export enum PointHistoryType {
  EARN_ATTENDANCE = "EARN_ATTENDANCE", // 출석체크로 획득
  EARN_POST = "EARN_POST", // 게시글 작성으로 획득
  EARN_COMMENT = "EARN_COMMENT", // 댓글 작성으로 획득
  EARN_CHAT = "EARN_CHAT", // 채팅으로 획득
  SPEND_SHOP = "SPEND_SHOP", // 상점 구매로 소모
}

// 포인트 이력 인터페이스
export interface PointHistoryEntry {
  id: string;
  type: PointHistoryType;
  amount: number; // 포인트 양 (양수: 획득, 음수: 소모)
  description: string; // 상세 설명
  createdAt: Date; // 발생 시간
  referenceId?: string; // 관련 아이템/게시물 ID (옵션)
}

interface ShopModalProps {
  visible: boolean;
  onClose: () => void;
  currentUser: User | null;
  onPurchase?: (item: ShopItemData) => Promise<void>;
}

// 포인트 이력 헬퍼 함수들
const getPointHistoryInfo = (type: PointHistoryType) => {
  switch (type) {
    case PointHistoryType.EARN_ATTENDANCE:
      return {
        icon: "📅",
        label: "출석체크",
        color: "#4CAF50", // 초록색
        isEarn: true,
      };
    case PointHistoryType.EARN_POST:
      return {
        icon: "📝",
        label: "게시글 작성",
        color: "#2196F3", // 파란색
        isEarn: true,
      };
    case PointHistoryType.EARN_COMMENT:
      return {
        icon: "💬",
        label: "댓글 작성",
        color: "#FF9800", // 주황색
        isEarn: true,
      };
    case PointHistoryType.EARN_CHAT:
      return {
        icon: "🗨️",
        label: "채팅 참여",
        color: "#9C27B0", // 보라색
        isEarn: true,
      };
    case PointHistoryType.SPEND_SHOP:
      return {
        icon: "🛒",
        label: "상점 구매",
        color: "#F44336", // 빨간색
        isEarn: false,
      };
    default:
      return {
        icon: "❓",
        label: "기타",
        color: "#9E9E9E", // 회색
        isEarn: true,
      };
  }
};

// 포인트 이력 생성 헬퍼
const createPointHistoryEntry = (
  type: PointHistoryType,
  amount: number,
  description: string,
  referenceId?: string,
): PointHistoryEntry => ({
  id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  type,
  amount,
  description,
  createdAt: new Date(),
  referenceId,
});

// 모의 포인트 이력 데이터 (실제로는 API에서 가져올 것임)
const getMockPointHistory = (): PointHistoryEntry[] => [
  createPointHistoryEntry(
    PointHistoryType.EARN_ATTENDANCE,
    20,
    "일일 출석 보상",
    "attendance_20241201",
  ),
  createPointHistoryEntry(
    PointHistoryType.EARN_POST,
    10,
    "게시글 작성 보상",
    "post_123",
  ),
  createPointHistoryEntry(
    PointHistoryType.EARN_COMMENT,
    3,
    "댓글 작성 보상",
    "comment_456",
  ),
  createPointHistoryEntry(
    PointHistoryType.EARN_CHAT,
    3,
    "채팅 참여 보상",
    "chat_789",
  ),
  createPointHistoryEntry(
    PointHistoryType.SPEND_SHOP,
    -10,
    "테스트 상품 구매",
    "test_item_10p",
  ),
  createPointHistoryEntry(
    PointHistoryType.SPEND_SHOP,
    -500,
    "골드 프로필 테두리 구매",
    "profile_frame_gold",
  ),
];

// 사용자가 구매한 아이템 인벤토리 엔트리
interface InventoryEntry {
  item: ShopItemData;
  quantity: number;
  lastPurchasedAt: Date;
}

// 상점 아이템 목록 (실제로는 API에서 가져올 데이터)
export const SHOP_ITEMS: ShopItemData[] = [
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
    id: "test_item_10p",
    name: "테스트 상품",
    description: "개발용 테스트 상품입니다",
    price: 10,
    category: "decoration",
    icon: "🧪",
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
 * 상점 / 인벤토리 페이지 컴포넌트
 * - 기존 close 버튼을 제거하고 '상점 / 인벤토리' 토글을 제공
 * - 인벤토리(가방)에서 구매한 아이템 확인 가능
 * - 현재는 로컬 상태 기반 (백엔드 미구현 시), 추후 GraphQL 연동 시 인벤토리 조회/저장 로직 대체
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
  const [activeTab, setActiveTab] = useState<"shop" | "inventory">("shop"); // 상점/인벤토리 탭
  const [inventory, setInventory] = useState<Record<string, InventoryEntry>>(
    {},
  ); // 간단한 인메모리 인벤토리 (서버 인벤토리 GraphQL 실패 시 fallback)

  // 포인트 이력 관련 상태
  const [showPointHistory, setShowPointHistory] = useState(false);
  const [pointHistory, setPointHistory] = useState<PointHistoryEntry[]>([]);

  // 포인트 이력 핸들러들
  const handleOpenPointHistory = () => {
    // 모의 데이터로 초기화 (실제로는 API에서 가져올 것임)
    setPointHistory(getMockPointHistory());
    setShowPointHistory(true);
  };

  const handleClosePointHistory = () => {
    setShowPointHistory(false);
  };

  // 포인트 이력 추가 헬퍼 함수 (확장성을 위해 외부에서 호출 가능)
  const addPointHistory = (
    type: PointHistoryType,
    amount: number,
    description: string,
    referenceId?: string,
  ) => {
    const newEntry = createPointHistoryEntry(
      type,
      amount,
      description,
      referenceId,
    );
    setPointHistory((prev) => [newEntry, ...prev]); // 최신 항목을 맨 위에 추가
  };
  /* TODO(GraphQL 인벤토리):
   * 아래 형태로 GraphQL 훅을 추가할 예정입니다.
   *
   * const { data: myInvData, loading: myInvLoading, refetch: refetchInventory } = useQuery(GET_MY_INVENTORY, {
   *   skip: !visible, fetchPolicy: "cache-and-network"
   * });
   * const [purchaseItemMutation, { loading: purchasingViaServer }] = useMutation(PURCHASE_ITEM);
   *
   * 구매 로직(handleConfirmPurchase)에서:
   *  1) 서버 purchaseItem 시도
   *  2) 실패(필드 없음/네트워크) 시 기존 deductUserPoints + 로컬 인벤토리 업데이트 fallback
   *  3) 성공 시 refetchInventory(), 사용자 포인트 reloadUser (외부 onPurchase 내부 혹은 추가 호출)
   *
   * inventoryList useMemo 에서는 myInvData?.getMyInventory 가 있으면 그것을 사용.
   */

  // 포인트 차감 뮤테이션
  const [deductUserPoints] = useMutation(DEDUCT_USER_POINTS, {
    onCompleted: () =>
      showToast({
        type: "success",
        title: "포인트 차감 완료",
        message: "포인트가 정상적으로 차감되었습니다.",
        duration: 2000,
      }),
    onError: (err) =>
      showToast({
        type: "error",
        title: "포인트 차감 실패",
        message: err.message,
        duration: 3000,
      }),
  });

  // 다이얼로그 상태
  const [showInsufficientPointsDialog, setShowInsufficientPointsDialog] =
    useState(false);
  const [showPurchaseConfirmDialog, setShowPurchaseConfirmDialog] =
    useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");
  const [selectedItem, setSelectedItem] = useState<ShopItemData | null>(null);

  const categories = useMemo(
    () => [
      { key: "all", label: "전체", icon: "grid-outline" },
      { key: "decoration", label: "꾸미기", icon: "color-palette-outline" },
      { key: "boost", label: "부스트", icon: "trending-up-outline" },
      { key: "premium", label: "프리미엄", icon: "diamond-outline" },
      { key: "special", label: "특별", icon: "star-outline" },
    ],
    [],
  );

  // 카테고리별 필터링 (상점 탭일 때만 사용)
  const filteredItems = useMemo(
    () =>
      SHOP_ITEMS.filter(
        (item) =>
          selectedCategory === "all" || item.category === selectedCategory,
      ),
    [selectedCategory],
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

  // 구매 확인 처리 (서버 purchaseItem 우선 → 실패 시 fallback)
  const handleConfirmPurchase = async () => {
    if (!selectedItem || !currentUser || !onPurchase) return;

    setPurchasingItemId(selectedItem.id);
    setShowPurchaseConfirmDialog(false);

    const finalPrice = selectedItem.discount
      ? Math.floor(selectedItem.price * (1 - selectedItem.discount / 100))
      : selectedItem.price;

    try {
      let serverSuccess = false;

      // 1) 서버 purchaseItem 시도
      if (purchaseItemMutation) {
        try {
          const res = await purchaseItemMutation({
            variables: {
              itemId: selectedItem.id,
              quantity: 1,
            },
          });

          if (res?.data?.purchaseItem?.userItem) {
            serverSuccess = true;
          }
        } catch (serverErr) {
          // 서버 실패 시 fallback 진행
          serverSuccess = false;
        }
      }

      if (!serverSuccess) {
        // ====== Fallback 절차 ======
        // A. 포인트 차감 (기존 뮤테이션)
        await deductUserPoints({
          variables: {
            userId: currentUser.id,
            amount: finalPrice,
            reason: `상점 구매(fallback): ${selectedItem.name}`,
          },
        });

        // B. 외부 구매 처리 (콜백: 포인트 갱신, 토스트 등)
        await onPurchase(selectedItem);

        // C. 로컬 인벤토리 갱신
        setInventory((prev) => {
          const exists = prev[selectedItem.id];
          return {
            ...prev,
            [selectedItem.id]: exists
              ? {
                  ...exists,
                  quantity: exists.quantity + 1,
                  lastPurchasedAt: new Date(),
                }
              : {
                  item: selectedItem,
                  quantity: 1,
                  lastPurchasedAt: new Date(),
                },
          };
        });
      } else {
        // 서버 성공 시: refetchInventory 는 onCompleted 에서 호출됨
        await onPurchase(selectedItem);
      }

      // 포인트 이력 기록
      addPointHistory(
        PointHistoryType.SPEND_SHOP,
        -finalPrice,
        `${selectedItem.name} 구매`,
        selectedItem.id,
      );

      setDialogMessage(`${selectedItem.name}을(를) 성공적으로 구매했습니다!`);
      setShowSuccessDialog(true);
    } catch (error) {
      console.error("구매 처리 오류:", (error as any)?.message || error);
      setDialogMessage("구매 중 오류가 발생했습니다.");
      setShowErrorDialog(true);
    } finally {
      setPurchasingItemId(null);
    }
  };

  // ===== GraphQL 인벤토리 연동 =====
  const {
    data: serverInvData,
    loading: loadingServerInventory,
    refetch: refetchInventory,
  } = useQuery(GET_MY_INVENTORY, {
    skip: !visible || !currentUser,
    fetchPolicy: "cache-and-network",
  });

  const [purchaseItemMutation, { loading: purchasingViaServer }] = useMutation(
    PURCHASE_ITEM,
    {
      onError: (err) => {
        // 서버 구매 실패 시 fallback 로직에서 처리
        console.warn("purchaseItem 서버 실패 → fallback 진행:", err.message);
      },
      onCompleted: () => {
        refetchInventory().catch(() => {});
      },
    },
  );

  // 인벤토리 목록 (정렬: 최근 구매 순) - 서버 우선, 없으면 로컬 fallback
  /**
   * 인벤토리 표시에 사용할 정규화 목록
   * - 서버 데이터(getMyInventory) 우선
   * - 서버 항목: { itemId, quantity, lastPurchasedAt, icon, rarity, lastPurchasePrice }
   * - 로컬 fallback: 기존 in-memory 구조 유지
   */
  const inventoryList = useMemo(() => {
    if (serverInvData?.getMyInventory?.length) {
      return serverInvData.getMyInventory
        .map((raw: any) => {
          const base = SHOP_ITEMS.find((s) => s.id === raw.itemId);
          // 서버에 없는(또는 FE 상수에 아직 등록되지 않은) 아이템에 대한 안전한 기본 값
          const fallback: ShopItemData = base || {
            id: raw.itemId,
            name: raw.itemId,
            description: "등록되지 않은 아이템",
            price: raw.lastPurchasePrice || 0,
            category: (raw.category as any) || "decoration",
            icon: raw.icon || "🎁",
            rarity: (raw.rarity as any) || "common",
            isAvailable: true,
          };
          return {
            item: fallback,
            quantity: raw.quantity || 0,
            lastPurchasedAt: new Date(raw.lastPurchasedAt),
          };
        })
        .sort(
          (a: any, b: any) =>
            b.lastPurchasedAt.getTime() - a.lastPurchasedAt.getTime(),
        );
    }
    // 로컬(in-memory) fallback
    return Object.values(inventory)
      .map((v) => ({
        item: v.item,
        quantity: v.quantity,
        lastPurchasedAt: v.lastPurchasedAt,
      }))
      .sort(
        (a, b) => b.lastPurchasedAt.getTime() - a.lastPurchasedAt.getTime(),
      );
  }, [inventory, serverInvData]);

  // 페이지 형태로 동작: visible이 아니면 렌더링하지 않음
  if (!visible) return null;

  return (
    <>
      <View style={themed($modalOverlay)}>
        <View style={themed($modalContent)}>
          {/* 헤더 - 상단 좌측 타이틀 / 우측 탭 토글 + 닫기 */}
          <View style={themed($header)}>
            <View style={themed($headerLeft)}>
              <Text style={themed($title)}>
                {activeTab === "shop" ? "상점" : "인벤토리"}
              </Text>
              <Text style={themed($subtitle)}>
                {activeTab === "shop"
                  ? "포인트로 특별한 아이템을 구매하세요"
                  : "내가 보유한 아이템을 확인하세요"}
              </Text>
            </View>

            <View style={themed($headerRightGroup)}>
              {/* 닫기 (라우터 back) */}
              <TouchableOpacity
                onPress={onClose}
                style={themed($closeIconButton)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color={theme.colors.textDim} />
              </TouchableOpacity>
            </View>
          </View>

          {/* 상점/가방 탭 + 포인트 한 줄 배치 */}
          <View style={themed($tabAndPointsRow)}>
            {/* 좌측: 보유 포인트 카드 */}
            <View style={themed($pointsCardWrapper)}>
              <View style={themed($balanceCardCompact)}>
                <Text style={themed($balanceLabel)}>보유 포인트</Text>
                <Text style={themed($balanceAmount)}>
                  {currentUser?.points ?? 0}P
                </Text>
              </View>
            </View>

            {/* 중앙: 탭 토글 */}
            <View style={themed($tabCenterWrapper)}>
              <View style={themed($tabToggleInline)}>
                <TouchableOpacity
                  style={[
                    themed($tabToggleButton),
                    activeTab === "shop" && themed($tabToggleButtonActive),
                  ]}
                  onPress={() => setActiveTab("shop")}
                >
                  <Ionicons
                    name="storefront-outline"
                    size={16}
                    color={
                      activeTab === "shop"
                        ? theme.colors.tint
                        : theme.colors.textDim
                    }
                  />
                  <Text
                    style={[
                      themed($tabToggleText),
                      activeTab === "shop" && themed($tabToggleTextActive),
                    ]}
                  >
                    상점
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    themed($tabToggleButton),
                    activeTab === "inventory" && themed($tabToggleButtonActive),
                  ]}
                  onPress={() => setActiveTab("inventory")}
                >
                  <Ionicons
                    name="bag-handle-outline"
                    size={16}
                    color={
                      activeTab === "inventory"
                        ? theme.colors.tint
                        : theme.colors.textDim
                    }
                  />
                  <Text
                    style={[
                      themed($tabToggleText),
                      activeTab === "inventory" && themed($tabToggleTextActive),
                    ]}
                  >
                    가방
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 탭 아래 포인트 이력 버튼 (세로 짧게) */}
              <TouchableOpacity
                style={themed($pointHistoryCenterButton)}
                activeOpacity={0.85}
                onPress={handleOpenPointHistory}
              >
                <Ionicons name="sparkles-outline" size={14} color={"white"} />
                <Text style={themed($pointHistoryCenterButtonText)}>
                  포인트 이력
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* (이전 위치의 포인트 이력 바 제거됨 - 탭 중앙 컬럼 아래로 이동) */}

          {/* 상점 전용: 카테고리 탭 */}
          {activeTab === "shop" && (
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
          )}

          {/* 메인 콘텐츠 */}
          <ScrollView style={themed($itemsContainer)}>
            <View style={themed($itemsGrid)}>
              {activeTab === "shop" &&
                filteredItems.map((item) => (
                  <ShopItem
                    key={item.id}
                    item={item}
                    onPurchase={() => handlePurchase(item)}
                    isPurchasing={
                      purchasingItemId === item.id || purchasingViaServer
                    }
                    canAfford={
                      (currentUser?.points ?? 0) >=
                      (item.discount
                        ? Math.floor(item.price * (1 - item.discount / 100))
                        : item.price)
                    }
                  />
                ))}
              {activeTab === "inventory" && loadingServerInventory && (
                <View
                  style={{
                    paddingVertical: 32,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ActivityIndicator size="small" color={theme.colors.tint} />
                  <Text
                    style={{
                      marginTop: 12,
                      color: theme.colors.textDim,
                      fontSize: 13,
                      fontWeight: "500",
                    }}
                  >
                    인벤토리를 불러오는 중...
                  </Text>
                </View>
              )}

              {activeTab === "inventory" && (
                <>
                  {inventoryList.length === 0 && (
                    <View style={themed($emptyInventoryContainer)}>
                      <Ionicons
                        name="bag-handle-outline"
                        size={48}
                        color={theme.colors.textDim}
                      />
                      <Text style={themed($emptyInventoryTitle)}>
                        아직 보유한 아이템이 없어요
                      </Text>
                      <Text style={themed($emptyInventorySubtitle)}>
                        상점에서 아이템을 구매하면 이곳에 표시됩니다.
                      </Text>
                      <TouchableOpacity
                        style={themed($goShopButton)}
                        onPress={() => setActiveTab("shop")}
                      >
                        <Ionicons
                          name="storefront-outline"
                          size={16}
                          color="white"
                        />
                        <Text style={themed($goShopButtonText)}>
                          상점 둘러보기
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {inventoryList.map((entry) => {
                    const item = entry.item;
                    const finalPrice = item.discount
                      ? Math.floor(
                          item.price * (1 - (item.discount || 0) / 100),
                        )
                      : item.price;

                    return (
                      <View key={item.id} style={themed($inventoryItemCard)}>
                        <View style={themed($inventoryItemHeader)}>
                          <Text style={themed($inventoryItemIcon)}>
                            {item.icon}
                          </Text>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={themed($inventoryItemName)}
                              numberOfLines={1}
                            >
                              {item.name}
                            </Text>
                            <Text
                              style={themed($inventoryItemDesc)}
                              numberOfLines={2}
                            >
                              {item.description}
                            </Text>
                          </View>
                          <View style={themed($inventoryBadge)}>
                            <Text style={themed($inventoryBadgeText)}>
                              보유 {entry.quantity}
                            </Text>
                          </View>
                        </View>
                        <View style={themed($inventoryMetaRow)}>
                          <View style={themed($inventoryMetaPill)}>
                            <Ionicons
                              name="time-outline"
                              size={12}
                              color={theme.colors.textDim}
                            />
                            <Text style={themed($inventoryMetaPillText)}>
                              {entry.lastPurchasedAt.toLocaleDateString(
                                "ko-KR",
                                {
                                  month: "numeric",
                                  day: "numeric",
                                },
                              )}{" "}
                              {entry.lastPurchasedAt.toLocaleTimeString(
                                "ko-KR",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </Text>
                          </View>
                          <View style={themed($inventoryMetaPill)}>
                            <Ionicons
                              name="pricetag-outline"
                              size={12}
                              color={theme.colors.textDim}
                            />
                            <Text style={themed($inventoryMetaPillText)}>
                              구매가 {finalPrice}P
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </>
              )}
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
        showCancel={false}
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

      {/* 포인트 이력 모달 */}
      {showPointHistory && (
        <View style={themed($pointHistoryModalOverlay)}>
          <View style={themed($pointHistoryModalContent)}>
            {/* 헤더 */}
            <View style={themed($pointHistoryHeader)}>
              <Text style={themed($pointHistoryTitle)}>포인트 이력</Text>
              <TouchableOpacity
                onPress={handleClosePointHistory}
                style={themed($pointHistoryCloseButton)}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {/* 이력 목록 */}
            <ScrollView style={themed($pointHistoryList)}>
              {pointHistory.length === 0 ? (
                <View style={themed($emptyHistory)}>
                  <Ionicons
                    name="time-outline"
                    size={48}
                    color={theme.colors.textDim}
                  />
                  <Text style={themed($emptyHistoryText)}>
                    포인트 이력이 없습니다.
                  </Text>
                </View>
              ) : (
                pointHistory.map((entry) => {
                  const info = getPointHistoryInfo(entry.type);
                  return (
                    <View key={entry.id} style={themed($historyItem)}>
                      <View style={themed($historyItemLeft)}>
                        <Text style={themed($historyIcon)}>{info.icon}</Text>
                        <View style={themed($historyItemContent)}>
                          <Text style={themed($historyItemTitle)}>
                            {info.label}
                          </Text>
                          <Text style={themed($historyItemDescription)}>
                            {entry.description}
                          </Text>
                          <Text style={themed($historyItemDate)}>
                            {entry.createdAt.toLocaleDateString("ko-KR")}{" "}
                            {entry.createdAt.toLocaleTimeString("ko-KR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </Text>
                        </View>
                      </View>
                      <Text
                        style={[
                          themed($historyItemAmount),
                          { color: info.isEarn ? "#4CAF50" : "#F44336" },
                        ]}
                      >
                        {info.isEarn ? "+" : ""}
                        {entry.amount}P
                      </Text>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      )}
    </>
  );
}

// ====================== 스타일 정의 ======================
// 기존 스타일 + 인벤토리 관련 추가 스타일
const $modalOverlay: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
  justifyContent: "flex-start",
  alignItems: "center",
});

const $modalContent: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
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
  gap: spacing.md,
});

const $headerLeft: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $headerRightGroup: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
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

// const $tabToggleGroup: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
//   flexDirection: "row",
//   backgroundColor: colors.backgroundAlt,
//   padding: 4,
//   borderRadius: 24,
//   borderWidth: 1,
//   borderColor: colors.border,
// }); // 더 이상 사용하지 않음 - 보유 포인트 옆으로 이동됨

const $tabToggleButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: spacing.xs,
  paddingHorizontal: spacing.sm,
  borderRadius: 20,
  gap: 4,
});

const $tabToggleButtonActive: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tint + "25",
});

const $tabToggleText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  fontWeight: "600",
  color: colors.textDim,
});

const $tabToggleTextActive: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
});

const $closeIconButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.xs,
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

// 포인트 잔액 + 포인트 이력 50% / 50% 행
const $balanceAndTabSection: ThemedStyle<ViewStyle> = () => ({
  display: "none", // 사용 안 함 (이전 레이아웃)
});

// 상단 풀폭 탭 토글 행
const $tabToggleFullWidth: ThemedStyle<ViewStyle> = () => ({
  display: "none", // 사용 안 함
});

// 기존 balanceSectionHalf 그대로 (좌측 50%)

// 기존 balanceSection 스타일을 재정의 (절반 너비로)
const $balanceSectionHalf: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1, // 절반 너비 차지
  paddingHorizontal: 0,
  paddingVertical: 0,
});

// 탭 토글 섹션 (절반 너비)
const $tabToggleSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1, // 절반 너비 차지
  flexDirection: "row",
  justifyContent: "center",
  gap: spacing.xs,
});

const $categoryTabs: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.lg,
  marginBottom: spacing.md,
  flexGrow: 0,
  flexShrink: 0,
  alignSelf: "flex-start",
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
  alignSelf: "flex-start",
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

// 인벤토리 빈 상태
const $emptyInventoryContainer: ThemedStyle<ViewStyle> = ({
  spacing,
  colors,
}) => ({
  alignItems: "center",
  paddingVertical: spacing.xl,
  gap: spacing.md,
  backgroundColor: colors.backgroundAlt,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: colors.border,
  padding: spacing.xl,
});

const $emptyInventoryTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
  fontWeight: "700",
  color: colors.text,
});

const $emptyInventorySubtitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 13,
  color: colors.textDim,
  textAlign: "center",
  lineHeight: 18,
});

const $goShopButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
  backgroundColor: colors.tint,
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.sm,
  borderRadius: 24,
});

const $goShopButtonText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 14,
  fontWeight: "600",
});

// 인벤토리 아이템 카드
const $inventoryItemCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.card,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: colors.border,
  padding: spacing.md,
  gap: spacing.sm,
});

const $inventoryItemHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "flex-start",
  gap: spacing.md,
});

const $inventoryItemIcon: ThemedStyle<TextStyle> = () => ({
  fontSize: 36,
  lineHeight: 40,
});

const $inventoryItemName: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  fontWeight: "700",
  color: colors.text,
  marginBottom: 2,
});

const $inventoryItemDesc: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
  lineHeight: 16,
});

const $inventoryBadge: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.tint + "25",
  paddingHorizontal: spacing.sm,
  paddingVertical: 4,
  borderRadius: 12,
  alignSelf: "flex-start",
});

const $inventoryBadgeText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 11,
  fontWeight: "700",
  color: colors.tint,
});

const $inventoryMetaRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.sm,
});

const $inventoryMetaPill: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
  backgroundColor: colors.backgroundAlt,
  paddingHorizontal: spacing.sm,
  paddingVertical: 4,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.border,
});

const $inventoryMetaPillText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 11,
  fontWeight: "600",
  color: colors.textDim,
});

// ====================== 포인트 이력 관련 스타일 ======================

// 인라인 포인트 이력 카드 (우측 50% 박스)
const $pointHistoryInline: ThemedStyle<ViewStyle> = () => ({
  display: "none", // 이전 컴팩트 전용으로 대체됨
});

const $pointSummaryTexts: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  gap: spacing.xs,
});

const $pointSummaryTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 15,
  fontWeight: "700",
  color: colors.text,
});

const $pointSummarySubtitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 11,
  color: colors.textDim,
  fontWeight: "500",
});

const $pointHistoryOpenBtn: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  backgroundColor: colors.tint,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderRadius: 24,
});

const $pointHistoryOpenBtnText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 13,
  fontWeight: "700",
});

// 포인트 이력 모달
const $pointHistoryModalOverlay: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: colors.background,
  zIndex: 1000,
});

const $pointHistoryModalContent: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
  maxWidth: 500,
  width: "100%",
  alignSelf: "center",
});

const $pointHistoryHeader: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.lg,
  paddingBottom: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $pointHistoryTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 20,
  fontWeight: "800",
  color: colors.text,
});

const $pointHistoryCloseButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.sm,
});

const $pointHistoryList: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $emptyHistory: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingVertical: spacing.xl,
});

const $emptyHistoryText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  color: colors.textDim,
  marginTop: 16,
  textAlign: "center",
});

const $historyItem: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.border + "50",
});

const $historyItemLeft: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  flex: 1,
  gap: spacing.md,
});

const $historyIcon: ThemedStyle<TextStyle> = () => ({
  fontSize: 24,
});

const $historyItemContent: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $historyItemTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  fontWeight: "600",
  color: colors.text,
  marginBottom: 2,
});

const $historyItemDescription: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
  marginBottom: 2,
  lineHeight: 16,
});

const $historyItemDate: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 10,
  color: colors.textDim,
  fontWeight: "500",
});

const $historyItemAmount: ThemedStyle<TextStyle> = () => ({
  fontSize: 16,
  fontWeight: "700",
});
/* ===== 새 레이아웃 추가 스타일 ===== */
const $tabAndPointsRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "stretch",
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.sm,
  paddingBottom: spacing.md,
  gap: spacing.md,
});

const $pointsCardWrapper: ThemedStyle<ViewStyle> = () => ({
  flex: 1.1,
});

const $balanceCardCompact: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.tint + "10",
  borderRadius: 20,
  paddingVertical: spacing.lg,
  paddingHorizontal: spacing.lg,
  borderWidth: 1,
  borderColor: colors.tint + "25",
  alignItems: "flex-start",
  justifyContent: "center",
  gap: spacing.xs,
});

const $tabCenterWrapper: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 0.9,
  justifyContent: "flex-start",
  alignItems: "center",
  flexDirection: "column",
  gap: spacing.xs,
});

const $tabToggleInline: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  backgroundColor: colors.backgroundAlt,
  padding: 4,
  borderRadius: 28,
  borderWidth: 1,
  borderColor: colors.border,
  gap: spacing.xs,
});

const $pointHistoryInlineCompact: ThemedStyle<ViewStyle> = ({
  colors,
  spacing,
}) => ({
  flex: 1,
  backgroundColor: colors.backgroundAlt,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: colors.border,
  padding: spacing.md,
  justifyContent: "center",
  alignItems: "flex-start",
  gap: spacing.xs,
});

const $pointHistoryMiniDesc: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 10,
  color: colors.textDim,
  fontWeight: "500",
  letterSpacing: 0.2,
});

/* ===== 포인트 이력 바 (탭 아래 작은 버튼) ===== */
const $pointHistoryBar: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  paddingHorizontal: spacing.lg,
  marginTop: -spacing.xs,
  marginBottom: spacing.md,
});

const $pointHistoryBarButton: ThemedStyle<ViewStyle> = ({
  colors,
  spacing,
}) => ({
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: colors.tint,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.xs + 2,
  borderRadius: 18,
  gap: 6,
  shadowColor: "#000",
  shadowOpacity: 0.12,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 2 },
});

const $pointHistoryBarText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 13,
  fontWeight: "700",
  letterSpacing: 0.3,
});

/* 탭 아래 세로 정렬용 포인트 이력 버튼 (중앙 컬럼 내부) */
const $pointHistoryCenterButton: ThemedStyle<ViewStyle> = ({
  colors,
  spacing,
}) => ({
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: colors.tint,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.xs + 2,
  borderRadius: 18,
  gap: 6,
});

const $pointHistoryCenterButtonText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 13,
  fontWeight: "700",
  letterSpacing: 0.3,
});
