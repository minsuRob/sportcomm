/**
 * 상점 카탈로그 정의 (백엔드 소스 오브 트루스)
 *
 * - FE 의 하드코딩된 SHOP_ITEMS 와 반드시 동기화 필요
 * - 실제 운영 단계에서는 DB/어드민 CMS 로 이전 가능
 * - 여기서는 간단한 상수/헬퍼로 아이템 정보와 가격(할인) 계산 제공
 *
 * 주의:
 * 1. 아이템 ID 는 영구 불변 키로 사용 (변경 금지)
 * 2. 가격/할인 변경 시 FE 캐시/빌드 배포 동기화 필요
 * 3. 추후 다국어 지원 시 name/description 은 별도 i18n 사전으로 분리 가능
 */

import { ShopItemCategory, ShopItemRarity } from '../../entities/user-item.entity';

/**
 * 상점 카탈로그 아이템 인터페이스
 */
export interface ShopCatalogItem {
  /** 아이템 고유 ID (비즈니스 키) */
  id: string;
  /** 표시 이름 */
  name: string;
  /** 설명 (간단 요약) */
  description: string;
  /** 기본 가격 (정가) */
  basePrice: number;
  /** 카테고리 */
  category: ShopItemCategory;
  /** 아이콘 (이모지 또는 심볼) */
  icon: string;
  /** 희귀도 */
  rarity: ShopItemRarity;
  /** 판매 가능 여부 */
  isAvailable: boolean;
  /** 할인율 (0~100) - 선택 */
  discount?: number;
  /** 확장 메타데이터 (기간제/옵션 등) */
  metadata?: Record<string, any>;
}

/**
 * 카탈로그 아이템 정적 배열
 * - 운영 중 변경 시 재배포 필요
 * - 할인(discount)은 최종 결제 단계에서 동적으로 계산
 */
export const SHOP_CATALOG: Readonly<ShopCatalogItem[]> = Object.freeze<ShopCatalogItem[]>([
  {
    id: 'profile_frame_gold',
    name: '골드 프로필 테두리',
    description: '프로필에 고급스러운 골드 테두리를 추가합니다',
    basePrice: 500,
    category: ShopItemCategory.DECORATION,
    icon: '🏆',
    rarity: ShopItemRarity.EPIC,
    isAvailable: true,
  },
  {
    id: 'post_boost_3days',
    name: '게시물 부스트 (3일)',
    description: '게시물을 3일간 상단에 고정시킵니다',
    basePrice: 200,
    category: ShopItemCategory.BOOST,
    icon: '🚀',
    rarity: ShopItemRarity.COMMON,
    isAvailable: true,
    discount: 20,
    metadata: {
      durationDays: 3,
      effect: 'pin_post',
    },
  },
  {
    id: 'premium_badge',
    name: '프리미엄 배지',
    description: '특별한 프리미엄 사용자 배지를 획득합니다',
    basePrice: 1000,
    category: ShopItemCategory.PREMIUM,
    icon: '⭐',
    rarity: ShopItemRarity.LEGENDARY,
    isAvailable: true,
  },
  {
    id: 'custom_emoji_pack',
    name: '커스텀 이모지 팩',
    description: '독점 이모지 20개를 사용할 수 있습니다',
    basePrice: 300,
    category: ShopItemCategory.DECORATION,
    icon: '😎',
    rarity: ShopItemRarity.RARE,
    isAvailable: true,
    metadata: {
      emojiCount: 20,
    },
  },
  {
    id: 'highlight_comment',
    name: '댓글 하이라이트',
    description: '댓글을 눈에 띄게 강조 표시합니다',
    basePrice: 100,
    category: ShopItemCategory.BOOST,
    icon: '💬',
    rarity: ShopItemRarity.COMMON,
    isAvailable: true,
    metadata: {
      effect: 'highlight_comment',
      durationHours: 12,
    },
  },
  {
    id: 'test_item_10p',
    name: '테스트 상품',
    description: '개발용 테스트 상품입니다',
    basePrice: 10,
    category: ShopItemCategory.DECORATION,
    icon: '🧪',
    rarity: ShopItemRarity.COMMON,
    isAvailable: true,
    metadata: {
      devOnly: true,
    },
  },
  {
    id: 'team_supporter_badge',
    name: '팀 서포터 배지',
    description: '좋아하는 팀의 공식 서포터 배지를 획득합니다',
    basePrice: 750,
    category: ShopItemCategory.SPECIAL,
    icon: '🏅',
    rarity: ShopItemRarity.EPIC,
    isAvailable: true,
    discount: 15,
    metadata: {
      effect: 'team_badge',
    },
  },
]);

/**
 * 아이템 조회
 * @param id 아이템 ID
 */
export function getCatalogItem(id: string): ShopCatalogItem | undefined {
  return SHOP_CATALOG.find((i) => i.id === id);
}

/**
 * 할인 적용 최종 가격 계산
 * - 할인율이 유효(>0)하면 floor(basePrice * (1 - discount/100))
 * - 최소 가격 보호(0 미만 방지)
 */
export function calculateFinalPrice(item: ShopCatalogItem): number {
  if (item.discount && item.discount > 0) {
    const discounted = Math.floor(item.basePrice * (1 - item.discount / 100));
    return Math.max(0, discounted);
  }
  return item.basePrice;
}

/**
 * 구매 가능 여부 및 최종 가격 확인
 * - 아이템 존재 & 판매 가능 여부 검증
 * - 예외 발생 시 호출 측에서 try/catch 처리
 */
export function ensurePurchasable(
  itemId: string,
): { item: ShopCatalogItem; finalPrice: number } {
  const item = getCatalogItem(itemId);
  if (!item) {
    throw new Error(`존재하지 않는 아이템입니다: ${itemId}`);
  }
  if (!item.isAvailable) {
    throw new Error(`현재 구매할 수 없는 아이템입니다: ${item.name}`);
  }
  return { item, finalPrice: calculateFinalPrice(item) };
}

/**
 * 카테고리별 사용 가능한 아이템 목록 추출
 * @param category (선택) 없으면 전체
 */
export function listAvailableCatalogItems(
  category?: ShopItemCategory,
): ShopCatalogItem[] {
  return SHOP_CATALOG.filter(
    (i) => i.isAvailable && (!category || i.category === category),
  );
}

/**
 * 프론트엔드 동기화용 경량 DTO 변환
 * (필요 시 가격/할인만 빠르게 전달하는 API에서 사용 가능)
 */
export interface CatalogItemSnapshot {
  id: string;
  name: string;
  description: string;
  category: ShopItemCategory;
  icon: string;
  rarity: ShopItemRarity;
  price: number;
  discount?: number;
}

export function toSnapshot(item: ShopCatalogItem): CatalogItemSnapshot {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    category: item.category,
    icon: item.icon,
    rarity: item.rarity,
    price: calculateFinalPrice(item),
    discount: item.discount,
  };
}

/**
 * 전체 스냅샷 반환 (캐시 친화)
 */
export function getCatalogSnapshot(): CatalogItemSnapshot[] {
  return SHOP_CATALOG.map(toSnapshot);
}

/**
 * 특정 아이템 ID 배열에 대한 스냅샷
 */
export function getCatalogSnapshotByIds(ids: string[]): CatalogItemSnapshot[] {
  return ids
    .map(getCatalogItem)
    .filter((i): i is ShopCatalogItem => !!i)
    .map(toSnapshot);
}

/**
 * 카탈로그 변경 감시/자동 리로드가 필요하다면
 * - 현재는 정적 모듈이므로 런타임 변경 없음
 * - 향후 DB 기반 전환 시 이 자리에 캐시/인메모리 재빌드 로직 배치
 */
export function refreshCatalogCache(): void {
  // NOOP (정적)
}
