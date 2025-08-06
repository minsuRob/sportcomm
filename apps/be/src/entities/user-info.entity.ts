import { Entity, Column, OneToMany, Index, PrimaryColumn } from 'typeorm';
import { ObjectType, Field, registerEnumType, ID } from '@nestjs/graphql';
import {
  IsString,
  MinLength,
  MaxLength,
  IsEnum,
  IsUUID,
  IsOptional,
} from 'class-validator';
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
 * 사용자 정보 엔티티
 *
 * Supabase Auth와 1:1 관계를 가지는 추가 사용자 정보 테이블입니다.
 * Supabase Auth에서 관리하지 않는 비즈니스 로직 관련 정보를 저장합니다.
 *
 * Supabase Auth 정보:
 * - id (UUID): Supabase에서 생성된 사용자 ID
 * - email: 이메일 주소
 * - email_confirmed_at: 이메일 인증 시간
 * - phone: 전화번호 (선택사항)
 * - created_at, updated_at: 생성/수정 시간
 * - user_metadata: 사용자 메타데이터 (nickname, role 등)
 * - app_metadata: 앱 메타데이터 (provider 등)
 */
@ObjectType()
@Entity('user_info')
@Index(['nickname'], { unique: true })
export class UserInfo {
  /**
   * 사용자 고유 식별자 (Supabase Auth UUID)
   * Supabase Auth의 사용자 ID와 동일합니다.
   */
  @Field(() => ID, { description: '사용자 고유 식별자' })
  @PrimaryColumn('uuid')
  @IsUUID(4, { message: '올바른 UUID 형식이어야 합니다.' })
  id: string;

  /**
   * 생성 시간
   */
  @Field(() => Date, { description: '생성 시간' })
  @Column({
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
    comment: '생성 시간',
  })
  createdAt: Date;

  /**
   * 수정 시간
   */
  @Field(() => Date, { description: '수정 시간' })
  @Column({
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
    comment: '수정 시간',
  })
  updatedAt: Date;

  /**
   * 사용자 닉네임
   * 고유값이며 다른 사용자와 중복될 수 없습니다.
   * Supabase Auth의 user_metadata.nickname과 동기화됩니다.
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
   * 사용자 역할
   * 시스템 내에서의 권한을 결정합니다.
   * Supabase Auth의 user_metadata.role과 동기화됩니다.
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
  @IsOptional()
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
  @IsOptional()
  @IsString({ message: '자기소개는 문자열이어야 합니다.' })
  @MaxLength(500, { message: '자기소개는 최대 500자까지 가능합니다.' })
  bio?: string;

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
  isActive: boolean;

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
  @Field(() => [UserTeam], { description: '선택한 팀 목록' })
  @OneToMany(() => UserTeam, (userTeam) => userTeam.user)
  userTeams: UserTeam[];

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
   * 닉네임을 반환합니다.
   * @returns 표시할 사용자명
   */
  getDisplayName(): string {
    return this.nickname;
  }
}

/**
 * Supabase Auth 사용자 정보 인터페이스
 * Supabase Auth에서 제공하는 사용자 정보 구조
 */
export interface SupabaseAuthUser {
  id: string;
  email?: string;
  phone?: string;
  email_confirmed_at?: string;
  phone_confirmed_at?: string;
  created_at: string;
  updated_at: string;
  user_metadata: {
    nickname?: string;
    role?: UserRole;
    [key: string]: any;
  };
  app_metadata: {
    provider?: string;
    providers?: string[];
    [key: string]: any;
  };
}

/**
 * 통합 사용자 정보 인터페이스
 * Supabase Auth 정보와 UserInfo를 결합한 완전한 사용자 정보
 */
export interface CombinedUserInfo {
  // Supabase Auth 정보
  id: string;
  email?: string;
  phone?: string;
  emailConfirmedAt?: string;
  phoneConfirmedAt?: string;
  provider?: string;
  providers?: string[];

  // UserInfo 정보
  nickname: string;
  role: UserRole;
  profileImageUrl?: string;
  bio?: string;
  isActive: boolean;

  // 공통 정보
  createdAt: Date;
  updatedAt: Date;
}
