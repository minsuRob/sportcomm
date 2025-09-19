import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  ObjectType,
  Field,
} from '@nestjs/graphql';
import { UseGuards, BadRequestException } from '@nestjs/common';
import { InventoryService, PurchaseResult } from './inventory.service';
import {
  UserItem,
  ShopItemCategory,
  ShopItemRarity,
} from '../../entities/user-item.entity';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import {
  CurrentUserId,
  OptionalCurrentUser,
} from '../../common/decorators/current-user.decorator';
import {
  CatalogItemSnapshot,
  getCatalogSnapshot,
  getCatalogSnapshotByIds,
} from './shop-catalog';

/**
 * 상점 카탈로그 스냅샷 GraphQL 타입
 * - 프론트엔드에서 현재 판매 중인 아이템 목록 및 가격(할인 반영)을 조회할 수 있도록 제공
 */
@ObjectType('ShopCatalogItem')
class ShopCatalogItemGraphQL implements CatalogItemSnapshot {
  @Field(() => String, { description: '아이템 고유 ID (카탈로그 키)' })
  id!: string;

  @Field(() => String, { description: '아이템 명' })
  name!: string;

  @Field(() => String, { description: '아이템 설명' })
  description!: string;

  @Field(() => ShopItemCategory, { description: '카테고리' })
  category!: ShopItemCategory;

  @Field(() => String, { description: '아이콘 (이모지 등)' })
  icon!: string;

  @Field(() => ShopItemRarity, { description: '희귀도' })
  rarity!: ShopItemRarity;

  @Field(() => Int, { description: '최종 가격 (할인 적용 후)' })
  price!: number;

  @Field(() => Int, {
    nullable: true,
    description: '할인율 (없으면 undefined)',
  })
  discount?: number;
}

/**
 * 아이템 구매 결과 GraphQL 타입
 * - 인벤토리 최신 상태(업데이트된 UserItem)와 결제 정보 반환
 */
@ObjectType('PurchaseResult')
class PurchaseResultGraphQL implements PurchaseResult {
  @Field(() => UserItem, { description: '구매 후 사용자 아이템 (업서트)' })
  userItem!: UserItem;

  @Field(() => Int, { description: '총 결제 포인트 (수량/할인 반영)' })
  totalCost!: number;

  @Field(() => Int, { description: '차감 후 잔여 포인트' })
  remainingPoints!: number;

  @Field(() => Boolean, {
    description: '새로 생성된 아이템인지 여부 (true면 최초 보유)',
  })
  created!: boolean;

  @Field(() => Int, { description: '단일 아이템 최종 단가 (할인 후)' })
  unitFinalPrice!: number;
}

/**
 * 인벤토리 / 상점 관련 GraphQL Resolver
 *
 * 제공 기능:
 * - getShopCatalog: 상점 카탈로그(판매 아이템 목록) 조회
 * - getMyInventory: 현재 사용자 인벤토리 조회
 * - purchaseItem: 아이템 구매
 *
 * 확장 포인트:
 * - 특정 아이템 사용/소비 Mutation (예: 부스트 적용)
 * - 기간 만료 / 효과 적용 스케줄러
 */
@Resolver(() => UserItem)
export class InventoryResolver {
  constructor(private readonly inventoryService: InventoryService) {}

  // ===================== 상점 카탈로그 =====================

  /**
   * 상점 카탈로그 전체 스냅샷 조회
   * - 인증 불필요 (공개)
   */
  @Query(() => [ShopCatalogItemGraphQL], {
    name: 'getShopCatalog',
    description: '상점 판매 아이템 카탈로그 (최종 가격/할인 반영) 조회',
  })
  async getShopCatalog(): Promise<CatalogItemSnapshot[]> {
    return getCatalogSnapshot();
  }

  /**
   * 특정 아이템 ID 배열에 대한 카탈로그 부분 스냅샷
   * - 선택된 아이템들만 재요청하여 최신 가격 동기화 등에 활용
   */
  @Query(() => [ShopCatalogItemGraphQL], {
    name: 'getShopCatalogByIds',
    description: '아이템 ID 배열에 대한 카탈로그 부분 스냅샷',
  })
  async getShopCatalogByIds(
    @Args({ name: 'ids', type: () => [String] }) ids: string[],
  ): Promise<CatalogItemSnapshot[]> {
    if (!ids || ids.length === 0) return [];
    return getCatalogSnapshotByIds(ids);
  }

  // ===================== 인벤토리 조회 =====================

  /**
   * 내 인벤토리(보유 아이템) 조회
   * - 최신 구매 순 정렬
   */
  @UseGuards(GqlAuthGuard)
  @Query(() => [UserItem], {
    name: 'getMyInventory',
    description: '현재 로그인한 사용자의 인벤토리를 최신 구매 순으로 조회',
  })
  async getMyInventory(@CurrentUserId() userId: string): Promise<UserItem[]> {
    return this.inventoryService.getUserInventory(userId);
  }

  /**
   * (선택적 인증) 로그인 사용자 인벤토리 수량 카운트
   * - 비로그인 시 0 반환
   * - 가벼운 UI 뱃지 렌더링 용도
   */
  @Query(() => Int, {
    name: 'getMyInventoryCount',
    description:
      '현재 사용자 인벤토리 아이템 종류 수 (비로그인 시 0). 캐시/UI 뱃지 용도.',
  })
  async getMyInventoryCount(@OptionalCurrentUser() user: any): Promise<number> {
    if (!user?.id) return 0;
    const list = await this.inventoryService.getUserInventory(user.id);
    return list.length;
  }

  // ===================== 구매 =====================

  /**
   * 아이템 구매
   * - 수량 기본 1
   * - 포인트 차감 → 인벤토리 증가 (업서트)
   * - 실패 시 예외 (프론트에서 다이얼로그/토스트 처리)
   */
  @UseGuards(GqlAuthGuard)
  @Mutation(() => PurchaseResultGraphQL, {
    name: 'purchaseItem',
    description:
      '상점 아이템 구매. 포인트 차감 후 인벤토리에 추가/증가. 실패 시 예외 발생.',
  })
  async purchaseItem(
    @CurrentUserId() userId: string,
    @Args('itemId', { type: () => String }) itemId: string,
    @Args('quantity', { type: () => Int, defaultValue: 1 }) quantity: number,
  ): Promise<PurchaseResultGraphQL> {
    if (!itemId) {
      throw new BadRequestException('itemId 는 필수입니다.');
    }

    const result = await this.inventoryService.purchaseItem(
      userId,
      itemId,
      quantity,
    );

    return {
      userItem: result.userItem,
      totalCost: result.totalCost,
      remainingPoints: result.remainingPoints,
      created: result.created,
      unitFinalPrice: result.unitFinalPrice,
    };
  }
}
