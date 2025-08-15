import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  RelationId,
} from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { IsString, MaxLength, MinLength, IsHexColor } from 'class-validator';
import { BaseEntity } from './base.entity';
import { Sport } from './sport.entity';
import { UserTeam } from './user-team.entity';
import { Post } from './post.entity';

/**
 * 팀 엔티티
 *
 * 각 스포츠에 속한 팀 정보를 관리합니다.
 * 사용자가 선택할 수 있는 팀들을 정의합니다.
 */
@ObjectType()
@Entity('teams')
@Index(['name'], { unique: true })
export class Team extends BaseEntity {
  /**
   * 팀 이름
   * 고유값이며 다른 팀과 중복될 수 없습니다.
   */
  @Field(() => String, { description: '팀 이름' })
  @Column({
    type: 'varchar',
    length: 100,
    unique: true,
    comment: '팀 이름 (예: 토트넘, 두산, T1)',
  })
  @IsString({ message: '팀 이름은 문자열이어야 합니다.' })
  @MinLength(1, { message: '팀 이름은 최소 1자 이상이어야 합니다.' })
  @MaxLength(100, { message: '팀 이름은 최대 100자까지 가능합니다.' })
  name: string;

  /**
   * 팀 영문 코드
   * PostType enum과의 호환성을 위한 필드입니다.
   */
  @Field(() => String, { description: '팀 영문 코드' })
  @Column({
    type: 'varchar',
    length: 50,
    unique: true,
    comment: '팀 영문 코드 (PostType enum과 매핑)',
  })
  @IsString({ message: '팀 코드는 문자열이어야 합니다.' })
  @MaxLength(50, { message: '팀 코드는 최대 50자까지 가능합니다.' })
  code: string;

  /**
   * 팀 대표 색상
   * UI에서 팀을 표시할 때 사용하는 색상입니다.
   */
  @Field(() => String, { description: '팀 대표 색상' })
  @Column({
    type: 'varchar',
    length: 7,
    comment: '팀 대표 색상 (HEX 코드)',
  })
  @IsString({ message: '팀 색상은 문자열이어야 합니다.' })
  @IsHexColor({ message: '올바른 HEX 색상 코드를 입력해주세요.' })
  color: string;

  /**
   * 팀 아이콘 (이모지)
   * UI에서 표시할 아이콘입니다.
   */
  @Field(() => String, { description: '팀 아이콘' })
  @Column({
    type: 'varchar',
    length: 10,
    comment: '팀 아이콘 (이모지)',
  })
  @IsString({ message: '팀 아이콘은 문자열이어야 합니다.' })
  @MaxLength(10, { message: '팀 아이콘은 최대 10자까지 가능합니다.' })
  icon: string;

  /**
   * 팀 로고 이미지 URL
   * webp 형식의 팀 로고 이미지 URL입니다.
   */
  @Field(() => String, {
    nullable: true,
    description: '팀 로고 이미지 URL (webp 형식)',
  })
  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: '팀 로고 이미지 URL (webp 형식)',
  })
  @IsString({ message: '로고 URL은 문자열이어야 합니다.' })
  @MaxLength(500, { message: '로고 URL은 최대 500자까지 가능합니다.' })
  logoUrl?: string;

  /**
   * 팀 설명
   * 선택적 필드입니다.
   */
  @Field(() => String, { nullable: true, description: '팀 설명' })
  @Column({
    type: 'text',
    nullable: true,
    comment: '팀 설명',
  })
  @IsString({ message: '팀 설명은 문자열이어야 합니다.' })
  @MaxLength(1000, { message: '팀 설명은 최대 1000자까지 가능합니다.' })
  description?: string;

  /**
   * 정렬 순서
   * 같은 스포츠 내에서 팀들의 표시 순서를 결정합니다.
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
   * 비활성화된 팀은 UI에서 숨겨집니다.
   */
  @Field(() => Boolean, { description: '활성화 여부' })
  @Column({
    type: 'boolean',
    default: true,
    comment: '활성화 여부',
  })
  isActive: boolean;

  /**
   * 소속 스포츠 ID
   * Sport 엔티티와의 관계를 위한 외래키입니다.
   */
  @Field(() => String, { nullable: true, description: '소속 스포츠 ID' })
  @Column({ type: 'uuid', nullable: true, comment: '소속 스포츠 ID' })
  sportId?: string;

  // === 관계 설정 ===

  /**
   * 소속 스포츠
   * 다대일 관계: 여러 팀이 하나의 스포츠에 속할 수 있습니다.
   */
  @Field(() => Sport, { nullable: true, description: '소속 스포츠' })
  @ManyToOne(() => Sport, (sport) => sport.teams, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'sportId' })
  sport?: Sport;

  /**
   * 이 팀을 선택한 사용자들과의 관계
   * 일대다 관계: 한 팀은 여러 사용자에게 선택될 수 있습니다.
   */
  @Field(() => [UserTeam], { description: '이 팀을 선택한 사용자들' })
  @OneToMany(() => UserTeam, (userTeam) => userTeam.team)
  userTeams: UserTeam[];

  @OneToMany(() => Post, (post) => post.team)
  posts: Post[];

  // === 헬퍼 메서드 ===

  /**
   * 팀의 전체 이름 반환 (스포츠명 포함)
   * @returns 스포츠명과 팀명을 결합한 문자열
   */
  getFullName(): string {
    return `${this.sport?.name || ''} ${this.name}`.trim();
  }

  /**
   * 팀이 특정 스포츠에 속하는지 확인
   * @param sportName 확인할 스포츠 이름
   * @returns 해당 스포츠에 속하면 true
   */
  belongsToSport(sportName: string): boolean {
    return this.sport?.name === sportName;
  }
}
