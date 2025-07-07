import { ObjectType, Field, ID } from '@nestjs/graphql';
import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
  Column,
} from 'typeorm';
import { User } from '../users/user.entity';
import { forwardRef } from '@nestjs/common';

@ObjectType()
@Entity('follows')
@Unique(['followerId', 'followingId'])
export class Follow {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ name: 'follower_id' })
  followerId: string;

  @ManyToOne(() => User, (user) => user.following, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'follower_id' })
  @Field(() => forwardRef(() => User))
  follower: User;

  @Field()
  @Column({ name: 'following_id' })
  followingId: string;

  @ManyToOne(() => User, (user) => user.followers, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'following_id' })
  @Field(() => forwardRef(() => User))
  following: User;

  @Field()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
