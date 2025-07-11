import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  DeleteDateColumn,
} from 'typeorm';
import { forwardRef } from '@nestjs/common';
import { User } from '../users/user.entity';
import { Comment } from '../comments/comment.entity';
import { PostVersion } from './post-version.entity';
import { Media } from '../media/media.entity';

/**
 * @description 게시물의 종류를 나타내는 열거형입니다.
 * - `ANALYSIS`: 분석글
 * - `CHEERING`: 응원글
 * - `HIGHLIGHT`: 하이라이트
 */
export enum PostType {
  ANALYSIS = 'ANALYSIS',
  CHEERING = 'CHEERING',
  HIGHLIGHT = 'HIGHLIGHT',
}

registerEnumType(PostType, {
  name: 'PostType',
  description: '게시물의 종류 (분석, 응원, 하이라이트)',
});

/**
 * @description 게시물 정보를 나타내는 핵심 엔티티입니다.
 */
@ObjectType({ description: '게시물 정보' })
@Entity('posts')
export class Post {
  @Field(() => ID, { description: '게시물의 고유 ID (UUID)' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field({ description: '게시물 내용' })
  @Column('text')
  content: string;

  @Field(() => PostType, { description: '게시물의 종류' })
  @Column({
    type: 'enum',
    enum: PostType,
  })
  type: PostType;

  @Field({ description: '작성자의 ID' })
  @Column()
  authorId: string;

  @Field(() => Date, { description: '게시물 생성일' })
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Field(() => Date, { description: '게시물 마지막 수정일' })
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt?: Date;

  // --- 관계 설정 ---

  @Field(() => User, { description: '게시물 작성자' })
  @ManyToOne(() => User, (user) => user.posts, {
    onDelete: 'CASCADE', // 사용자가 삭제되면 게시물도 함께 삭제
    nullable: false,
  })
  @JoinColumn({ name: 'authorId' })
  author: User;

  @Field(() => [Comment], { nullable: true, description: '게시물에 달린 댓글 목록' })
  @OneToMany(() => Comment, (comment) => comment.post)
  comments: Comment[];

  @Field(() => [PostVersion], { nullable: true, description: '게시물의 수정 이력' })
  @OneToMany(() => PostVersion, (version) => version.post)
  versions: PostVersion[];

  @Field(() => [Media], { nullable: true, description: '게시물에 첨부된 미디어 파일 목록' })
  @OneToMany(() => Media, (media) => media.post)
  media: Media[];
}
