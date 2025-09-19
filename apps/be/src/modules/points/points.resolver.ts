import {
  Args,
  Field,
  ID,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  registerEnumType,
  GraphQLISODateTime,
} from '@nestjs/graphql';
import {
  UseGuards,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Between } from 'typeorm';
import {
  PointTransaction,
  PointTransactionType,
  PointReferenceType,
} from '../../entities/point-transaction.entity';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import {
  CurrentUser,
  CurrentUserId,
  OptionalCurrentUser,
} from '../../common/decorators/current-user.decorator';
import { User, UserRole } from '../../entities/user.entity';

/**
 * ===== GraphQL 타입 / DTO 정의 =====
 */

@ObjectType('PointTransactionPage')
class PointTransactionPage {
  @Field(() => [PointTransaction], {
    description: '결과 아이템 목록(내림차순)',
  })
  items!: PointTransaction[];

  @Field(() => Int, { description: '요청한 개수(limit)' })
  limit!: number;

  @Field(() => String, {
    nullable: true,
    description: '다음 페이지 커서 (없으면 더 없음)',
  })
  nextCursor?: string | null;

  @Field(() => Boolean, { description: '다음 페이지 존재 여부' })
  hasNext!: boolean;
}

/**
 * 커서 구조
 * - createdAt(ISO) | id
 * - 최신순(createdAt DESC) 페이징 → 이전(createdAt < cursor.createdAt) 조건
 */

interface DecodedCursor {
  createdAt: Date;
  id: string;
}

registerEnumType(PointTransactionType, {
  name: 'PointTransactionType',
  description: '포인트 트랜잭션 타입',
});

registerEnumType(PointReferenceType, {
  name: 'PointReferenceType',
  description: '포인트 참조 리소스 타입',
});

@ObjectType('RecordPointResult')
class RecordPointResult {
  @Field(() => PointTransaction)
  transaction!: PointTransaction;

  @Field(() => Int, { description: '변경 후 사용자 잔여 포인트' })
  balanceAfter!: number;
}

@Resolver(() => PointTransaction)
export class PointsResolver {
  constructor(
    @InjectRepository(PointTransaction)
    private readonly pointTxRepo: Repository<PointTransaction>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /**
   * ===== 유틸: 커서 인코딩 / 디코딩 =====
   */
  private encodeCursor(entity: PointTransaction): string {
    return Buffer.from(
      `${entity.createdAt.toISOString()}|${entity.id}`,
      'utf8',
    ).toString('base64url');
  }

  private decodeCursor(cursor: string): DecodedCursor {
    try {
      const raw = Buffer.from(cursor, 'base64url').toString('utf8');
      const [iso, id] = raw.split('|');
      if (!iso || !id) throw new Error('invalid cursor format');
      return { createdAt: new Date(iso), id };
    } catch {
      throw new BadRequestException('커서 형식이 올바르지 않습니다.');
    }
  }

  /**
   * ===== 공통 조회 로직 =====
   * - 최신(createdAt DESC) 순
   * - 커서 기반 페이지네이션
   * - 추가 필터(type / isEarn / isSpend / 기간)
   */
  private async fetchTransactions(params: {
    userId: string;
    limit: number;
    cursor?: string | null;
    type?: PointTransactionType;
    isEarn?: boolean;
    isSpend?: boolean;
    from?: Date;
    to?: Date;
  }): Promise<PointTransactionPage> {
    const { userId, limit, cursor, type, isEarn, isSpend, from, to } = params;

    const where: any = { userId };

    if (type) where.type = type;

    if (isEarn && isSpend) {
      // 둘 다 true이면 필터 없음
    } else if (isEarn) {
      where.amount = Between(1, 10_000_000_000); // 양수
    } else if (isSpend) {
      where.amount = Between(-10_000_000_000, -1); // 음수
    }

    if (from && to) {
      where.createdAt = Between(from, to);
    } else if (from) {
      where.createdAt = Between(from, new Date());
    } else if (to) {
      where.createdAt = LessThan(to);
    }

    // 커서 조건
    if (cursor) {
      const decoded = this.decodeCursor(cursor);
      // createdAt 이 더 작은(과거) 것
      where.createdAt = where.createdAt
        ? Between(
            new Date('1970-01-01T00:00:00.000Z'),
            new Date(
              Math.min(
                (where.createdAt as any).high?.getTime?.() ??
                  (where.createdAt as Date).getTime(),
                decoded.createdAt.getTime() - 1,
              ),
            ),
          )
        : LessThan(decoded.createdAt);
    }

    const items = await this.pointTxRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: limit + 1, // hasNext 판별 위해 +1
    });

    const hasNext = items.length > limit;
    const slice = hasNext ? items.slice(0, limit) : items;
    const nextCursor = hasNext
      ? this.encodeCursor(slice[slice.length - 1])
      : null;

    return {
      items: slice,
      hasNext,
      nextCursor,
      limit,
    };
  }

  /**
   * 자신(현재 사용자)의 포인트 이력 조회
   */
  @UseGuards(GqlAuthGuard)
  @Query(() => PointTransactionPage, { name: 'getMyPointTransactions' })
  async getMyPointTransactions(
    @CurrentUserId() userId: string,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
    @Args('cursor', { type: () => String, nullable: true }) cursor?: string,
    @Args('type', {
      type: () => PointTransactionType,
      nullable: true,
    })
    type?: PointTransactionType,
    @Args('isEarn', { type: () => Boolean, nullable: true }) isEarn?: boolean,
    @Args('isSpend', { type: () => Boolean, nullable: true })
    isSpend?: boolean,
    @Args('from', { type: () => GraphQLISODateTime, nullable: true })
    from?: Date,
    @Args('to', { type: () => GraphQLISODateTime, nullable: true }) to?: Date,
  ): Promise<PointTransactionPage> {
    if (limit < 1 || limit > 100)
      throw new BadRequestException('limit 은 1~100 사이여야 합니다.');
    return this.fetchTransactions({
      userId,
      limit,
      cursor,
      type,
      isEarn,
      isSpend,
      from,
      to,
    });
  }

  /**
   * 특정 사용자 포인트 이력 조회 (관리자 또는 본인)
   */
  @UseGuards(GqlAuthGuard)
  @Query(() => PointTransactionPage, { name: 'getPointTransactions' })
  async getPointTransactions(
    @CurrentUser() currentUser: User,
    @Args('userId', { type: () => ID }) userId: string,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
    @Args('cursor', { type: () => String, nullable: true }) cursor?: string,
    @Args('type', {
      type: () => PointTransactionType,
      nullable: true,
    })
    type?: PointTransactionType,
    @Args('isEarn', { type: () => Boolean, nullable: true }) isEarn?: boolean,
    @Args('isSpend', { type: () => Boolean, nullable: true })
    isSpend?: boolean,
    @Args('from', { type: () => GraphQLISODateTime, nullable: true })
    from?: Date,
    @Args('to', { type: () => GraphQLISODateTime, nullable: true }) to?: Date,
  ): Promise<PointTransactionPage> {
    if (currentUser.id !== userId && currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('본인 또는 관리자만 조회할 수 있습니다.');
    }
    if (limit < 1 || limit > 100)
      throw new BadRequestException('limit 은 1~100 사이여야 합니다.');
    return this.fetchTransactions({
      userId,
      limit,
      cursor,
      type,
      isEarn,
      isSpend,
      from,
      to,
    });
  }

  /**
   * (관리자) 수동 조정 트랜잭션 기록
   * - amount 양수: 적립, 음수: 차감
   * - 내부적으로 User.points 갱신 + 이력 남김
   * - atomic 보장을 위해 트랜잭션 사용 (간단히 manager.transaction 사용)
   */
  @UseGuards(GqlAuthGuard, AdminGuard)
  @Mutation(() => RecordPointResult, { name: 'adminRecordPointAdjustment' })
  async adminRecordPointAdjustment(
    @Args('targetUserId', { type: () => ID }) targetUserId: string,
    @Args('amount', { type: () => Int }) amount: number,
    @Args('description', { type: () => String, nullable: true })
    description?: string,
  ): Promise<RecordPointResult> {
    if (amount === 0)
      throw new BadRequestException('amount 는 0 이 될 수 없습니다.');
    const user = await this.userRepo.findOne({ where: { id: targetUserId } });
    if (!user) throw new BadRequestException('사용자를 찾을 수 없습니다.');

    // 트랜잭션
    const newTx = await this.pointTxRepo.manager.transaction(async (tm) => {
      const refreshed = await tm.findOne(User, {
        where: { id: targetUserId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!refreshed)
        throw new BadRequestException('사용자를 찾을 수 없습니다.');

      const before = refreshed.points || 0;
      const after = before + amount;
      if (after < 0) {
        throw new BadRequestException('차감 결과 포인트가 음수가 됩니다.');
      }
      refreshed.points = after;
      await tm.save(refreshed);

      const tx = tm.create(PointTransaction, {
        userId: refreshed.id,
        amount,
        balanceAfter: after,
        type: PointTransactionType.ADJUSTMENT,
        description: description || '관리자 수동 조정',
      });
      await tm.save(tx);
      return tx;
    });

    return {
      transaction: newTx,
      balanceAfter: newTx.balanceAfter,
    };
  }
}

/*
필요 추가 사항 (별도 작업):
1. ProgressService / 상점 구매 로직에서 PointTransaction insert 연동
2. PointsModule 생성 후 AppModule import
3. 프런트엔드:
   - getMyPointTransactions 쿼리 적용
   - 무한 스크롤 또는 "더보기" 버튼으로 nextCursor 활용
4. 성능:
   - 대량 데이터 누적 시 파티셔닝 또는 보관 정책 고려
*/
