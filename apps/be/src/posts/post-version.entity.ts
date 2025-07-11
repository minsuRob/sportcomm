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

@ObjectType()
@Entity('post_versions')
@Unique(['postId', 'version'])
export class PostVersion {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ name: 'post_id' })
  postId: string;

  // This is where the circular dependency occurs. PostVersion refers to Post,
  // and Post refers to PostVersion. Using forwardRef breaks this cycle for GraphQL's schema builder.
  @Field(() => forwardRef(() => Post))
  @ManyToOne(() => Post, (post) => post.versions, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'post_id' })
  post: Post;

  @Field({ nullable: true })
  @Column({ name: 'author_id', nullable: true })
  authorId: string;

  @Field(() => forwardRef(() => User), { nullable: true })
  @ManyToOne(() => User, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Field(() => Int)
  @Column()
  version: number;

  @Field()
  @Column({ type: 'text' })
  content: string;

  @Field({ nullable: true })
  @Column({ name: 'edit_reason', type: 'varchar', length: 255, nullable: true })
  editReason: string;

  @Column({ name: 'diff_content', type: 'jsonb', nullable: true })
  diffContent: object; // Not exposed to GraphQL

  @Field()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
