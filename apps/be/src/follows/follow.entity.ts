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

/**
 * @description 사용자 간의 팔로우 관계를 나타내는 엔티티입니다.
 * @summary 두 사용자(팔로워, 팔로잉)의 관계를 저장하는 조인 테이블 역할을 합니다.
 */
@ObjectType({ description: '팔로우 관계 정보' })
@Entity('follows')
// followerId와 followingId의 조합이 고유하도록 설정하여 중복 팔로우를 방지합니다.
@Unique(['followerId', 'followingId'])
export class Follow {
  @Field(() => ID, { description: '팔로우 관계의 고유 ID (UUID)' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field({ description: '팔로우를 하는 사용자의 ID' })
  @Column()
  followerId: string;

  @Field({ description: '팔로우를 당하는 사용자의 ID' })
  @Column()
  followingId: string;

  @Field(() => Date, { description: '팔로우 관계 생성일' })
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  // --- 관계 설정 ---

  // User 엔티티의 'following' 관계와 연결됩니다.
  @Field(() => User, { description: '팔로우를 하는 사용자' })
  @ManyToOne(() => User, (user) => user.following, {
    onDelete: 'CASCADE', // 사용자가 삭제되면 이 관계도 삭제됩니다.
    nullable: false,
  })
  @JoinColumn({ name: 'followerId' })
  follower: User;

  // User 엔티티의 'followers' 관계와 연결됩니다.
  @Field(() => User, { description: '팔로우를 당하는 사용자' })
  @ManyToOne(() => User, (user) => user.followers, {
    onDelete: 'CASCADE', // 사용자가 삭제되면 이 관계도 삭제됩니다.
    nullable: false,
  })
  @JoinColumn({ name: 'followingId' })
  following: User;
}
