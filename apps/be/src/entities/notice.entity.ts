import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import { User } from './user.entity';

/**
 * 공지 카테고리
 * - FE 의 NoticeCategory 과 1:1 매핑되도록 Enum 문자열 유지
 */
export enum NoticeCategory {
  GENERAL = 'GENERAL', // 일반 안내
  FEATURE = 'FEATURE', // 기능 추가/변경
  EVENT = 'EVENT', // 이벤트/프로모션
  MAINTENANCE = 'MAINTENANCE', // 점검
  POLICY = 'POLICY', // 정책/약관/보안
}

/**
 * 공지 중요도
 * - FE 의 NoticeImportance 과 1:1 매핑
 */
export enum NoticeImportance {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// GraphQL Enum 등록
registerEnumType(NoticeCategory, {
  name: 'NoticeCategory',
  description: '공지 카테고리',
});

registerEnumType(NoticeImportance, {
  name: 'NoticeImportance',
  description: '공지 중요도',
});

/**
 * 공지 엔티티
 * - 관리자(ADMIN) 만 생성/수정/삭제
 * - FE 기존 목업 NOTICE_MOCKS 대체
 * - 최소 요구 필드만 정의 (추가 메타 필요 시 확장)
 *
 * 활성(active) 판단 로직:
 *  draft === true            -> 비활성
 *  startAt && now < startAt  -> 비활성 (scheduled)
 *  endAt && now > endAt      -> 비활성 (expired)
 *  그 외 -> active
 */
@ObjectType({ description: '공지(Notice)' })
@Entity('notices')
@Index(['createdAt'])
@Index(['importance', 'createdAt'])
@Index(['pinned', 'createdAt'])
@Index(['highlightBanner', 'createdAt'])
@Index(['draft', 'createdAt'])
export class Notice {
  @Field(() => ID, { description: '공지 ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field({ description: '제목' })
  @Column({ type: 'varchar', length: 200, comment: '공지 제목' })
  title: string;

  @Field({ description: '본문 내용 (Markdown 또는 Plain Text)' })
  @Column({ type: 'text', comment: '공지 본문 내용' })
  content: string;

  @Field(() => NoticeCategory, { description: '카테고리' })
  @Column({
    type: 'enum',
    enum: NoticeCategory,
    comment: '공지 카테고리',
  })
  category: NoticeCategory;

  @Field(() => NoticeImportance, { description: '중요도' })
  @Column({
    type: 'enum',
    enum: NoticeImportance,
    default: NoticeImportance.NORMAL,
    comment: '공지 중요도',
  })
  importance: NoticeImportance;

  @Field(() => Boolean, { description: '상단 고정 여부', defaultValue: false })
  @Column({
    type: 'boolean',
    default: false,
    comment: '리스트 상단 고정 여부',
  })
  pinned: boolean;

  @Field(() => Boolean, {
    description: '피드 배너 강조 후보 여부',
    defaultValue: false,
  })
  @Column({
    type: 'boolean',
    default: false,
    comment: 'FeedNotice 강조 배너 후보 여부',
  })
  highlightBanner: boolean;

  @Field(() => Boolean, {
    description: '초안(Draft) 여부 (true이면 사용자 노출 제외)',
    defaultValue: false,
  })
  @Column({
    type: 'boolean',
    default: false,
    comment: '초안 여부',
  })
  draft: boolean;

  @Field(() => Date, {
    nullable: true,
    description: '노출 시작 일시 (미지정 시 즉시 노출)',
  })
  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    comment: '노출 시작 일시',
  })
  startAt?: Date | null;

  @Field(() => Date, {
    nullable: true,
    description: '노출 종료 일시 (미지정 시 무기한)',
  })
  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    comment: '노출 종료 일시',
  })
  endAt?: Date | null;

  // 작성(등록) 관리자
  @Field(() => User, { description: '작성 관리자' })
  @ManyToOne(() => User, { onDelete: 'SET NULL', eager: false, nullable: true })
  @JoinColumn({ name: 'author_id' })
  author?: User | null;

  @Column({
    name: 'author_id',
    type: 'uuid',
    nullable: true,
    comment: '작성 관리자 사용자 ID (ADMIN)',
  })
  authorId?: string | null;

  @Field(() => Date, { description: '생성 일시' })
  @CreateDateColumn({ type: 'timestamp with time zone', comment: '생성 일시' })
  createdAt: Date;

  @Field(() => Date, { description: '수정 일시' })
  @UpdateDateColumn({ type: 'timestamp with time zone', comment: '수정 일시' })
  updatedAt: Date;

  /**
   * 현재 활성 상태인지 여부
   */
  @Field(() => Boolean, {
    description: '활성 (노출 조건 충족) 여부 (파생 필드)',
  })
  isActive(): boolean {
    return this.computeIsActive();
  }

  /**
   * 생명주기 상태
   * draft / scheduled / active / expired
   */
  @Field(() => String, {
    description: '생명주기 상태(draft|scheduled|active|expired) (파생 필드)',
  })
  lifecycleStatus(): string {
    if (this.draft) return 'draft';
    const now = new Date();
    if (this.startAt && now < this.startAt) return 'scheduled';
    if (this.endAt && now > this.endAt) return 'expired';
    return 'active';
  }

  /**
   * 활성 여부 계산 (내부 재사용)
   */
  private computeIsActive(now: Date = new Date()): boolean {
    if (this.draft) return false;
    if (this.startAt && now < this.startAt) return false;
    if (this.endAt && now > this.endAt) return false;
    return true;
  }

  /**
   * 간단한 DTO 직렬화
   * - FE 캐시 프리패칭 등에 활용 가능
   */
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      content: this.content,
      category: this.category,
      importance: this.importance,
      pinned: this.pinned,
      highlightBanner: this.highlightBanner,
      draft: this.draft,
      startAt: this.startAt ? this.startAt.toISOString() : null,
      endAt: this.endAt ? this.endAt.toISOString() : null,
      authorId: this.authorId || null,
      createdAt: this.createdAt?.toISOString(),
      updatedAt: this.updatedAt?.toISOString(),
      isActive: this.isActive,
      lifecycleStatus: this.lifecycleStatus,
    };
  }

  /**
   * 정적 팩토리 (선택적 사용)
   * - 서비스 레벨에서 간결한 생성 지원
   */
  static create(params: {
    title: string;
    content: string;
    category: NoticeCategory;
    importance?: NoticeImportance;
    pinned?: boolean;
    highlightBanner?: boolean;
    draft?: boolean;
    startAt?: Date | null;
    endAt?: Date | null;
    authorId?: string | null;
  }): Notice {
    const n = new Notice();
    n.title = params.title.trim();
    n.content = params.content;
    n.category = params.category;
    n.importance = params.importance ?? NoticeImportance.NORMAL;
    n.pinned = !!params.pinned;
    n.highlightBanner = !!params.highlightBanner;
    n.draft = !!params.draft;
    n.startAt = params.startAt || null;
    n.endAt = params.endAt || null;
    n.authorId = params.authorId || null;
    return n;
  }
}
