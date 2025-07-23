import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Post } from './post.entity';

/**
 * 게시물 좋아요 엔티티
 *
 * 사용자가 게시물에 누른 좋아요 정보를 관리합니다.
 * 한 사용자는 특정 게시물에 단 한 번만 좋아요를 누를 수 있도록 유니크 제약조건을 적용합니다.
 */
@ObjectType()
@Entity('post_likes')
@Unique('UQ_USER_POST_LIKE', ['userId', 'postId']) // 유니크 제약조건: 사용자 ID와 게시물 ID 조합
@Index(['userId']) // 사용자 ID 인덱스
@Index(['postId']) // 게시물 ID 인덱스
export class PostLike extends BaseEntity {
  /**
   * 사용자 ID
   * 좋아요를 누른 사용자의 ID입니다.
   */
  @Column({
    type: 'uuid',
    comment: '좋아요를 누른 사용자 ID',
  })
  userId: string;

  /**
   * 게시물 ID
   * 좋아요를 누른 게시물의 ID입니다.
   */
  @Column({
    type: 'uuid',
    comment: '좋아요가 달린 게시물 ID',
  })
  postId: string;

  /**
   * 좋아요 활성 상태
   * 좋아요가 활성 상태인지 나타냅니다. (좋아요 취소 시 false)
   */
  @Field(() => Boolean, { description: '좋아요 활성 상태' })
  @Column({
    type: 'boolean',
    default: true,
    comment: '좋아요 활성 상태',
  })
  isLikeActive: boolean;

  // === 관계 설정 ===

  /**
   * 좋아요를 누른 사용자
   * 다대일 관계: 한 사용자는 여러 게시물에 좋아요를 누를 수 있습니다.
   */
  @Field(() => User, { description: '좋아요를 누른 사용자' })
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /**
   * 좋아요가 달린 게시물
   * 다대일 관계: 한 게시물은 여러 사용자로부터 좋아요를 받을 수 있습니다.
   */
  @Field(() => Post, { description: '좋아요가 달린 게시물' })
  @ManyToOne(() => Post, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post: Post;
}
