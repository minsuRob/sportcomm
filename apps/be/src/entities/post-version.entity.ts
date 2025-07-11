import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { IsString, IsNumber, MaxLength, MinLength, Min } from 'class-validator';
import { BaseEntity } from './base.entity';
import { Post } from './post.entity';

/**
 * 게시물 버전 엔티티
 *
 * 게시물의 수정 이력을 관리합니다.
 * 게시물이 수정될 때마다 새로운 버전이 생성되어
 * 변경 내역을 추적하고 이전 버전으로 복원할 수 있습니다.
 */
@ObjectType()
@Entity('post_versions')
@Index(['postId'])
@Index(['version'])
@Index(['createdAt'])
export class PostVersion extends BaseEntity {
  /**
   * 게시물 제목 (해당 버전)
   * 이 버전에서의 게시물 제목입니다.
   */
  @Field(() => String, { description: '게시물 제목 (해당 버전)' })
  @Column({
    type: 'varchar',
    length: 200,
    comment: '게시물 제목 (해당 버전)',
  })
  @IsString({ message: '제목은 문자열이어야 합니다.' })
  @MinLength(1, { message: '제목은 최소 1자 이상이어야 합니다.' })
  @MaxLength(200, { message: '제목은 최대 200자까지 가능합니다.' })
  title: string;

  /**
   * 게시물 내용 (해당 버전)
   * 이 버전에서의 게시물 내용입니다.
   */
  @Field(() => String, { description: '게시물 내용 (해당 버전)' })
  @Column({
    type: 'text',
    comment: '게시물 내용 (해당 버전)',
  })
  @IsString({ message: '내용은 문자열이어야 합니다.' })
  @MinLength(1, { message: '내용은 최소 1자 이상이어야 합니다.' })
  @MaxLength(10000, { message: '내용은 최대 10,000자까지 가능합니다.' })
  content: string;

  /**
   * 버전 번호
   * 게시물의 버전을 나타내는 순차적 번호입니다.
   * 1부터 시작하여 수정될 때마다 1씩 증가합니다.
   */
  @Field(() => Number, { description: '버전 번호' })
  @Column({
    type: 'int',
    comment: '버전 번호',
  })
  @IsNumber({}, { message: '버전 번호는 숫자여야 합니다.' })
  @Min(1, { message: '버전 번호는 1 이상이어야 합니다.' })
  version: number;

  /**
   * 수정 사유
   * 게시물을 수정한 이유를 설명합니다.
   */
  @Field(() => String, { nullable: true, description: '수정 사유' })
  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: '수정 사유',
  })
  @IsString({ message: '수정 사유는 문자열이어야 합니다.' })
  @MaxLength(500, { message: '수정 사유는 최대 500자까지 가능합니다.' })
  editReason?: string;

  /**
   * 변경 내용 요약
   * 이전 버전과 비교하여 변경된 내용의 요약입니다.
   */
  @Field(() => String, { nullable: true, description: '변경 내용 요약' })
  @Column({
    type: 'text',
    nullable: true,
    comment: '변경 내용 요약',
  })
  @IsString({ message: '변경 내용 요약은 문자열이어야 합니다.' })
  @MaxLength(1000, { message: '변경 내용 요약은 최대 1,000자까지 가능합니다.' })
  changeSummary?: string;

  /**
   * 문자 수 변화
   * 이전 버전 대비 문자 수의 변화량입니다.
   * 양수: 증가, 음수: 감소, 0: 변화 없음
   */
  @Field(() => Number, { description: '문자 수 변화' })
  @Column({
    type: 'int',
    default: 0,
    comment: '문자 수 변화 (이전 버전 대비)',
  })
  @IsNumber({}, { message: '문자 수 변화는 숫자여야 합니다.' })
  characterDiff: number;

  /**
   * 주요 변경 여부
   * 단순 오타 수정이 아닌 내용상의 주요 변경인지 여부입니다.
   */
  @Field(() => Boolean, { description: '주요 변경 여부' })
  @Column({
    type: 'boolean',
    default: false,
    comment: '주요 변경 여부',
  })
  isMajorChange: boolean;

  /**
   * 자동 저장 여부
   * 사용자가 수동으로 저장한 것이 아닌 자동 저장인지 여부입니다.
   */
  @Field(() => Boolean, { description: '자동 저장 여부' })
  @Column({
    type: 'boolean',
    default: false,
    comment: '자동 저장 여부',
  })
  isAutoSave: boolean;

  /**
   * 게시물 ID
   * 버전이 속한 게시물의 ID입니다.
   */
  @Column({
    type: 'uuid',
    comment: '게시물 ID',
  })
  postId: string;

  // === 관계 설정 ===

  /**
   * 버전이 속한 게시물
   * 다대일 관계: 여러 버전이 한 게시물에 속합니다.
   */
  @Field(() => Post, { description: '버전이 속한 게시물' })
  @ManyToOne(() => Post, (post) => post.versions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'postId' })
  post: Post;

  // === 헬퍼 메서드 ===

  /**
   * 첫 번째 버전(원본)인지 확인하는 메서드
   * @returns 첫 번째 버전인 경우 true, 아닌 경우 false
   */
  isOriginalVersion(): boolean {
    return this.version === 1;
  }

  /**
   * 주요 변경사항인지 확인하는 메서드
   * @returns 주요 변경사항인 경우 true, 아닌 경우 false
   */
  isMajorEdit(): boolean {
    return this.isMajorChange;
  }

  /**
   * 자동 저장된 버전인지 확인하는 메서드
   * @returns 자동 저장된 경우 true, 아닌 경우 false
   */
  isAutoSaved(): boolean {
    return this.isAutoSave;
  }

  /**
   * 수동 저장된 버전인지 확인하는 메서드
   * @returns 수동 저장된 경우 true, 아닌 경우 false
   */
  isManualSave(): boolean {
    return !this.isAutoSave;
  }

  /**
   * 내용이 증가했는지 확인하는 메서드
   * @returns 내용이 증가한 경우 true, 아닌 경우 false
   */
  isContentIncreased(): boolean {
    return this.characterDiff > 0;
  }

  /**
   * 내용이 감소했는지 확인하는 메서드
   * @returns 내용이 감소한 경우 true, 아닌 경우 false
   */
  isContentDecreased(): boolean {
    return this.characterDiff < 0;
  }

  /**
   * 내용 변화가 없는지 확인하는 메서드
   * @returns 내용 변화가 없는 경우 true, 아닌 경우 false
   */
  isContentUnchanged(): boolean {
    return this.characterDiff === 0;
  }

  /**
   * 버전 설명 반환 메서드
   * @returns 버전에 대한 설명 문자열
   */
  getVersionDescription(): string {
    if (this.isOriginalVersion()) {
      return '원본 버전';
    }

    const changeType = this.isMajorChange ? '주요 변경' : '일반 변경';
    const saveType = this.isAutoSave ? '자동 저장' : '수동 저장';

    return `버전 ${this.version} (${changeType}, ${saveType})`;
  }

  /**
   * 변경 정도를 문자열로 반환하는 메서드
   * @returns 변경 정도 설명
   */
  getChangeMagnitude(): string {
    const absChange = Math.abs(this.characterDiff);

    if (absChange === 0) {
      return '변화 없음';
    } else if (absChange <= 10) {
      return '소폭 변경';
    } else if (absChange <= 100) {
      return '중간 변경';
    } else {
      return '대폭 변경';
    }
  }

  /**
   * 버전 간 시간 차이를 계산하는 메서드
   * @param previousVersion 이전 버전
   * @returns 시간 차이 (분 단위)
   */
  getTimeDifferenceFromPrevious(previousVersion: PostVersion): number {
    const diffMs =
      this.createdAt.getTime() - previousVersion.createdAt.getTime();
    return Math.floor(diffMs / (1000 * 60));
  }

  /**
   * 버전 요약 정보 반환 메서드
   * @param maxLength 요약 최대 길이 (기본값: 100)
   * @returns 요약된 버전 정보
   */
  getVersionSummary(maxLength: number = 100): string {
    const summary = this.changeSummary || this.content;
    if (summary.length <= maxLength) {
      return summary;
    }
    return summary.substring(0, maxLength) + '...';
  }

  /**
   * 버전 복원 가능 여부 확인 메서드
   * @returns 복원 가능한 경우 true, 아닌 경우 false
   */
  isRestorable(): boolean {
    return this.isEntityActive && !this.isOriginalVersion();
  }

  /**
   * 버전 비교 우선순위 반환 메서드
   * 최신 버전이 높은 우선순위를 가집니다.
   * @returns 우선순위 점수
   */
  getVersionPriority(): number {
    return this.version;
  }
}
