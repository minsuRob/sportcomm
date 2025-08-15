import { Entity, Column, OneToMany, Index } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { IsString, MaxLength, MinLength, IsOptional } from 'class-validator';
import { BaseEntity } from './base.entity';
import { PostTag } from './post-tag.entity';

/**
 * 태그 엔티티
 *
 * 게시물의 주제나 카테고리를 나타내는 태그를 관리합니다.
 * 사용자들이 게시물을 쉽게 분류하고 검색할 수 있도록 도와줍니다.
 */
@ObjectType()
@Entity('tags')
@Index(['name'], { unique: true })
@Index(['usageCount'])
@Index(['createdAt'])
export class Tag extends BaseEntity {
  /**
   * 태그 이름
   * 고유한 태그 이름입니다. (예: "전술분석", "이적소식", "경기예측")
   */
  @Field(() => String, { description: '태그 이름' })
  @Column({
    type: 'varchar',
    length: 50,
    unique: true,
    comment: '태그 이름 (고유값)',
  })
  @IsString({ message: '태그 이름은 문자열이어야 합니다.' })
  @MinLength(1, { message: '태그 이름은 최소 1자 이상이어야 합니다.' })
  @MaxLength(50, { message: '태그 이름은 최대 50자까지 가능합니다.' })
  name: string;

  /**
   * 태그 색상
   * 태그를 시각적으로 구분하기 위한 색상 코드입니다.
   */
  @Field(() => String, { nullable: true, description: '태그 색상 (HEX 코드)' })
  @Column({
    type: 'varchar',
    length: 7,
    nullable: true,
    comment: '태그 색상 (HEX 코드)',
  })
  @IsOptional()
  @IsString({ message: '태그 색상은 문자열이어야 합니다.' })
  color?: string;

  /**
   * 태그 설명
   * 태그의 용도나 의미를 설명하는 텍스트입니다.
   */
  @Field(() => String, { nullable: true, description: '태그 설명' })
  @Column({
    type: 'text',
    nullable: true,
    comment: '태그 설명',
  })
  @IsOptional()
  @IsString({ message: '태그 설명은 문자열이어야 합니다.' })
  @MaxLength(500, { message: '태그 설명은 최대 500자까지 가능합니다.' })
  description?: string;

  /**
   * 태그 사용 횟수
   * 이 태그가 사용된 게시물의 총 개수입니다.
   */
  @Field(() => Number, { description: '태그 사용 횟수' })
  @Column({
    type: 'int',
    default: 0,
    comment: '태그 사용 횟수',
  })
  usageCount: number;

  /**
   * 태그 활성화 상태
   * 비활성화된 태그는 새로운 게시물에 사용할 수 없습니다.
   */
  @Field(() => Boolean, { description: '태그 활성화 상태' })
  @Column({
    type: 'boolean',
    default: true,
    comment: '태그 활성화 상태',
  })
  isActive: boolean;

  // === 관계 설정 ===

  /**
   * 이 태그를 사용하는 게시물들과의 관계
   * 일대다 관계: 한 태그는 여러 게시물에서 사용될 수 있습니다.
   */
  @Field(() => [PostTag], {
    nullable: true,
    description: '이 태그를 사용하는 게시물 관계',
  })
  @OneToMany(() => PostTag, (postTag) => postTag.tag)
  postTags: PostTag[];

  // === 헬퍼 메서드 ===

  /**
   * 태그 사용 횟수 증가 메서드
   * @param count 증가시킬 횟수 (기본값: 1)
   */
  incrementUsageCount(count: number = 1): void {
    this.usageCount += count;
  }

  /**
   * 태그 사용 횟수 감소 메서드
   * @param count 감소시킬 횟수 (기본값: 1)
   */
  decrementUsageCount(count: number = 1): void {
    this.usageCount = Math.max(0, this.usageCount - count);
  }

  /**
   * 태그 활성화/비활성화 토글 메서드
   */
  toggleActive(): void {
    this.isActive = !this.isActive;
  }

  /**
   * 태그가 인기 태그인지 확인하는 메서드
   * @param threshold 인기 태그 기준 사용 횟수 (기본값: 10)
   * @returns 인기 태그 여부
   */
  isPopular(threshold: number = 10): boolean {
    return this.usageCount >= threshold;
  }

  /**
   * 태그 표시용 텍스트 반환 메서드
   * @returns 해시태그 형태의 문자열 (예: "#전술분석")
   */
  getDisplayText(): string {
    return `#${this.name}`;
  }
}
