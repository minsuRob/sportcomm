import { Entity, Column, Index, Unique, ManyToOne, JoinColumn } from 'typeorm';
import { ObjectType, Field, registerEnumType, Int } from '@nestjs/graphql';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

/**
 * 상점 아이템 카테고리
 * FE와 동기화 필요. 새로운 카테고리 추가 시 FE/BE 모두 갱신.
 */
export enum ShopItemCategory {
  DECORATION = 'decoration',
  BOOST = 'boost',
  PREMIUM = 'premium',
  SPECIAL = 'special',
}

registerEnumType(ShopItemCategory, {
  name: 'ShopItemCategory',
  description: '상점 아이템 카테고리',
});

/**
 * 아이템 희귀도
 * 뱃지/스타일/효과 UI에 활용 가능
 */
export enum ShopItemRarity {
  COMMON = 'common',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
}

registerEnumType(ShopItemRarity, {
  name: 'ShopItemRarity',
  description: '상점 아이템 희귀도',
});

/**
 * UserItem
 *
 * 사용자 인벤토리(가방)에 보유된 아이템을 표현하는 엔티티.
 * - 동일 아이템 다회 구매 시 quantity 증가
 * - 삭제 대신 차감(미사용) 로직이 필요하면 별도 Mutation/Service 에서 처리
 *
 * 인덱스 / 제약 조건:
 * - (userId, itemId) Unique: 사용자별 한 레코드만 존재, 수량으로 관리
 * - userId 인덱스: 사용자 인벤토리 조회 빈도 최적화
 * - itemId 인덱스: 특정 아이템 보유자/통계 조회 대비
 */
@ObjectType({ description: '사용자 보유 아이템 엔티티' })
@Entity('user_items')
@Unique(['userId', 'itemId'])
@Index(['userId'])
@Index(['itemId'])
export class UserItem extends BaseEntity {
  /**
   * 소유자 사용자 ID
   */
  @Field({ description: '사용자 ID' })
  @Column({ type: 'uuid', comment: '소유자 사용자 ID' })
  userId!: string;

  /**
   * 아이템 식별자 (상점 카탈로그 ID)
   * 예: profile_frame_gold, post_boost_3days
   */
  @Field({ description: '아이템 ID (카탈로그 키)' })
  @Column({
    type: 'varchar',
    length: 120,
    comment: '아이템 고유 ID (카탈로그)',
  })
  itemId!: string;

  /**
   * 보유 수량 (누적)
   * 0 이하로 내려가면 비즈니스 로직 상 제거 고려
   */
  @Field(() => Int, { description: '보유 수량' })
  @Column({
    type: 'int',
    default: 1,
    unsigned: true,
    comment: '보유 수량 (누적)',
  })
  quantity!: number;

  /**
   * 마지막 구매/획득 시각
   * - 최근 순 정렬 / UI 표시에 사용
   */
  @Field({ description: '마지막 구매(획득) 시각' })
  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: '마지막 구매(획득) 시각',
  })
  lastPurchasedAt!: Date;

  /**
   * 아이템 카테고리 (캐시용 필드 - 정규화/조인 피하기 위한 중복 저장)
   * - 상점 카탈로그 변경 시 동기화 필요 (가격/할인 등은 매번 카탈로그로)
   */
  @Field(() => ShopItemCategory, {
    nullable: true,
    description: '아이템 카테고리 (캐시용, 선택적)',
  })
  @Column({
    type: 'varchar',
    length: 32,
    nullable: true,
    comment: '아이템 카테고리 (캐시/검색 최적화)',
  })
  category?: ShopItemCategory | null;

  /**
   * 아이콘 이모지/코드 (캐시)
   */
  @Field(() => String, {
    nullable: true,
    description: '아이콘 (이모지 등) 캐시',
  })
  @Column({
    type: 'varchar',
    length: 16,
    nullable: true,
    comment: '아이콘 이모지/코드 (표시 최적화 캐시)',
  })
  icon?: string | null;

  /**
   * 희귀도 (캐시)
   */
  @Field(() => ShopItemRarity, {
    nullable: true,
    description: '아이템 희귀도 (캐시)',
  })
  @Column({
    type: 'varchar',
    length: 16,
    nullable: true,
    comment: '희귀도 (표시/정렬 최적화 캐시)',
  })
  rarity?: ShopItemRarity | null;

  /**
   * 최초 구매가 (최근 구매 가격 기준 유지 or 최초 구매가)
   * - 통계/분석용. 동적 할인 구조가 있는 경우 도움이 됨.
   */
  @Field(() => Int, {
    nullable: true,
    description: '구매가 (기록용 - 최근 혹은 최초)',
  })
  @Column({
    type: 'int',
    nullable: true,
    comment: '마지막 또는 최초 구매 가격 (분석용)',
  })
  lastPurchasePrice?: number | null;

  /**
   * 확장 메타데이터 (JSON)
   * - 기간 제한, 사용 여부, 남은 지속시간 등 향후 확장 필드
   */
  @Column({
    type: 'jsonb',
    nullable: true,
    comment: '확장 메타데이터 (기간제, 속성 등)',
  })
  metadata?: Record<string, any> | null;

  /**
   * GraphQL 에서 metadata 필드를 문자열(JSON)로 안전 반환
   * - 기존 metadata 객체를 직접 노출하면 "String cannot represent value" 오류 발생
   * - name: 'metadata' 로 GraphQL 스키마 필드명을 동일하게 유지
   */
  @Field(() => String, {
    nullable: true,
    name: 'metadata',
    description: '확장 메타데이터(JSON 직렬 문자열)',
  })
  get metadataJson(): string | null {
    if (this.metadata == null) return null;
    try {
      return JSON.stringify(this.metadata);
    } catch {
      return null;
    }
  }

  /**
   * 소유자 관계 (지연 로딩 불필요한 단순 참조)
   */
  @ManyToOne(() => User, (user) => user.id, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'userId' })
  owner!: User;

  // ================== 비즈니스 헬퍼 메서드 ==================

  /**
   * 수량 증가 (기본 1)
   * @param amount 증가 수량
   */
  increment(amount: number = 1): void {
    if (amount <= 0) return;
    this.quantity += amount;
    this.lastPurchasedAt = new Date();
  }

  /**
   * 수량 차감 (0 이하 방지)
   * @param amount 차감 수량
   * @returns 차감 성공 여부
   */
  decrement(amount: number = 1): boolean {
    if (amount <= 0) return false;
    if (this.quantity < amount) return false;
    this.quantity -= amount;
    return true;
  }

  /**
   * 사용자가 소유한 특정 아이템인지 확인
   */
  isOwnedBy(userId: string): boolean {
    return this.userId === userId;
  }
}
