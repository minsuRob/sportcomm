import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  DeleteDateColumn,
} from 'typeorm';
import { forwardRef } from '@nestjs/common';
import { Post } from '../posts/post.entity';
import { Comment } from '../comments/comment.entity';
import { Follow } from '../follows/follow.entity';
import { ChatMessage } from '../chat-message.entity';

/**
 * @description 사용자의 역할을 정의하는 열거형입니다.
 * - `USER`: 일반 사용자
 * - `INFLUENCER`: 영향력 있는 사용자 (인플루언서)
 * - `ADMIN`: 관리자
 */
export enum UserRole {
  USER = 'USER',
  INFLUENCER = 'INFLUENCER',
  ADMIN = 'ADMIN',
}

// GraphQL 스키마에 UserRole 열거형을 등록합니다.
registerEnumType(UserRole, {
  name: 'UserRole',
  description: '사용자의 역할 (일반 사용자, 인플루언서, 관리자)',
});

/**
 * @description 사용자 정보를 나타내는 엔티티입니다.
 * @summary 애플리케이션의 모든 활동의 주체가 됩니다.
 */
@ObjectType({ description: '사용자 정보' })
@Entity('users')
export class User {
  @Field(() => ID, { description: '사용자의 고유 ID (UUID)' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field({ description: '사용자의 닉네임 (고유값)' })
  @Column({ unique: true })
  nickname: string;

  @Field({ description: '사용자의 이메일 주소 (고유값)' })
  @Column({ unique: true })
  email: string;

  // `passwordHash`는 GraphQL 스키마에 노출되지 않아야 하므로 @Field() 데코레이터가 없습니다.
  @Column()
  passwordHash: string;

  @Field(() => UserRole, { description: '사용자의 역할' })
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Field({ nullable: true, description: '사용자 프로필 이미지 URL' })
  @Column({ name: 'profile_image_url', nullable: true })
  profileImageUrl?: string;

  @Field({ nullable: true, description: '사용자 자기소개' })
  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Field(() => [String], { description: '선호하는 스포츠 목록' })
  @Column('text', { array: true, default: [] })
  favoriteSports: string[];

  @Field(() => [String], { description: '선호하는 팀 목록' })
  @Column('text', { array: true, default: [] })
  favoriteTeams: string[];

  @Field(() => Date, { description: '계정 생성일' })
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Field(() => Date, { description: '마지막 정보 수정일' })
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  // `deletedAt`은 소프트 삭제에 사용되며, 일반적으로 GraphQL 스키마에 노출하지 않습니다.
  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt?: Date;

  // --- 관계 설정 ---

  @Field(() => [Post], { nullable: true, description: '사용자가 작성한 게시물 목록' })
  @OneToMany(() => Post, (post) => post.author)
  posts: Post[];

  @Field(() => [Comment], { nullable: true, description: '사용자가 작성한 댓글 목록' })
  @OneToMany(() => Comment, (comment) => comment.author)
  comments: Comment[];

  @Field(() => [ChatMessage], { nullable: true, description: '사용자가 보낸 채팅 메시지 목록' })
  @OneToMany(() => ChatMessage, (message) => message.author)
  chatMessages: ChatMessage[];

  // '내가 팔로우하는 사람들' 목록과의 관계
  @Field(() => [Follow], { nullable: true, description: '이 사용자가 팔로우하는 관계 목록' })
  @OneToMany(() => Follow, (follow) => follow.follower)
  following: Follow[];

  // '나를 팔로우하는 사람들' 목록과의 관계
  @Field(() => [Follow], { nullable: true, description: '이 사용자를 팔로우하는 관계 목록' })
  @OneToMany(() => Follow, (follow) => follow.following)
  followers: Follow[];
}
