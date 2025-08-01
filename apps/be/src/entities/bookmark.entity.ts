import { Entity, Column, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Post } from './post.entity';

/**
 * 북마크 엔티티
 *
 * 사용자가 게시물을 북마크하는 기능을 관리합니다.
 * 사용자는 관심 있는 게시물을 북마크하여 나중에 쉽게 찾아볼 수 있습니다.
 */
@ObjectType()
@Entity('bookmarks')
@Unique(['userId', 'postId']) // 동일한 사용자가 같은 게시물을 중복 북마크하는 것을 방지
@Index(['userId'])
@Index(['postId'])
@Index(['createdAt'])
export class Bookmark extends BaseEntity {
  /**
   * 북마크한 사용자의 ID
   */
  @Column({
    type: 'uuid',
    comment: '북마크한 사용자 ID',
  })
  userId: string;

  /**
   * 북마크된 게시물의 ID
   */
  @Column({
    type: 'uuid',
    comment: '북마크된 게시물 ID',
  })
  postId: string;

  // === 관계 설정 ===

  /**
   * 북마크한 사용자
   * 다대일 관계: 여러 북마크가 한 사용자에 의해 생성됩니다.
   */
  @Field(() => User, { description: '북마크한 사용자' })
  @ManyToOne(() => User, (user) => user.bookmarks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  /**
   * 북마크된 게시물
   * 다대일 관계: 여러 북마크가 한 게시물에 대해 생성됩니다.
   */
  @Field(() => Post, { description: '북마크된 게시물' })
  @ManyToOne(() => Post, (post) => post.bookmarks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'postId' })
  post: Post;

  // === 헬퍼 메서드 ===

  /**
   * 북마크가 특정 사용자에 의해 생성되었는지 확인하는 메서드
   * @param userId 확인할 사용자의 ID
   * @returns 해당 사용자의 북마크인 경우 true, 아닌 경우 false
   */
  isOwnedBy(userId: string): boolean {
    return this.userId === userId;
  }

  /**
   * 북마크가 특정 게시물에 대한 것인지 확인하는 메서드
   * @param postId 확인할 게시물의 ID
   * @returns 해당 게시물의 북마크인 경우 true, 아닌 경우 false
   */
  isForPost(postId: string): boolean {
    return this.postId === postId;
  }
}
