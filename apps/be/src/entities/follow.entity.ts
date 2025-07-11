import { Entity, Column, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

/**
 * 팔로우 엔티티
 *
 * 사용자 간의 팔로우 관계를 관리합니다.
 * 한 사용자가 다른 사용자를 팔로우하는 관계를 나타내며,
 * 중복 팔로우를 방지하고 팔로우 관계의 메타데이터를 저장합니다.
 */
@ObjectType()
@Entity('follows')
@Index(['followerId'])
@Index(['followingId'])
@Index(['createdAt'])
@Unique(['followerId', 'followingId'])
export class Follow extends BaseEntity {
  /**
   * 팔로우 상태
   * 팔로우 관계의 현재 상태를 나타냅니다.
   */
  @Field(() => Boolean, { description: '팔로우 활성 상태' })
  @Column({
    type: 'boolean',
    default: true,
    comment: '팔로우 활성 상태',
  })
  isFollowActive: boolean;

  /**
   * 팔로우 알림 설정
   * 팔로우한 사용자의 새 게시물에 대한 알림을 받을지 여부입니다.
   */
  @Field(() => Boolean, { description: '팔로우 알림 설정' })
  @Column({
    type: 'boolean',
    default: true,
    comment: '팔로우 알림 설정',
  })
  notificationEnabled: boolean;

  /**
   * 팔로우하는 사용자 ID
   * 팔로우를 시작한 사용자의 ID입니다.
   */
  @Column({
    type: 'uuid',
    comment: '팔로우하는 사용자 ID',
  })
  followerId: string;

  /**
   * 팔로우 받는 사용자 ID
   * 팔로우를 받는 사용자의 ID입니다.
   */
  @Column({
    type: 'uuid',
    comment: '팔로우 받는 사용자 ID',
  })
  followingId: string;

  // === 관계 설정 ===

  /**
   * 팔로우하는 사용자 (팔로워)
   * 다대일 관계: 여러 팔로우 관계가 한 사용자에 의해 생성됩니다.
   */
  @Field(() => User, { description: '팔로우하는 사용자' })
  @ManyToOne(() => User, (user) => user.following, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'followerId' })
  follower: User;

  /**
   * 팔로우 받는 사용자 (팔로잉)
   * 다대일 관계: 여러 팔로우 관계가 한 사용자를 대상으로 합니다.
   */
  @Field(() => User, { description: '팔로우 받는 사용자' })
  @ManyToOne(() => User, (user) => user.followers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'followingId' })
  following: User;

  // === 헬퍼 메서드 ===

  /**
   * 팔로우 관계가 활성화되어 있는지 확인하는 메서드
   * @returns 활성화된 경우 true, 비활성화된 경우 false
   */
  isFollowActiveStatus(): boolean {
    return this.isFollowActive && this.isFollowActive;
  }

  /**
   * 팔로우 알림이 활성화되어 있는지 확인하는 메서드
   * @returns 알림이 활성화된 경우 true, 비활성화된 경우 false
   */
  isNotificationActive(): boolean {
    return this.notificationEnabled && this.isFollowActive;
  }

  /**
   * 팔로우 상태 토글 메서드
   * 팔로우 관계를 활성화/비활성화합니다.
   */
  toggleActive(): void {
    this.isFollowActive = !this.isFollowActive;
  }

  /**
   * 팔로우 알림 설정 토글 메서드
   * 팔로우 알림을 활성화/비활성화합니다.
   */
  toggleNotification(): void {
    this.notificationEnabled = !this.notificationEnabled;
  }

  /**
   * 팔로우 관계 비활성화 메서드
   * 언팔로우 시 사용됩니다.
   */
  deactivate(): void {
    this.isFollowActive = false;
  }

  /**
   * 팔로우 관계 활성화 메서드
   * 다시 팔로우 시 사용됩니다.
   */
  activate(): void {
    this.isFollowActive = true;
  }

  /**
   * 팔로우 관계 정보 요약 반환 메서드
   * @returns 팔로우 관계 요약 정보
   */
  getSummary(): string {
    return `${this.follower?.nickname || 'Unknown'} follows ${this.following?.nickname || 'Unknown'}`;
  }

  /**
   * 팔로우 관계가 유효한지 확인하는 메서드
   * 자기 자신을 팔로우하는 경우는 유효하지 않습니다.
   * @returns 유효한 경우 true, 유효하지 않은 경우 false
   */
  isValidFollow(): boolean {
    return this.followerId !== this.followingId;
  }

  /**
   * 팔로우 관계 지속 시간 계산 메서드
   * @returns 팔로우 관계가 지속된 일 수
   */
  getFollowDuration(): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this.createdAt.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * 상호 팔로우 여부 확인을 위한 메서드
   * 실제 구현에서는 데이터베이스 쿼리를 통해 확인해야 합니다.
   * @returns 상호 팔로우인 경우 true, 아닌 경우 false
   */
  isMutualFollow(): boolean {
    // 이 메서드는 서비스 레이어에서 구현되어야 합니다.
    // 현재는 플레이스홀더로 false를 반환합니다.
    return false;
  }
}
