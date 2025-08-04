import { Entity, Column, OneToMany, Index } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { BaseEntity } from './base.entity';
import { Team } from './team.entity';

/**
 * 스포츠 카테고리 엔티티
 *
 * 시스템에서 지원하는 스포츠 종목을 관리합니다.
 * 각 스포츠는 여러 팀을 가질 수 있습니다.
 */
@ObjectType()
@Entity('sports')
@Index(['name'], { unique: true })
export class Sport extends BaseEntity {
  /**
   * 스포츠 이름
   * 고유값이며 다른 스포츠와 중복될 수 없습니다.
   */
  @Field(() => String, { description: '스포츠 이름' })
  @Column({
    type: 'varchar',
    length: 50,
    unique: true,
    comment: '스포츠 이름 (예: 축구, 야구, e스포츠)',
  })
  @IsString({ message: '스포츠 이름은 문자열이어야 합니다.' })
  @MinLength(2, { message: '스포츠 이름은 최소 2자 이상이어야 합니다.' })
  @MaxLength(50, { message: '스포츠 이름은 최대 50자까지 가능합니다.' })
  name: string;

  /**
   * 스포츠 아이콘 (이모지)
   * UI에서 표시할 아이콘입니다.
   */
  @Field(() => String, { description: '스포츠 아이콘' })
  @Column({
    type: 'varchar',
    length: 10,
    comment: '스포츠 아이콘 (이모지)',
  })
  @IsString({ message: '스포츠 아이콘은 문자열이어야 합니다.' })
  @MaxLength(10, { message: '스포츠 아이콘은 최대 10자까지 가능합니다.' })
  icon: string;

  /**
   * 스포츠 설명
   * 선택적 필드입니다.
   */
  @Field(() => String, { nullable: true, description: '스포츠 설명' })
  @Column({
    type: 'text',
    nullable: true,
    comment: '스포츠 설명',
  })
  @IsString({ message: '스포츠 설명은 문자열이어야 합니다.' })
  @MaxLength(500, { message: '스포츠 설명은 최대 500자까지 가능합니다.' })
  description?: string;

  /**
   * 정렬 순서
   * UI에서 표시할 순서를 결정합니다.
   */
  @Field(() => Number, { description: '정렬 순서' })
  @Column({
    type: 'int',
    default: 0,
    comment: '정렬 순서',
  })
  sortOrder: number;

  /**
   * 활성화 여부
   * 비활성화된 스포츠는 UI에서 숨겨집니다.
   */
  @Field(() => Boolean, { description: '활성화 여부' })
  @Column({
    type: 'boolean',
    default: true,
    comment: '활성화 여부',
  })
  isActive: boolean;

  // === 관계 설정 ===

  /**
   * 이 스포츠에 속한 팀들
   * 일대다 관계: 한 스포츠는 여러 팀을 가질 수 있습니다.
   */
  @Field(() => [Team], { description: '소속 팀 목록' })
  @OneToMany(() => Team, (team) => team.sport)
  teams: Team[];
}
