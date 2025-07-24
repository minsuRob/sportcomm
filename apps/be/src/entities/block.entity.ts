import { Entity, Column, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

/**
 * 차단 엔티티
 *
 * 사용자가 다른 사용자를 차단할 때 사용됩니다.
 * 차단된 사용자의 게시물은 피드에서 숨겨집니다.
 */
@ObjectType()
@Entity('blocks')
@Index(['blockerId'])
@Index(['blockedUserId'])
@Index(['createdAt'])
@Unique(['blockerId', 'blockedUserId']) // 동일한 차단 관계 중복 방지
export class Block extends BaseEntity {
  /**
   * 차단한 사용자 ID
   */
  @Column({
    type: 'uuid',
    comment: '차단한 사용자 ID',
  })
  blockerId: string;

  /**
   * 차단당한 사용자 ID
   */
  @Column({
    type: 'uuid',
    comment: '차단당한 사용자 ID',
  })
  blockedUserId: string;

  // === 관계 설정 ===

  /**
   * 차단한 사용자
   */
  @Field(() => User, { description: '차단한 사용자' })
  @ManyToOne(() => User, (user) => user.blocking, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blockerId' })
  blocker: User;

  /**
   * 차단당한 사용자
   */
  @Field(() => User, { description: '차단당한 사용자' })
  @ManyToOne(() => User, (user) => user.blockedBy, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blockedUserId' })
  blockedUser: User;

  // === 헬퍼 메서드 ===

  /**
   * 차단 관계가 활성화되어 있는지 확인
   */
  isActive(): boolean {
    return this.isEntityActive;
  }

  /**
   * 특정 사용자 간의 차단 관계인지 확인
   */
  isBlockBetween(userId1: string, userId2: string): boolean {
    return (
      (this.blockerId === userId1 && this.blockedUserId === userId2) ||
      (this.blockerId === userId2 && this.blockedUserId === userId1)
    );
  }
}
