import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { ObjectType, Field, registerEnumType } from '@nestjs/graphql';
import { IsString, IsEnum, MaxLength, MinLength } from 'class-validator';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Comment } from './comment.entity';
import { Media } from './media.entity';
import { PostVersion } from './post-version.entity';

/**
 * 게시물 유형 열거형
 * 스포츠 커뮤니티의 다양한 게시물 형태를 정의합니다.
 */
export enum PostType {
  /** 분석 게시물 - 경기 분석, 전술 분석 등 */
  ANALYSIS = 'ANALYSIS',
  /** 응원 게시물 - 팀이나 선수를 응원하는 게시물 */
  CHEERING = 'CHEERING',
  /** 하이라이트 게시물 - 경기 하이라이트, 명장면 등 */
  HIGHLIGHT = 'HIGHLIGHT',
}

// GraphQL 스키마에 PostType enum 등록
registerEnumType(PostType, {
  name: 'PostType',
  description: '게시물 유형',
  valuesMap: {
    ANALYSIS: {
      description: '분석 게시물 (경기 분석, 전술 분석 등)',
    },
    CHEERING: {
      description: '응원 게시물 (팀이나 선수 응원)',
    },
    HIGHLIGHT: {
      description: '하이라이트 게시물 (경기 하이라이트, 명장면)',
    },
  },
});

/**
 * 게시물 엔티티
 *
 * 스포츠 커뮤니티의 핵심 콘텐츠인 게시물을 관리합니다.
 * 분석, 응원, 하이라이트 등 다양한 유형의 게시물을 지원하며,
 * 댓글, 미디어 첨부, 버전 관리 기능을 제공합니다.
 */
@ObjectType()
@Entity('posts')
@Index(['authorId'])
@Index(['type'])
@Index(['createdAt'])
export class Post extends BaseEntity {
  /**
   * 게시물 제목
   * 게시물의 주제를 나타내는 간단한 제목입니다.
   */
  @Field(() => String, { description: '게시물 제목' })
  @Column({
    type: 'varchar',
    length: 200,
    comment: '게시물 제목',
  })
  @IsString({ message: '제목은 문자열이어야 합니다.' })
  @MinLength(1, { message: '제목은 최소 1자 이상이어야 합니다.' })
  @MaxLength(200, { message: '제목은 최대 200자까지 가능합니다.' })
  title: string;

  /**
   * 게시물 내용
   * 게시물의 본문 내용입니다.
   */
  @Field(() => String, { description: '게시물 내용' })
  @Column({
    type: 'text',
    comment: '게시물 내용',
  })
  @IsString({ message: '내용은 문자열이어야 합니다.' })
  @MinLength(1, { message: '내용은 최소 1자 이상이어야 합니다.' })
  @MaxLength(10000, { message: '내용은 최대 10,000자까지 가능합니다.' })
  content: string;

  /**
   * 게시물 유형
   * 분석, 응원, 하이라이트 중 하나의 유형을 가집니다.
   */
  @Field(() => PostType, { description: '게시물 유형' })
  @Column({
    type: 'enum',
    enum: PostType,
    comment: '게시물 유형',
  })
  @IsEnum(PostType, { message: '올바른 게시물 유형을 선택해주세요.' })
  type: PostType;

  /**
   * 게시물 조회수
   * 사용자들이 게시물을 조회한 횟수입니다.
   */
  @Field(() => Number, { description: '조회수' })
  @Column({
    type: 'int',
    default: 0,
    comment: '게시물 조회수',
  })
  viewCount: number;

  /**
   * 게시물 좋아요 수
   * 사용자들이 게시물에 좋아요를 누른 횟수입니다.
   */
  @Field(() => Number, { description: '좋아요 수' })
  @Column({
    type: 'int',
    default: 0,
    comment: '게시물 좋아요 수',
  })
  likeCount: number;

  /**
   * 게시물 댓글 수
   * 게시물에 달린 댓글의 총 개수입니다.
   */
  @Field(() => Number, { description: '댓글 수' })
  @Column({
    type: 'int',
    default: 0,
    comment: '게시물 댓글 수',
  })
  commentCount: number;

  /**
   * 게시물 공유 수
   * 사용자들이 게시물을 공유한 횟수입니다.
   */
  @Field(() => Number, { description: '공유 수' })
  @Column({
    type: 'int',
    default: 0,
    comment: '게시물 공유 수',
  })
  shareCount: number;

  /**
   * 게시물 고정 여부
   * 관리자나 작성자가 게시물을 상단에 고정할 수 있습니다.
   */
  @Field(() => Boolean, { description: '고정 여부' })
  @Column({
    type: 'boolean',
    default: false,
    comment: '게시물 고정 여부',
  })
  isPinned: boolean;

  /**
   * 게시물 공개 여부
   * 비공개 게시물은 작성자만 볼 수 있습니다.
   */
  @Field(() => Boolean, { description: '공개 여부' })
  @Column({
    type: 'boolean',
    default: true,
    comment: '게시물 공개 여부',
  })
  isPublic: boolean;

  /**
   * 작성자 ID
   * 게시물을 작성한 사용자의 ID입니다.
   */
  @Column({
    type: 'uuid',
    comment: '작성자 ID',
  })
  authorId: string;

  // === 관계 설정 ===

  /**
   * 게시물 작성자
   * 다대일 관계: 여러 게시물이 한 사용자에 의해 작성됩니다.
   */
  @Field(() => User, { description: '게시물 작성자' })
  @ManyToOne(() => User, (user) => user.posts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'authorId' })
  author: User;

  /**
   * 게시물에 달린 댓글들
   * 일대다 관계: 한 게시물에는 여러 댓글이 달릴 수 있습니다.
   */
  @Field(() => [Comment], { description: '게시물 댓글 목록' })
  @OneToMany(() => Comment, (comment) => comment.post)
  comments: Comment[];

  /**
   * 게시물에 첨부된 미디어 파일들
   * 일대다 관계: 한 게시물에는 여러 미디어 파일이 첨부될 수 있습니다.
   */
  @Field(() => [Media], { description: '첨부된 미디어 파일 목록' })
  @OneToMany(() => Media, (media) => media.post)
  mediaFiles: Media[];

  /**
   * 게시물 버전 관리
   * 일대다 관계: 한 게시물은 여러 버전을 가질 수 있습니다.
   */
  @Field(() => [PostVersion], { description: '게시물 버전 이력' })
  @OneToMany(() => PostVersion, (postVersion) => postVersion.post)
  versions: PostVersion[];

  // === 헬퍼 메서드 ===

  /**
   * 게시물이 분석 유형인지 확인하는 메서드
   * @returns 분석 게시물인 경우 true, 아닌 경우 false
   */
  isAnalysis(): boolean {
    return this.type === PostType.ANALYSIS;
  }

  /**
   * 게시물이 응원 유형인지 확인하는 메서드
   * @returns 응원 게시물인 경우 true, 아닌 경우 false
   */
  isCheering(): boolean {
    return this.type === PostType.CHEERING;
  }

  /**
   * 게시물이 하이라이트 유형인지 확인하는 메서드
   * @returns 하이라이트 게시물인 경우 true, 아닌 경우 false
   */
  isHighlight(): boolean {
    return this.type === PostType.HIGHLIGHT;
  }

  /**
   * 게시물 조회수 증가 메서드
   * @param count 증가시킬 조회수 (기본값: 1)
   */
  incrementViewCount(count: number = 1): void {
    this.viewCount += count;
  }

  /**
   * 게시물 좋아요 수 증가 메서드
   * @param count 증가시킬 좋아요 수 (기본값: 1)
   */
  incrementLikeCount(count: number = 1): void {
    this.likeCount += count;
  }

  /**
   * 게시물 댓글 수 증가 메서드
   * @param count 증가시킬 댓글 수 (기본값: 1)
   */
  incrementCommentCount(count: number = 1): void {
    this.commentCount += count;
  }

  /**
   * 게시물 공유 수 증가 메서드
   * @param count 증가시킬 공유 수 (기본값: 1)
   */
  incrementShareCount(count: number = 1): void {
    this.shareCount += count;
  }

  /**
   * 게시물 고정 상태 토글 메서드
   */
  togglePin(): void {
    this.isPinned = !this.isPinned;
  }

  /**
   * 게시물 공개 상태 토글 메서드
   */
  togglePublic(): void {
    this.isPublic = !this.isPublic;
  }

  /**
   * 게시물 요약 정보 반환 메서드
   * @param maxLength 요약 최대 길이 (기본값: 100)
   * @returns 요약된 게시물 내용
   */
  getSummary(maxLength: number = 100): string {
    if (this.content.length <= maxLength) {
      return this.content;
    }
    return this.content.substring(0, maxLength) + '...';
  }
}
