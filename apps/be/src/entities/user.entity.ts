import { Entity, Column, OneToMany, Index } from 'typeorm';
import { ObjectType, Field, registerEnumType } from '@nestjs/graphql';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { BaseEntity } from './base.entity';
import { Post } from './post.entity';
import { Comment } from './comment.entity';
import { Follow } from './follow.entity';
import { ChatMessage } from './chat-message.entity';
import { PostLike } from './post-like.entity';
import { Block } from './block.entity';
import { Bookmark } from './bookmark.entity';
import { UserTeam } from './user-team.entity';

/**
 * 사용자 역할 열거형
 * 시스템 내에서 사용자의 권한과 역할을 정의합니다.
 */
export enum UserRole {
  /** 일반 사용자 */
  USER = 'USER',
  /** 인플루언서 (검증된 사용자) */
  INFLUENCER = 'INFLUENCER',
  /** 관리자 */
  ADMIN = 'ADMIN',
}

// GraphQL 스키마에 UserRole enum 등록
registerEnumType(UserRole, {
  name: 'UserRole',
  description: '사용자 역할',
  valuesMap: {
    USER: {
      description: '일반 사용자',
    },
    INFLUENCER: {
      description: '인플루언서 (검증된 사용자)',
    },
    ADMIN: {
      description: '관리자',
    },
  },
});

/**
 * 사용자 엔티티
 *
 * 스포츠 커뮤니티의 모든 사용자 정보를 관리합니다.
 * 게시물 작성, 댓글, 팔로우, 채팅 등 모든 활동의 주체가 됩니다.
 */
@ObjectType()
@Entity('users')
@Index(['email'], { unique: true })
@Index(['nickname'], { unique: true })
export class User extends BaseEntity {
  /**
   * 사용자 닉네임
   * 고유값이며 다른 사용자와 중복될 수 없습니다.
   */
  @Field(() => String, { description: '사용자 닉네임' })
  @Column({
    type: 'varchar',
    length: 30,
    unique: true,
    comment: '사용자 닉네임 (고유값)',
  })
  @IsString({ message: '닉네임은 문자열이어야 합니다.' })
  @MinLength(2, { message: '닉네임은 최소 2자 이상이어야 합니다.' })
  @MaxLength(30, { message: '닉네임은 최대 30자까지 가능합니다.' })
  nickname: string;

  /**
   * 사용자 이메일 주소
   * 로그인 시 사용되며 고유값입니다.
   */
  @Field(() => String, { description: '사용자 이메일' })
  @Column({
    type: 'varchar',
    length: 100,
    unique: true,
    comment: '사용자 이메일 (로그인 ID)',
  })
  @IsEmail({}, { message: '올바른 이메일 형식을 입력해주세요.' })
  @MaxLength(100, { message: '이메일은 최대 100자까지 가능합니다.' })
  email: string;

  /**
   * 사용자 비밀번호 (해시된 값)
   * 보안을 위해 해시된 상태로 저장됩니다.
   * GraphQL 스키마에는 노출되지 않습니다.
   */
  @Column({
    type: 'varchar',
    length: 255,
    comment: '사용자 비밀번호 (해시된 값)',
  })
  @IsString({ message: '비밀번호는 문자열이어야 합니다.' })
  @MinLength(8, { message: '비밀번호는 최소 8자 이상이어야 합니다.' })
  password?: string;

  /**
   * 사용자 역할
   * 시스템 내에서의 권한을 결정합니다.
   */
  @Field(() => UserRole, { description: '사용자 역할' })
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
    comment: '사용자 역할',
  })
  @IsEnum(UserRole, { message: '올바른 사용자 역할을 선택해주세요.' })
  role: UserRole;

  /**
   * 사용자 프로필 이미지 URL
   * 선택적 필드입니다.
   */
  @Field(() => String, { nullable: true, description: '프로필 이미지 URL' })
  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: '프로필 이미지 URL',
  })
  @IsString({ message: '프로필 이미지 URL은 문자열이어야 합니다.' })
  @MaxLength(500, { message: '프로필 이미지 URL은 최대 500자까지 가능합니다.' })
  profileImageUrl?: string;

  /**
   * 사용자 자기소개
   * 선택적 필드입니다.
   */
  @Field(() => String, { nullable: true, description: '자기소개' })
  @Column({
    type: 'text',
    nullable: true,
    comment: '사용자 자기소개',
  })
  @IsString({ message: '자기소개는 문자열이어야 합니다.' })
  @MaxLength(500, { message: '자기소개는 최대 500자까지 가능합니다.' })
  bio?: string;

  /**
   * 이메일 인증 여부
   * 회원가입 시 이메일 인증을 완료했는지 나타냅니다.
   */
  @Field(() => Boolean, { description: '이메일 인증 여부' })
  @Column({
    type: 'boolean',
    default: false,
    comment: '이메일 인증 여부',
  })
  isEmailVerified: boolean;

  /**
   * 계정 활성화 여부
   * 관리자가 계정을 비활성화할 수 있습니다.
   */
  @Field(() => Boolean, { description: '계정 활성화 여부' })
  @Column({
    type: 'boolean',
    default: true,
    comment: '계정 활성화 여부',
  })
  isUserActive: boolean;

  /**
   * Supabase 사용자 ID
   * 채팅 및 실시간 기능을 위한 Supabase 연동 식별자
   * 선택적 필드로, 기존 사용자와의 호환성을 유지합니다.
   */
  @Field(() => String, { nullable: true, description: 'Supabase 사용자 ID' })
  @Column({
    type: 'uuid',
    nullable: true,
    unique: true,
    comment: 'Supabase 사용자 ID (채팅 연동용)',
  })
  supabaseUserId?: string;

  // === 관계 설정 ===

  /**
   * 사용자가 작성한 게시물들
   * 일대다 관계: 한 사용자는 여러 게시물을 작성할 수 있습니다.
   */
  @Field(() => [Post], { description: '작성한 게시물 목록' })
  @OneToMany(() => Post, (post) => post.author)
  posts: Post[];

  /**
   * 사용자가 작성한 댓글들
   * 일대다 관계: 한 사용자는 여러 댓글을 작성할 수 있습니다.
   */
  @Field(() => [Comment], { description: '작성한 댓글 목록' })
  @OneToMany(() => Comment, (comment) => comment.author)
  comments: Comment[];

  /**
   * 사용자가 팔로우하는 관계들
   * 일대다 관계: 한 사용자는 여러 사용자를 팔로우할 수 있습니다.
   */
  @Field(() => [Follow], { description: '팔로우 중인 사용자 목록' })
  @OneToMany(() => Follow, (follow) => follow.follower)
  following: Follow[];

  /**
   * 사용자를 팔로우하는 관계들
   * 일대다 관계: 한 사용자는 여러 사용자에게 팔로우를 받을 수 있습니다.
   */
  @Field(() => [Follow], { description: '팔로워 목록' })
  @OneToMany(() => Follow, (follow) => follow.following)
  followers: Follow[];

  /**
   * 사용자가 보낸 채팅 메시지들
   * 일대다 관계: 한 사용자는 여러 채팅 메시지를 보낼 수 있습니다.
   */
  @Field(() => [ChatMessage], { description: '보낸 채팅 메시지 목록' })
  @OneToMany(() => ChatMessage, (chatMessage) => chatMessage.author)
  chatMessages: ChatMessage[];

  /**
   * 사용자가 좋아요를 누른 게시물 관계
   * 일대다 관계: 한 사용자는 여러 게시물에 좋아요를 누를 수 있습니다.
   */
  @Field(() => [PostLike], { description: '좋아요를 누른 게시물 목록' })
  @OneToMany(() => PostLike, (postLike) => postLike.user)
  likes: PostLike[];

  /**
   * 사용자가 차단한 사용자들
   * 일대다 관계: 한 사용자는 여러 사용자를 차단할 수 있습니다.
   */
  @OneToMany(() => Block, (block) => block.blocker)
  blocking: Block[];

  /**
   * 사용자를 차단한 사용자들
   * 일대다 관계: 한 사용자는 여러 사용자에게 차단당할 수 있습니다.
   */
  @OneToMany(() => Block, (block) => block.blockedUser)
  blockedBy: Block[];

  /**
   * 사용자가 북마크한 게시물들
   * 일대다 관계: 한 사용자는 여러 게시물을 북마크할 수 있습니다.
   */
  @Field(() => [Bookmark], { description: '북마크한 게시물 목록' })
  @OneToMany(() => Bookmark, (bookmark) => bookmark.user)
  bookmarks: Bookmark[];

  /**
   * 사용자가 선택한 팀들
   * 일대다 관계: 한 사용자는 여러 팀을 선택할 수 있습니다.
   */
  @Field(() => [UserTeam], { nullable: true, description: '선택한 팀 목록' })
  @OneToMany(() => UserTeam, (userTeam) => userTeam.user)
  userTeams?: UserTeam[];

  // === 헬퍼 메서드 ===

  /**
   * 사용자가 관리자인지 확인하는 메서드
   * @returns 관리자인 경우 true, 아닌 경우 false
   */
  isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }

  /**
   * 사용자가 인플루언서인지 확인하는 메서드
   * @returns 인플루언서인 경우 true, 아닌 경우 false
   */
  isInfluencer(): boolean {
    return this.role === UserRole.INFLUENCER;
  }

  /**
   * 사용자가 일반 사용자인지 확인하는 메서드
   * @returns 일반 사용자인 경우 true, 아닌 경우 false
   */
  isUser(): boolean {
    return this.role === UserRole.USER;
  }

  /**
   * 사용자 표시명 반환
   * 닉네임을 기본으로 하되, 없는 경우 이메일의 로컬 부분을 사용
   * @returns 표시할 사용자명
   */
  getDisplayName(): string {
    return this.nickname || this.email.split('@')[0];
  }
}
