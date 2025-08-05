import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserRole } from '../../entities/user.entity';
import { AuthService } from './auth.service';
import { ObjectType, Field, Int } from '@nestjs/graphql';

/**
 * Supabase 동기화 통계 응답 타입
 */
@ObjectType()
export class SupabaseSyncStats {
  @Field(() => Int, { description: '전체 사용자 수' })
  totalUsers: number;

  @Field(() => Int, { description: '동기화된 사용자 수' })
  syncedUsers: number;

  @Field(() => Int, { description: '동기화되지 않은 사용자 수' })
  unsyncedUsers: number;

  @Field(() => Boolean, { description: 'Supabase 연결 상태' })
  supabaseConnected: boolean;
}

/**
 * 전체 사용자 동기화 결과 타입
 */
@ObjectType()
export class BulkSyncResult {
  @Field(() => Int, { description: '성공한 동기화 수' })
  success: number;

  @Field(() => Int, { description: '실패한 동기화 수' })
  failed: number;

  @Field(() => Int, { description: '전체 처리 대상 수' })
  total: number;
}

/**
 * 인증 관리자 리졸버
 *
 * 관리자 전용 인증 관련 기능을 제공합니다.
 * Supabase 동기화 관리, 사용자 통계 등의 기능을 포함합니다.
 */
@Resolver()
@UseGuards(GqlAuthGuard)
export class AuthAdminResolver {
  constructor(private readonly authService: AuthService) {}

  /**
   * Supabase 동기화 통계 조회
   * 관리자만 접근 가능
   */
  @Query(() => SupabaseSyncStats, {
    description: 'Supabase 동기화 통계 조회 (관리자 전용)',
  })
  async getSupabaseSyncStats(
    @CurrentUser() currentUser: User,
  ): Promise<SupabaseSyncStats> {
    // 관리자 권한 확인
    if (currentUser.role !== UserRole.ADMIN) {
      throw new Error('관리자만 접근할 수 있습니다.');
    }

    return await this.authService.getSupabaseSyncStats();
  }

  /**
   * 특정 사용자를 Supabase와 동기화
   * 관리자만 실행 가능
   */
  @Mutation(() => Boolean, {
    description: '특정 사용자를 Supabase와 동기화 (관리자 전용)',
  })
  async syncUserWithSupabase(
    @Args('userId') userId: string,
    @CurrentUser() currentUser: User,
  ): Promise<boolean> {
    // 관리자 권한 확인
    if (currentUser.role !== UserRole.ADMIN) {
      throw new Error('관리자만 실행할 수 있습니다.');
    }

    return await this.authService.syncUserWithSupabase(userId);
  }

  /**
   * 모든 기존 사용자를 Supabase와 동기화
   * 관리자만 실행 가능 (주의: 시간이 오래 걸릴 수 있음)
   */
  @Mutation(() => BulkSyncResult, {
    description: '모든 기존 사용자를 Supabase와 동기화 (관리자 전용)',
  })
  async syncAllUsersWithSupabase(
    @CurrentUser() currentUser: User,
  ): Promise<BulkSyncResult> {
    // 관리자 권한 확인
    if (currentUser.role !== UserRole.ADMIN) {
      throw new Error('관리자만 실행할 수 있습니다.');
    }

    return await this.authService.syncAllUsersWithSupabase();
  }

  /**
   * 사용자 통계 조회
   * 관리자만 접근 가능
   */
  @Query(() => String, {
    description: '사용자 통계 조회 (관리자 전용)',
  })
  async getUserStats(@CurrentUser() currentUser: User): Promise<string> {
    // 관리자 권한 확인
    if (currentUser.role !== UserRole.ADMIN) {
      throw new Error('관리자만 접근할 수 있습니다.');
    }

    const stats = await this.authService.getUserStats();
    const supabaseStats = await this.authService.getSupabaseSyncStats();

    return JSON.stringify(
      {
        ...stats,
        supabase: supabaseStats,
      },
      null,
      2,
    );
  }
}
