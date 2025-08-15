import { Entity, ManyToOne, JoinColumn, Index, PrimaryColumn } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { BaseEntity } from './base.entity';
import { Post } from './post.entity';
import { Tag } from './tag.entity';

/**
 * 게시물-태그 관계 엔티티
 *
 * 게시물과 태그 간의 다대다 관계를 관리하는 중간 테이블입니다.
 * 한 게시물은 여러 태그를 가질 수 있고, 한 태그는 여러 게시물에서 사용될 수 있습니다.
 */
@ObjectType()
@Entity('post_tags')
@Index(['postId', 'tagId'], { unique: true })
@Index(['postId'])
@Index(['tagId'])
@Index(['createdAt'])
export class PostTag extends BaseEntity {
  /**
   * 게시물 ID
   * 태그가 연결된 게시물의 ID입니다.
   */
  @PrimaryColumn({
    type: 'uuid',
    comment: '게시물 ID',
  })
  postId: string;

  /**
   * 태그 ID
   * 게시물에 연결된 태그의 ID입니다.
   */
  @PrimaryColumn({
    type: 'uuid',
    comment: '태그 ID',
  })
  tagId: string;

  // === 관계 설정 ===

  /**
   * 연결된 게시물
   * 다대일 관계: 여러 PostTag가 하나의 게시물에 연결됩니다.
   */
  @Field(() => Post, { description: '연결된 게시물' })
  @ManyToOne(() => Post, (post) => post.postTags, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'postId' })
  post: Post;

  /**
   * 연결된 태그
   * 다대일 관계: 여러 PostTag가 하나의 태그에 연결됩니다.
   */
  @Field(() => Tag, { description: '연결된 태그' })
  @ManyToOne(() => Tag, (tag) => tag.postTags, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tagId' })
  tag: Tag;

  // === 헬퍼 메서드 ===

  /**
   * 게시물-태그 관계 생성 정적 메서드
   * @param postId 게시물 ID
   * @param tagId 태그 ID
   * @returns PostTag 인스턴스
   */
  static create(postId: string, tagId: string): PostTag {
    const postTag = new PostTag();
    postTag.postId = postId;
    postTag.tagId = tagId;
    return postTag;
  }
}
