import { Entity, Column, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
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
@Unique(['userId', 'postId']) // 간단한 유니크 제약조건 적용
@Index(['userId'])
@Index(['postId'])
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

  // === 관계 설정 ===

  /**
   * 좋아요를 누른 사용자
   */
  @Field(() => User)
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /**
   * 좋아요가 달린 게시물
   */
  @Field(() => Post)
  @ManyToOne(() => Post, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post: Post;
}
