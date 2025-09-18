import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  UserItem,
  ShopItemCategory,
  ShopItemRarity,
} from '../../entities/user-item.entity';
import { User } from '../../entities/user.entity';
import {
  ensurePurchasable,
  calculateFinalPrice,
  getCatalogItem,
} from './shop-catalog';
import { ProgressService } from '../progress/progress.service';

/**
 * 아이템 구매 결과 DTO
 */
export interface PurchaseResult {
  /** 업데이트(또는 새로 생성)된 사용자 아이템 */
  userItem: UserItem;
  /** 총 결제 포인트 (할인/수량 반영) */
  totalCost: number;
  /** 차감 후 사용자 잔여 포인트 */
  remainingPoints: number;
  /** 새로 생성된 아이템인지 여부 (true면 최초 보유) */
  created: boolean;
  /** 단일 아이템 최종 단가 (할인 적용 후) */
  unitFinalPrice: number;
}

/**
 * 인벤토리 서비스
 *
 * 기능 개요:
 * - 사용자 인벤토리(보유 아이템) 조회
 * - 아이템 구매 (포인트 차감 + 수량 증가)
 * - 카탈로그 정보와 동기화(카테고리/아이콘/희귀도 캐시)
 *
 * 설계 참고:
 * - 현재 카탈로그는 정적 상수. 추후 DB/어드민 연동 시 카탈로그 로더 분리 가능.
 * - 구매 프로세스는 (포인트 차감 → 인벤토리 갱신) 순서로 진행.
 *   인벤토리 저장 실패 시 포인트 환불(보상) 로직 포함 (베스트 에포트).
 *
 * 트랜잭션 전략:
 * - ProgressService.deductPoints 자체가 내부 트랜잭션을 사용.
 * - 이후 인벤토리 저장 실패 시 awardCustom 으로 포인트 복구 (완전한 원자성은 아님)
 *   => 추후 개선: 단일 트랜잭션으로 합치기 (직접 포인트 필드 수정 + 이벤트 발행)
 */
@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectRepository(UserItem)
    private readonly userItemRepository: Repository<UserItem>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly progressService: ProgressService,
  ) {}

  /**
   * 사용자 인벤토리 전체 조회 (최신 구매 순)
   * @param userId 사용자 ID
   */
  async getUserInventory(userId: string): Promise<UserItem[]> {
    await this.ensureUserExists(userId);

    return this.userItemRepository.find({
      where: { userId },
      order: { lastPurchasedAt: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * 특정 아이템 보유 레코드 조회
   * @param userId 사용자 ID
   * @param itemId 아이템 ID
   */
  async getUserItem(userId: string, itemId: string): Promise<UserItem | null> {
    return this.userItemRepository.findOne({
      where: { userId, itemId },
    });
  }

  /**
   * 아이템 구매
   *
   * 흐름:
   * 1. 수량/아이템 검증 및 가격 계산
   * 2. ProgressService.deductPoints 호출 (포인트 차감)
   * 3. 인벤토리 upsert (존재 시 수량 증가 / 없으면 생성)
   * 4. 실패 시 포인트 환불 시도 (awardCustom)
   *
   * @param userId 사용자 ID
   * @param itemId 아이템 ID (카탈로그 키)
   * @param quantity 수량 (기본 1)
   */
  async purchaseItem(
    userId: string,
    itemId: string,
    quantity: number = 1,
  ): Promise<PurchaseResult> {
    if (quantity <= 0) {
      throw new BadRequestException('구매 수량은 1 이상이어야 합니다.');
    }

    // 사용자 존재 검증
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    // 아이템 검증 및 최종 가격 결정
    const { item, finalPrice } = ensurePurchasable(itemId);
    const totalCost = finalPrice * quantity;

    // 1. 포인트 차감
    const deduct = await this.progressService.deductPoints(
      userId,
      totalCost,
      `상점 구매: ${item.name} x${quantity}`,
    );

    if (!deduct.success) {
      throw new BadRequestException(deduct.message);
    }

    let created = false;
    let saved: UserItem | undefined;

    try {
      // 2. 인벤토리 Upsert
      let userItem = await this.getUserItem(userId, itemId);

      if (!userItem) {
        userItem = this.userItemRepository.create({
          userId,
            // 카탈로그 캐시 필드 저장 (검색/정렬 최적화 목적)
          itemId,
          quantity,
          lastPurchasedAt: new Date(),
          category: item.category as ShopItemCategory,
          icon: item.icon,
          rarity: item.rarity as ShopItemRarity,
          lastPurchasePrice: finalPrice,
          metadata: item.metadata ? { ...item.metadata } : undefined,
        });
        created = true;
      } else {
        userItem.quantity += quantity;
        userItem.lastPurchasedAt = new Date();
        userItem.lastPurchasePrice = finalPrice;
        // 카탈로그 변경(아이콘/카테고리 등) 동기화
        userItem.category = item.category as ShopItemCategory;
        userItem.icon = item.icon;
        userItem.rarity = item.rarity as ShopItemRarity;
      }

      saved = await this.userItemRepository.save(userItem);
    } catch (e) {
      // 3. 인벤토리 저장 실패 => 포인트 환불 시도 (베스트 에포트)
      this.logger.error(
        `인벤토리 저장 실패. 포인트 환불 시도. userId=${userId}, itemId=${itemId}, error=${(e as any)?.message}`,
      );

      try {
        await this.progressService.awardCustom(
          userId,
          totalCost,
          `구매 실패 롤백: ${item.name}`,
        );
      } catch (refundError) {
        this.logger.error(
          `포인트 환불 실패(수동 개입 필요). userId=${userId}, totalCost=${totalCost}, err=${(refundError as any)?.message}`,
        );
      }

      throw new BadRequestException(
        '아이템 구매 처리 중 오류가 발생했습니다. (포인트는 자동 복구되었거나, 실패 시 관리자 문의)',
      );
    }

    return {
      userItem: saved!,
      totalCost,
      remainingPoints: deduct.remainingPoints,
      created,
      unitFinalPrice: finalPrice,
    };
  }

  /**
   * 카탈로그 변경 시 기존 보유 아이템 캐시 필드(카테고리/아이콘/희귀도) 재동기화
   * - 대량 작업 필요 시 별도 배치/커맨드로 전환 가능
   * @param userId 사용자 ID (선택 시 해당 사용자만)
   */
  async syncCatalogCache(userId?: string): Promise<number> {
    const where = userId ? { userId } : {};
    const items = await this.userItemRepository.find({ where });

    let updated = 0;

    for (const ui of items) {
      const catalog = getCatalogItem(ui.itemId);
      if (!catalog) continue; // 카탈로그에서 제거된 아이템은 그대로 둠 (레거시)
      const finalPrice = calculateFinalPrice(catalog);

      // 변경 필요 여부 검사
      if (
        ui.category !== (catalog.category as ShopItemCategory) ||
        ui.icon !== catalog.icon ||
        ui.rarity !== (catalog.rarity as ShopItemRarity) ||
        ui.lastPurchasePrice !== finalPrice
      ) {
        ui.category = catalog.category as ShopItemCategory;
        ui.icon = catalog.icon;
        ui.rarity = catalog.rarity as ShopItemRarity;
        ui.lastPurchasePrice = finalPrice;
        await this.userItemRepository.save(ui);
        updated++;
      }
    }

    return updated;
  }

  // ================== 내부 유틸 ==================

  private async ensureUserExists(userId: string): Promise<void> {
    const exists = await this.userRepository.exist({ where: { id: userId } });
    if (!exists) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }
  }
}
