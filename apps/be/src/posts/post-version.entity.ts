import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Post } from './post.entity';
import { User } from '../users/user.entity';
import { forwardRef } from '@nestjs/common';

/**
 * @description 게시물의 수정 이력을 나타내는 엔티티입니다.
 * @summary 게시물이 수정될 때마다 이전 버전의 내용을 백업하기 위해 생성됩니다.
 */
@ObjectType({ description: '게시물 수정 이력 정보' })
@Entity('post_versions')
// postId와 version의 조합이 고유하도록 설정하여 데이터 무결성을 보장합니다.
@Unique(['postId', 'version'])
export class PostVersion {
  @Field(() => ID, { description: '수정 이력의 고유 ID (UUID)' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field({ description: '원본 게시물의 ID' })
  @Column()
  postId: string;

  @Field({ description: '수정 당시의 작성자 ID' })
  @Column({ nullable: true })
  authorId: string;

  @Field(() => Int, { description: '게시물의 버전 번호' })
  @Column('int')
  version: number;

  @Field({ description: '해당 버전의 게시물 내용' })
  @Column('text')
  content: string;

  @Field({ nullable: true, description: '수정 사유' })
  @Column({ length: 255, nullable: true })
  editReason?: string;

  @Field(() => Date, { description: '버전 생성일' })
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  // --- 관계 설정 ---

  // PostVersion은 Post에 속합니다.
  @Field(() => forwardRef(() => Post), { description: '원본 게시물' })
  @ManyToOne(() => Post, (post) => post.versions, {
    onDelete: 'CASCADE', // 원본 게시물이 삭제되면 이력도 함께 삭제됩니다.
    nullable: false,
  })
  @JoinColumn({ name: 'postId' })
  post: Post;

  // PostVersion은 User(작성자)에 의해 생성될 수 있습니다.
  @Field(() => User, {
    nullable: true,
    description: '해당 버전을 생성한 사용자',
  })
  @ManyToOne(() => User, {
    onDelete: 'SET NULL', // 사용자가 삭제되어도 버전 기록은 남도록 설정합니다.
    nullable: true,
  })
  @JoinColumn({ name: 'authorId' })
  author: User;
}
