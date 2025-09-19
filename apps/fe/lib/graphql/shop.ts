/**
 * 상점 / 인벤토리 GraphQL 스키마 정의
 *
 * 백엔드 InventoryModule / ProgressModule 와 연동되는 쿼리 & 뮤테이션 모음.
 * - 카탈로그(현재 판매 가능한 아이템 목록) 조회
 * - 내 인벤토리(보유 아이템) 조회
 * - 아이템 구매 (포인트 차감 + 인벤토리 반영)
 *
 * 사용 예시 (Apollo):
 * const { data, loading } = useQuery(GET_SHOP_CATALOG);
 *
 * const [purchaseItemMutation, { loading: purchasing }] = useMutation(PURCHASE_ITEM, {
 *   onCompleted: () => refetchInventory(),
 *   onError: (e) => showToast(...),
 * });
 *
 * await purchaseItemMutation({ variables: { itemId: 'profile_frame_gold', quantity: 1 }});
 *
 * 주의:
 * - 기존 ShopModal 은 로컬 하드코딩 아이템(SHOP_ITEMS)을 사용.
 *   => 점진적으로 GET_SHOP_CATALOG 결과와 동기화하거나, 서버 응답이 우선하도록 로직 개선 가능.
 * - 할인 가격(final price)은 서버가 계산하여 price 필드로 내려줌.
 */

import { gql } from "@apollo/client";

/* =========================
 * GraphQL Fragments
 * ========================= */

/** 사용자 인벤토리 아이템 공통 필드 */
export const USER_ITEM_FIELDS = gql`
  fragment UserItemFields on UserItem {
    id
    userId
    itemId
    quantity
    lastPurchasedAt
    category
    icon
    rarity
    lastPurchasePrice
    metadata
    createdAt
    updatedAt
  }
`;

/* =========================
 * Queries
 * ========================= */

/**
 * 상점 카탈로그 전체 조회
 * - price: 할인 적용 후 최종 가격
 * - discount: 존재하면 할인율(0~100)
 */
export const GET_SHOP_CATALOG = gql`
  query GetShopCatalog {
    getShopCatalog {
      id
      name
      description
      category
      icon
      rarity
      price
      discount
    }
  }
`;

/**
 * 특정 아이템들만 부분 스냅샷 조회 (선택된/노출 중인 목록의 가격 재동기화 등)
 */
export const GET_SHOP_CATALOG_BY_IDS = gql`
  query GetShopCatalogByIds($ids: [String!]!) {
    getShopCatalogByIds(ids: $ids) {
      id
      name
      description
      category
      icon
      rarity
      price
      discount
    }
  }
`;

/**
 * 내 인벤토리 조회 (최신 구매순)
 */
export const GET_MY_INVENTORY = gql`
  query GetMyInventory {
    getMyInventory {
      ...UserItemFields
    }
  }
  ${USER_ITEM_FIELDS}
`;

/**
 * 인벤토리 아이템 종류 수 (UI 뱃지/카운트용)
 */
export const GET_MY_INVENTORY_COUNT = gql`
  query GetMyInventoryCount {
    getMyInventoryCount
  }
`;

/* =========================
 * Mutations
 * ========================= */

/**
 * 아이템 구매
 * - totalCost: 총 결제 포인트(수량 * 단가)
 * - remainingPoints: 구매 후 잔여 포인트
 * - created: true 면 최초 생성(기존 보유 X), false 면 수량 증가
 * - unitFinalPrice: 단일 아이템 최종 단가 (할인 적용 후)
 */
export const PURCHASE_ITEM = gql`
  mutation PurchaseItem($itemId: String!, $quantity: Int = 1) {
    purchaseItem(itemId: $itemId, quantity: $quantity) {
      userItem {
        ...UserItemFields
      }
      totalCost
      remainingPoints
      created
      unitFinalPrice
    }
  }
  ${USER_ITEM_FIELDS}
`;

/* =========================
 * TypeScript Types
 * ========================= */

/**
 * 상점 카탈로그 아이템 타입 (서버 응답용)
 */
export interface ShopCatalogItem {
  id: string;
  name: string;
  description: string;
  category: ShopItemCategory;
  icon: string;
  rarity: ShopItemRarity;
  price: number;       // 최종 가격 (할인 반영)
  discount?: number;   // 할인율
}

/**
 * 인벤토리 아이템 타입 (UserItem)
 */
export interface InventoryUserItem {
  id: string;
  userId: string;
  itemId: string;
  quantity: number;
  lastPurchasedAt: string;
  category?: ShopItemCategory | null;
  icon?: string | null;
  rarity?: ShopItemRarity | null;
  lastPurchasePrice?: number | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * 아이템 구매 결과 타입
 */
export interface PurchaseResult {
  userItem: InventoryUserItem;
  totalCost: number;
  remainingPoints: number;
  created: boolean;
  unitFinalPrice: number;
}

/* =========================
 * Enums (백엔드와 동기)
 * ========================= */

/**
 * 상점 아이템 카테고리
 * - 백엔드 ShopItemCategory enum 과 동일해야 함
 */
export type ShopItemCategory =
  | "decoration"
  | "boost"
  | "premium"
  | "special";

/**
 * 아이템 희귀도
 * - 백엔드 ShopItemRarity enum 과 동일해야 함
 */
export type ShopItemRarity =
  | "common"
  | "rare"
  | "epic"
  | "legendary";

/* =========================
 * 헬퍼 함수
 * ========================= */

/**
 * 서버 카탈로그 스냅샷을 로컬 하드코딩 SHOP_ITEMS 와 병합하여
 * 최신 가격/할인 정보만 서버 값으로 덮어쓰는 유틸 (옵션)
 *
 * @param local 로컬 하드코딩 배열 (FE 상수)
 * @param remote 서버 카탈로그
 */
export function mergeCatalog(
  local: Array<{ id: string; price: number; discount?: number }>,
  remote: ShopCatalogItem[],
): ShopCatalogItem[] {
  const map = new Map<string, ShopCatalogItem>();
  remote.forEach((r) => map.set(r.id, r));
  return local.map((l) => map.get(l.id) ?? { ...l } as any).filter(Boolean);
}

/**
 * 인벤토리 아이템을 카탈로그 아이템 정보와 결합 (UI 표시에 유용)
 */
export function enrichInventoryWithCatalog(
  inventory: InventoryUserItem[],
  catalog: ShopCatalogItem[],
) {
  const catalogMap = new Map(catalog.map((c) => [c.id, c]));
  return inventory.map((inv) => {
    const cat = catalogMap.get(inv.itemId);
    return {
      ...inv,
      catalog: cat,
      displayName: cat?.name ?? inv.itemId,
      displayIcon: inv.icon ?? cat?.icon,
    };
  });
}
