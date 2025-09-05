import { Entity, Column, OneToMany, Index, PrimaryColumn } from 'typeorm';
import { ObjectType, Field, registerEnumType, ID } from '@nestjs/graphql';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsEnum,
  IsUUID,
  IsOptional,
  IsNumber,
  Min,
  Max,
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
 * 경험치/포인트 적립 액션 (확장 가능)
 * 새로운 적립 이벤트가 필요할 때 enum과 매핑 객체만 확장하면 됩니다.
 */
export enum UserProgressAction {
  CHAT_MESSAGE = 'CHAT_MESSAGE',
  POST_CREATE = 'POST_CREATE',
  DAILY_ATTENDANCE = 'DAILY_ATTENDANCE',
}

/**
 * 액션별 기본 적립 포인트/경험치 매핑
 * - value = 포인트 = 경험치 (현재는 동일 비율 요구사항)
 * 필요 시 향후 포인트와 경험치를 분리하여 다른 비율로 제공할 수 있도록
 * 구조를 객체 형태로 확장 가능 (예: { points: 5, exp: 10 }).
 */
export const USER_PROGRESS_REWARD: Record<UserProgressAction, number> = {
  [UserProgressAction.CHAT_MESSAGE]: 5,
  [UserProgressAction.POST_CREATE]: 5,
  [UserProgressAction.DAILY_ATTENDANCE]: 20,
};

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
 * Supabase Auth와 1:1 관계를 가지는 사용자 정보 테이블입니다.
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
@Entity('users')
@Index(['email'], { unique: true })
@Index(['nickname'], { unique: true })
export class User {
  /**
   * 사용자 고유 식별자 (Supabase Auth UUID)
   * Supabase에서 생성된 사용자 ID를 그대로 사용합니다.
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
   * 사용자 포인트
   * 유료 메시지/꾸미기 등에 사용되는 가상 자산 값입니다.
   * 경험치와 동일 비율(현재 요구사항)로 적립되지만 구조적으로 분리되어
   * 향후 독립 비율/소모 설계가 가능하도록 유지합니다.
   */
  @Field(() => Number, { description: '사용자 포인트', defaultValue: 0 })
  @Column({
    type: 'integer',
    default: 0,
    nullable: false,
    comment: '사용자 포인트 (기본값 0)',
  })
  points: number;

  /**
   * 최근 출석(데일리 출석 보상) 적립 일시
   * 하루 1회 출석 보상 중복 방지를 위한 기준 값입니다.
   */
  @Field(() => Date, {
    nullable: true,
    description: '최근 출석 체크 일시 (하루 1회 보상 제한)',
  })
  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    comment: '최근 데일리 출석 보상 수령 일시',
  })
  lastAttendanceAt?: Date;

  /**
   * 사용자 비밀번호 (해시된 값) - DEPRECATED
   * Supabase Auth를 사용하므로 더 이상 사용하지 않습니다.
   * 레거시 호환성을 위해 유지됩니다.
   */
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '사용자 비밀번호 (해시된 값) - DEPRECATED',
  })
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
   * 사용자 코멘트
   * 선택적 필드입니다.
   */
  @Field(() => String, { nullable: true, description: '사용자 코멘트' })
  @Column({
    type: 'text',
    nullable: true,
    comment: '사용자 코멘트',
  })
  @IsOptional()
  @IsString({ message: '코멘트는 문자열이어야 합니다.' })
  @MaxLength(200, { message: '코멘트는 최대 200자까지 가능합니다.' })
  comment?: string;

  /**
   * 사용자 나이
   * 선택적 필드입니다. 1-120 사이의 값만 허용됩니다.
   */
  @Field(() => Number, { nullable: true, description: '사용자 나이' })
  @Column({
    type: 'integer',
    nullable: true,
    comment: '사용자 나이',
  })
  @IsOptional()
  @IsNumber({}, { message: '나이는 숫자여야 합니다.' })
  @Min(1, { message: '나이는 1세 이상이어야 합니다.' })
  @Max(120, { message: '나이는 120세 이하여야 합니다.' })
  age?: number;

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
   * 닉네임을 기본으로 하되, 없는 경우 이메일의 로컬 부분을 사용
   * @returns 표시할 사용자명
   */
  getDisplayName(): string {
    return this.nickname || this.email.split('@')[0];
  }

  // (경험치/레벨 관련 정적 메서드 제거됨)

  /**
   * 데일리 출석 보상 수령 가능 여부
   * 같은 '날짜(YYYY-MM-DD)' 내 중복 수령 방지.
   */
  canClaimDailyAttendance(now: Date = new Date()): boolean {
    if (!this.lastAttendanceAt) return true;
    const last = this.lastAttendanceAt;
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    return fmt(last) !== fmt(now);
  }

  /**
   * (경험치 시스템 제거) 포인트 적립만 필요 시 별도 서비스 로직에서 직접 points 필드 증가 처리
   * 기존 awardProgress 메서드 삭제됨.
   */

  // 레벨/경험치 계산 관련 메서드 제거됨
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
 * Supabase Auth 정보와 User를 결합한 완전한 사용자 정보
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
  // User 정보
  nickname: string;
  role: UserRole;
  profileImageUrl?: string;
  bio?: string;
  age?: number;
  isActive: boolean;
  /** 사용자 포인트 (가상 자산) */
  points?: number;
  /** 최근 출석 보상 수령 일시 */
  lastAttendanceAt?: Date;
  // 공통 정보
  createdAt: Date;
  updatedAt: Date;
}
