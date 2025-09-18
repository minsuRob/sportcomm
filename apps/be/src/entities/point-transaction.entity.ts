import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { ObjectType, Field, Int, registerEnumType, ID } from '@nestjs/graphql';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

/**
 * 포인트 트랜잭션 타입
 *
 * - 적립 / 차감 발생 원인을 표준화
 * - 분석/집계/필터링에 사용
 */
export enum PointTransactionType {
  ATTENDANCE = 'ATTENDANCE',          // 출석체크 적립
  POST_CREATE = 'POST_CREATE',        // 게시글 작성 적립
  COMMENT_CREATE = 'COMMENT_CREATE',  // 댓글 작성 적립
  CHAT_MESSAGE = 'CHAT_MESSAGE',      // 채팅/메시지 적립
  SHOP_PURCHASE = 'SHOP_PURCHASE',    // 상점 구매 차감
  ADJUSTMENT = 'ADJUSTMENT',          // 관리자 수동 조정 (가/감)
}

/**
 * 참조 리소스 타입 (선택적)
 * - 특정 원본 엔티티와 연결하면 분석/추적 쉬움
 */
export enum PointReferenceType {
  POST = 'POST',
  COMMENT = 'COMMENT',
  CHAT_MESSAGE = 'CHAT_MESSAGE',
  SHOP_ITEM = 'SHOP_ITEM',
  ATTENDANCE = 'ATTENDANCE',
  SYSTEM = 'SYSTEM',
}

registerEnumType(PointTransactionType, {
  name: 'PointTransactionType',
  description: '포인트 트랜잭션(적립/차감) 타입',
});

registerEnumType(PointReferenceType, {
  name: 'PointReferenceType',
  description: '포인트 트랜잭션이 참조하는 리소스 타입',
});

/**
 * PointTransaction
 *
 * 사용자 포인트 변동(적립/차감) 이력을 영구 저장.
 * - amount: 변동량 (양수=적립, 음수=차감)
 * - balanceAfter: 이 트랜잭션 적용 직후 사용자의 잔여 포인트 (정합성 & 재계산 용이)
 * - type: 표준화된 원인
 * - description: 사람이 읽기 쉬운 설명 (다국어 분리 필요 시 key 전략 고려)
 * - referenceType / referenceId: 원본 리소스 (게시글, 댓글, 상점아이템 등)
 *
 * 인덱스 전략:
 * - userId + createdAt DESC 쿼리 (최근 이력 페이징)
 * - type 필터 빈도 시 (userId, type, createdAt) 복합 인덱스 필요할 수 있음 (추후)
 *
 * 트랜잭션 기록 시 주의:
 * - ProgressService 및 상점 구매 로직에서 함께 호출
 * - 가능하면 동일 트랜잭션 내부에서 User.points 갱신 + 본 레코드 insert
 */
@ObjectType({ description: '사용자 포인트 변동(적립/차감) 이력' })
@Entity('point_transactions')
@Index(['userId', 'createdAt'])
@Index(['userId', 'type', 'createdAt'])
export class PointTransaction extends BaseEntity {
  /**
   * 사용자 ID
   */
  @Field(() => ID, { description: '대상 사용자 ID' })
  @Column({ type: 'uuid', nullable: false, comment: '사용자 ID' })
  userId!: string;

  /**
   * 변동 포인트 (양수=적립, 음수=차감)
   */
  @Field(() => Int, { description: '변동 포인트 (양수=적립, 음수=차감)' })
  @Column({ type: 'int', nullable: false, comment: '변동 포인트 (양수=적립 / 음수=차감)' })
  amount!: number;

  /**
   * 변동 직후 사용자 잔여 포인트 (스냅샷)
   */
  @Field(() => Int, { description: '변동 직후 잔여 포인트(스냅샷)' })
  @Column({ type: 'int', nullable: false, comment: '이 트랜잭션 반영 직후 잔여 포인트' })
  balanceAfter!: number;

  /**
   * 트랜잭션 타입
   */
  @Field(() => PointTransactionType, { description: '트랜잭션 타입' })
  @Column({
    type: 'varchar',
    length: 40,
    nullable: false,
    comment: '포인트 트랜잭션 타입',
  })
  type!: PointTransactionType;

  /**
   * 사람이 읽기 쉬운 설명
   * - 다국어 지원 필요 시 별도 key(or message template) 저장 고려
   */
  @Field(() => String, { description: '설명', nullable: true })
  @Column({
    type: 'varchar',
    length: 200,
    nullable: true,
    comment: '사람이 읽기 쉬운 설명',
  })
  description?: string | null;

  /**
   * 참조 리소스 타입 (선택적)
   */
  @Field(() => PointReferenceType, {
    nullable: true,
    description: '참조 리소스 타입',
  })
  @Column({
    type: 'varchar',
    length: 40,
    nullable: true,
    comment: '참조 리소스 타입',
  })
  referenceType?: PointReferenceType | null;

  /**
   * 참조 리소스 ID (선택적)
   * 예) 게시글 ID, 댓글 ID, 상점 아이템 ID 등
   */
  @Field(() => String, {
    nullable: true,
    description: '참조 리소스 ID (게시글/댓글/아이템 등)',
  })
  @Column({
    type: 'varchar',
    length: 120,
    nullable: true,
    comment: '참조 리소스 ID',
  })
  referenceId?: string | null;

  /**
   * 원시 메타데이터 (확장 필드: JSON)
   * - 향후 이벤트 세부 속성 (예: 부스트 기간, 아이템 속성) 저장
   * - FE 표시는 description / type 중심, metadata 는 내부 사용
   */
  @Field(() => String, {
    nullable: true,
    description: '확장 메타데이터(JSON 직렬)',
  })
  @Column({
    type: 'jsonb',
    nullable: true,
    comment: '추가 메타데이터(JSON)',
  })
  metadata?: Record<string, any> | null;

  /**
   * 사용자 관계
   */
  @ManyToOne(() => User, (user) => user.id, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'userId' })
  user!: User;

  // ================== 헬퍼 메서드 ==================

  /**
   * 적립 여부
   */
  @Field(() => Boolean, { description: '적립 트랜잭션 여부' })
  get isEarn(): boolean {
    return this.amount > 0;
  }

  /**
   * 차감 여부
   */
  @Field(() => Boolean, { description: '차감 트랜잭션 여부' })
  get isSpend(): boolean {
    return this.amount < 0;
  }

  /**
   * 사람이 읽기 쉬운 요약 (클라이언트 간단 출력용)
   */
  toHumanSummary(): string {
    const sign = this.amount > 0 ? '+' : '';
    return `${sign}${this.amount}P (${this.type})`;
  }

  /**
   * 팩토리: 적립
   */
  static earn(params: {
    userId: string;
    amount: number;
    balanceAfter: number;
    type: PointTransactionType;
    description?: string;
    referenceType?: PointReferenceType;
    referenceId?: string;
    metadata?: Record<string, any>;
  }): PointTransaction {
    if (params.amount <= 0) {
      throw new Error('적립 amount 는 양수여야 합니다.');
    }
    return this.createBase(params);
  }

  /**
   * 팩토리: 차감
   */
  static spend(params: {
    userId: string;
    amount: number;
    balanceAfter: number;
    type: PointTransactionType;
    description?: string;
    referenceType?: PointReferenceType;
    referenceId?: string;
    metadata?: Record<string, any>;
  }): PointTransaction {
    if (params.amount >= 0) {
      throw new Error('차감 amount 는 음수여야 합니다.');
    }
    return this.createBase(params);
  }

  /**
   * 내부 공통 생성 로직
   */
  private static createBase(params: {
    userId: string;
    amount: number;
    balanceAfter: number;
    type: PointTransactionType;
    description?: string;
    referenceType?: PointReferenceType;
    referenceId?: string;
    metadata?: Record<string, any>;
  }): PointTransaction {
    const t = new PointTransaction();
    t.userId = params.userId;
    t.amount = params.amount;
    t.balanceAfter = params.balanceAfter;
    t.type = params.type;
    t.description = params.description;
    t.referenceType = params.referenceType;
    t.referenceId = params.referenceId;
    t.metadata = params.metadata;
    return t;
  }
}

/*
추가 안내:
1) ProgressService / 상점 구매 로직에서 포인트 변동 시
   - 사용자 최신 잔액을 반영한 balanceAfter 와 함께 PointTransaction 저장
2) 조회 GraphQL 예시:
   type Query {
     getPointTransactions(userId: ID!, limit: Int = 20, cursor: String): PointTransactionPage!
   }
3) 프런트:
   - 적립/차감 여부에 따라 색상(+ / -) 구분
4) 확장:
   - 일일 합계/주간 합계 materialized view 고려 가능
*/
