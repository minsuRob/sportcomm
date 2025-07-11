import { ObjectType, Field, ID } from '@nestjs/graphql';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';
import { forwardRef } from '@nestjs/common';
import { User } from '../users/user.entity';
import { Post } from '../posts/post.entity';

/**
 * @description 댓글 정보를 나타내는 엔티티입니다.
 * @summary 게시물에 대한 사용자들의 반응을 저장합니다.
 */
@ObjectType({ description: '댓글 정보' })
@Entity('comments')
export class Comment {
  @Field(() => ID, { description: '댓글의 고유 ID (UUID)' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field({ description: '댓글 내용' })
  @Column('text')
  content: string;

  @Field({ description: '작성자의 ID' })
  @Column()
  authorId: string;

  @Field({ description: '게시물의 ID' })
  @Column()
  postId: string;

  @Field(() => ID, { nullable: true, description: '부모 댓글의 ID (대댓글인 경우)' })
  @Column({ nullable: true })
  parentCommentId?: string;

  @Field(() => Date, { description: '댓글 생성일' })
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Field(() => Date, { description: '댓글 마지막 수정일' })
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt?: Date;

  // --- 관계 설정 ---

  @Field(() => User, { description: '댓글 작성자' })
  @ManyToOne(() => User, (user) => user.comments, {
    onDelete: 'CASCADE', // 사용자가 삭제되면 댓글도 함께 삭제
    nullable: false,
  })
  @JoinColumn({ name: 'authorId' })
  author: User;

  @Field(() => Post, { description: '댓글이 달린 게시물' })
  @ManyToOne(() => Post, (post) => post.comments, {
    onDelete: 'CASCADE', // 게시물이 삭제되면 댓글도 함께 삭제
    nullable: false,
  })
  @JoinColumn({ name: 'postId' })
  post: Post;

  @Field(() => Comment, { nullable: true, description: '부모 댓글 (대댓글인 경우)' })
  @ManyToOne(() => Comment, (comment) => comment.childComments, {
    onDelete: 'CASCADE', // 부모 댓글이 삭제되면 자식 댓글도 함께 삭제
    nullable: true,
  })
  @JoinColumn({ name: 'parentCommentId' })
  parentComment: Comment;

  @Field(() => [Comment], { nullable: true, description: '이 댓글에 달린 대댓글 목록' })
  @OneToMany(() => Comment, (comment) => comment.parentComment)
  childComments: Comment[];
}
