import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
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
import { User } from '../users/user.entity';
import { Comment } from '../comments/comment.entity';
import { PostVersion } from './post-version.entity';
import { Media } from '../media/media.entity';
import { forwardRef } from '@nestjs/common';

export enum PostType {
  ANALYSIS = 'ANALYSIS',
  CHEERING = 'CHEERING',
  HIGHLIGHT = 'HIGHLIGHT',
}

@ObjectType()
@Entity('posts')
export class Post {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ length: 1000 })
  content: string;

  @Column({
    type: 'enum',
    enum: PostType,
    default: PostType.CHEERING,
  })
  @Field(() => PostType)
  type: PostType;

  @Field()
  @Column({ name: 'author_id' })
  authorId: string;

  @ManyToOne(() => User, (user) => user.posts, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'author_id' })
  @Field(() => forwardRef(() => User))
  author: User;

  @Field()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Field()
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Field({ nullable: true })
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date;

  @Field(() => Int)
  @Column({ name: 'view_count', default: 0 })
  viewCount: number;

  @Field(() => [Comment], { nullable: true })
  @OneToMany(() => Comment, (comment) => comment.post)
  comments: Comment[];

  @Field(() => [PostVersion], { nullable: true })
  @OneToMany(() => PostVersion, (version) => version.post)
  versions: PostVersion[];

  @Field(() => [Media], { nullable: true })
  @OneToMany(() => Media, (media) => media.post)
  media: Media[];
}
