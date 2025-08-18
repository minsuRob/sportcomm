import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { IsString, MaxLength, MinLength, IsOptional } from 'class-validator';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Comment } from './comment.entity';
import { Media } from './media.entity';
import { PostVersion } from './post-version.entity';
import { PostLike } from './post-like.entity';
import { Bookmark } from './bookmark.entity';
import { PostTag } from './post-tag.entity';
import { Tag } from './tag.entity';
import { Team } from './team.entity';

/**
 * 팀 기반 게시물 분류
 * 게시물은 팀 ID로만 분류됩니다.
 */

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
@Index(['teamId'])
@Index(['createdAt'])
export class Post extends BaseEntity {
  /**
   * 게시물 제목
   * 게시물의 주제를 나타내는 간단한 제목입니다.
   */
  @Field(() => String, { nullable: true, description: '게시물 제목' })
  @Column({
    type: 'varchar',
    length: 200,
    nullable: true,
    comment: '게시물 제목',
  })
  @IsOptional()
  @IsString({ message: '제목은 문자열이어야 합니다.' })
  @MinLength(1, { message: '제목은 최소 1자 이상이어야 합니다.' })
  @MaxLength(200, { message: '제목은 최대 200자까지 가능합니다.' })
  title?: string;

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
   * 게시물 타입
   * 게시물의 종류를 나타냅니다 (ANALYSIS, CHEERING, HIGHLIGHT 등).
   */
  @Field(() => String, { description: '게시물 타입' })
  @Column({
    type: 'varchar',
    length: 50,
    default: 'ANALYSIS',
    comment: '게시물 타입 (ANALYSIS, CHEERING, HIGHLIGHT)',
  })
  @IsString({ message: '게시물 타입은 문자열이어야 합니다.' })
  type: string;

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
   * 팀 ID
   * 게시물이 관련된 팀의 ID입니다.
   * 모든 게시물은 teamId로 분류됩니다.
   */
  @Field(() => String, { description: '연관된 팀 ID' })
  @Column({
    type: 'uuid',
    comment: '게시물 분류를 위한 팀 ID',
    nullable: false, // 필수 값으로 설정
  })
  @IsString({ message: '팀 ID는 문자열이어야 합니다.' })
  teamId: string;

  /**
   * 작성자 ID
   * 게시물을 작성한 사용자의 ID입니다.
   */
  @Column({
    type: 'uuid',
    comment: '작성자 ID',
  })
  authorId: string;

  /**
   * 작성자의 팀 정보 (JSON)
   * 게시물 생성 시점의 작성자 팀 정보를 저장합니다.
   */
  @Field(() => String, {
    nullable: true,
    description: '작성자의 팀 정보 (JSON)',
  })
  @Column({
    type: 'jsonb',
    nullable: true,
    comment: '작성자의 팀 정보',
  })
  authorTeams?: any;

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

  @Field(() => Team, { description: '게시물 팀' })
  @ManyToOne(() => Team, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'teamId' })
  team: Team;

  /**
   * 게시물에 달린 댓글들
   * 일대다 관계: 한 게시물에는 여러 댓글이 달릴 수 있습니다.
   */
  @Field(() => [Comment], { nullable: true, description: '게시물 댓글 목록' })
  @OneToMany(() => Comment, (comment) => comment.post)
  comments: Comment[];

  /**
   * 게시물에 첨부된 미디어 파일들
   * 일대다 관계: 한 게시물에는 여러 미디어 파일이 첨부될 수 있습니다.
   */
  @Field(() => [Media], {
    nullable: true,
    description: '첨부된 미디어 파일 목록',
  })
  @OneToMany(() => Media, (media) => media.post)
  media: Media[];

  /**
   * 게시물 버전 관리
   * 일대다 관계: 한 게시물은 여러 버전을 가질 수 있습니다.
   */
  @Field(() => [PostVersion], {
    nullable: true,
    description: '게시물 버전 이력',
  })
  @OneToMany(() => PostVersion, (postVersion) => postVersion.post)
  versions: PostVersion[];

  /**
   * 게시물에 대한 좋아요 목록
   * 일대다 관계: 한 게시물은 여러 사용자로부터 좋아요를 받을 수 있습니다.
   */
  @Field(() => [PostLike], {
    nullable: true,
    description: '게시물에 대한 좋아요 목록',
  })
  @OneToMany(() => PostLike, (postLike) => postLike.post)
  likes: PostLike[];

  /**
   * 게시물에 대한 북마크 목록
   * 일대다 관계: 한 게시물은 여러 사용자에 의해 북마크될 수 있습니다.
   */
  @Field(() => [Bookmark], {
    nullable: true,
    description: '게시물에 대한 북마크 목록',
  })
  @OneToMany(() => Bookmark, (bookmark) => bookmark.post)
  bookmarks: Bookmark[];

  /**
   * 게시물에 연결된 태그들과의 관계
   * 일대다 관계: 한 게시물은 여러 태그를 가질 수 있습니다.
   */
  @Field(() => [PostTag], {
    nullable: true,
    description: '게시물에 연결된 태그 관계',
  })
  @OneToMany(() => PostTag, (postTag) => postTag.post)
  postTags: PostTag[];

  /**
   * 게시물의 태그 목록 (계산된 필드)
   * GraphQL 리졸버에서 postTags 관계를 통해 계산됩니다.
   */
  @Field(() => [Tag], {
    nullable: true,
    description: '게시물의 태그 목록',
  })
  tags?: Tag[];

  // === 헬퍼 메서드 ===

  /**
   * 게시물과 관련된 팀의 스포츠 종류를 확인하는 메서드
   * 외부 팀 서비스와의 통합이 필요합니다.
   *
   * @returns 팀의 스포츠 종류 ('football', 'baseball', 'esports' 등)
   */
  async getTeamSportType(): Promise<string> {
    // 팀 서비스와 연동하여 팀 ID에 해당하는 스포츠 종류 반환
    // 팀 ID 기반 분류에 맞춰 구현 예정
    return this.getTeamCategory();
  }

  /**
   * 팀 ID 기반으로 카테고리(스포츠 종류)를 반환하는 메서드
   * @returns 팀의 카테고리 ('football', 'baseball', 'esports' 등)
   */
  getTeamCategory(): string {
    // 팀 ID 프리픽스에 따라 카테고리 결정 (예시 구현)
    const footballTeams = [
      'tottenham',
      'liverpool',
      'mancity',
      'atletico',
      'newcastle',
    ];
    const baseballTeams = ['doosan', 'hanwha', 'lg', 'samsung', 'kia'];
    const esportsTeams = ['t1', 'geng', 'drx', 'kt', 'damwon'];

    // 팀 ID에서 프리픽스 추출 (예: "tottenham-id" -> "tottenham")
    const prefix = this.teamId.split('-')[0];

    if (footballTeams.includes(prefix)) return 'football';
    if (baseballTeams.includes(prefix)) return 'baseball';
    if (esportsTeams.includes(prefix)) return 'esports';

    return 'unknown';
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

  /**
   * 사용자가 게시물에 좋아요를 눌렀는지 확인하는 메서드
   * @param userId 확인할 사용자의 ID
   * @param likes 게시물의 좋아요 목록 (성능 최적화용)
   * @returns 좋아요를 눌렀다면 true, 아니면 false
   */
  isLikedByUser(userId: string, likes?: PostLike[]): boolean {
    if (!userId) return false;

    const likesToCheck = likes || this.likes;
    if (!likesToCheck) return false;

    return likesToCheck.some((like) => like.userId === userId);
  }

  /**
   * 현재 사용자가 이 게시물에 좋아요를 눌렀는지 여부
   * GraphQL 리졸버에서 계산된 필드로 사용됩니다.
   */
  @Field(() => Boolean, { description: '현재 사용자가 좋아요를 눌렀는지 여부' })
  isLiked?: boolean;

  /**
   * 현재 사용자가 이 게시물을 북마크했는지 여부
   * GraphQL 리졸버에서 계산된 필드로 사용됩니다.
   */
  @Field(() => Boolean, { description: '현재 사용자가 북마크했는지 여부' })
  isBookmarked?: boolean;

  // === 태그 관련 헬퍼 메서드 ===

  /**
   * 게시물에 태그가 있는지 확인하는 메서드
   * @param tagName 확인할 태그 이름
   * @param tags 게시물의 태그 목록 (성능 최적화용)
   * @returns 태그가 있다면 true, 아니면 false
   */
  hasTag(tagName: string, tags?: Tag[]): boolean {
    if (!tagName) return false;

    const tagsToCheck = tags || this.tags;
    if (!tagsToCheck) return false;

    return tagsToCheck.some((tag) => tag.name === tagName);
  }

  /**
   * 게시물의 태그 이름 목록을 반환하는 메서드
   * @param tags 게시물의 태그 목록 (성능 최적화용)
   * @returns 태그 이름 배열
   */
  getTagNames(tags?: Tag[]): string[] {
    const tagsToCheck = tags || this.tags;
    if (!tagsToCheck) return [];

    return tagsToCheck.map((tag) => tag.name);
  }

  /**
   * 게시물의 해시태그 문자열을 반환하는 메서드
   * @param tags 게시물의 태그 목록 (성능 최적화용)
   * @returns 해시태그 문자열 (예: "#전술분석 #이적소식")
   */
  getHashtagString(tags?: Tag[]): string {
    const tagsToCheck = tags || this.tags;
    if (!tagsToCheck) return '';

    return tagsToCheck.map((tag) => `#${tag.name}`).join(' ');
  }
}
