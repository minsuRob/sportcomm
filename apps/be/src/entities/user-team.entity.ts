import {
  Entity,
  ManyToOne,
  JoinColumn,
  RelationId,
  Index,
  Column,
} from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Team } from './team.entity';

/**
 * 사용자-팀 관계 엔티티
 *
 * 사용자가 선택한 팀들을 관리하는 중간 테이블입니다.
 * 다대다 관계를 구현하여 한 사용자가 여러 팀을 선택할 수 있고,
 * 한 팀이 여러 사용자에게 선택될 수 있습니다.
 */
@ObjectType()
@Entity('user_teams')
export class UserTeam extends BaseEntity {
  /**
   * 사용자 ID
   * User 엔티티와의 관계를 위한 외래키입니다.
   */
  @Field(() => String, { description: '사용자 ID' })
  @RelationId((userTeam: UserTeam) => userTeam.user)
  @Column({ name: 'userId' })
  userId: string;

  /**
   * 팀 ID
   * Team 엔티티와의 관계를 위한 외래키입니다.
   */
  @Field(() => String, { description: '팀 ID' })
  @RelationId((userTeam: UserTeam) => userTeam.team)
  @Column({ name: 'teamId' })
  teamId: string;

  /**
   * 선택 순서
   * 사용자가 팀을 선택한 순서를 나타냅니다.
   * 첫 번째로 선택한 팀이 주 팀으로 간주될 수 있습니다.
   */
  @Field(() => Number, { description: '선택 순서' })
  @Column({
    type: 'int',
    default: 0,
    comment: '팀 선택 순서 (0이 가장 우선)',
  })
  priority: number;

  /**
   * 알림 수신 여부
   * 이 팀 관련 알림을 받을지 여부를 결정합니다.
   */
  @Field(() => Boolean, { description: '알림 수신 여부' })
  @Column({
    type: 'boolean',
    default: true,
    comment: '팀 관련 알림 수신 여부',
  })
  notificationEnabled: boolean;

  /**
   * 팀을 좋아하게 된 날짜
   * 사용자가 해당 팀을 좋아하게 된 날짜를 저장합니다.
   */
  @Field(() => Date, { nullable: true, description: '팀을 좋아하게 된 날짜' })
  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '팀을 좋아하게 된 날짜',
  })
  favoriteDate?: Date;

  // === 관계 설정 ===

  /**
   * 사용자
   * 다대일 관계: 여러 UserTeam이 하나의 User에 속할 수 있습니다.
   */
  @Field(() => User, { description: '사용자' })
  @ManyToOne(() => User, (user) => user.userTeams, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  /**
   * 팀
   * 다대일 관계: 여러 UserTeam이 하나의 Team에 속할 수 있습니다.
   */
  @Field(() => Team, { description: '팀' })
  @ManyToOne(() => Team, (team) => team.userTeams, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'teamId' })
  team: Team;

  // === 헬퍼 메서드 ===

  /**
   * 주 팀인지 확인 (우선순위가 0인 팀)
   * @returns 주 팀이면 true
   */
  isPrimaryTeam(): boolean {
    return this.priority === 0;
  }

  /**
   * 팀 선택 정보를 문자열로 반환
   * @returns 사용자명과 팀명을 포함한 문자열
   */
  toString(): string {
    return `${this.user?.nickname || 'Unknown'} -> ${this.team?.name || 'Unknown Team'}`;
  }
}
