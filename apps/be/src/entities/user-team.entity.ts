import 'reflect-metadata';
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
import { User, UserProgressAction, USER_PROGRESS_REWARD } from './user.entity';
import { Team } from './team.entity';
import { LevelUtil } from '../utils/level.util';

/**
 * 팀 경험치 트랜잭션 타입
 * 팀별 경험치 변동 원인을 표준화하여 추적/분석에 사용
 */
export enum TeamExperienceTransactionType {
  CHAT_MESSAGE = 'CHAT_MESSAGE',          // 채팅 메시지 작성
  POST_CREATE = 'POST_CREATE',            // 게시물 작성
  DAILY_ATTENDANCE = 'DAILY_ATTENDANCE',  // 출석 체크
  SYSTEM_ADJUSTMENT = 'SYSTEM_ADJUSTMENT', // 관리자 수동 조정
}

/**
 * 팀 경험치 트랜잭션 인터페이스
 * 경험치 변동 내역을 기록하기 위한 표준 구조
 */
export interface TeamExperienceTransaction {
  userTeamId: string;
  type: TeamExperienceTransactionType;
  experienceGained: number;
  previousExperience: number;
  newExperience: number;
  previousLevel: number;
  newLevel: number;
  levelUp: boolean;
  description?: string;
  referenceType?: 'POST' | 'COMMENT' | 'CHAT_MESSAGE' | 'ATTENDANCE';
  referenceId?: string;
  metadata?: Record<string, any>;
}

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

  /**
   * 최애 선수 이름
   * 사용자가 이 팀과 연결하여 지정한 대표(최애) 선수 이름
   * - nullable: 아직 선택하지 않은 경우 null
   * - 길이 제한: 50자 (DB 컬럼 length 50)
   */
  @Field(() => String, { nullable: true, description: '최애 선수 이름' })
  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '사용자가 지정한 최애 선수 이름',
  })
  favoritePlayerName?: string;

  /**
   * 최애 선수 등번호
   * 사용자가 선택한 최애 선수의 등번호
   * - nullable: 아직 선택하지 않은 경우
   */
  @Field(() => Number, { nullable: true, description: '최애 선수 등번호' })
  @Column({
    type: 'int',
    nullable: true,
    comment: '사용자가 지정한 최애 선수 등번호',
  })
  favoritePlayerNumber?: number;

  /**
   * 이 사용자-팀 관계에 대한 누적 경험치
   * 사용자 전역 경험치와 분리 (팀별 활동 추적)
   */
  @Field(() => Number, {
    description: '해당 팀에 대한 누적 경험치',
    defaultValue: 0,
  })
  @Column({
    type: 'int',
    default: 0,
    nullable: false,
    comment: '사용자-팀 개별 누적 경험치',
  })
  experience: number;

  /**
   * 팀 개별 레벨 (LevelUtil 기반 계산 필드)
   */
  @Field(() => Number, { description: '팀 개별 레벨' })
  get level(): number {
    return LevelUtil.calculateLevel(this.experience || 0);
  }

  /**
   * 이 팀 레벨업까지 필요한 경험치
   */
  @Field(() => Number, {
    description: '이 팀 레벨업까지 남은 경험치',
  })
  get experienceToNextLevel(): number {
    const currentLevel = this.level;
    const nextThreshold = LevelUtil.getExperienceThreshold(currentLevel + 1);
    return Math.max(nextThreshold - (this.experience || 0), 0);
  }

  /**
   * 팀 레벨 진행률 (0~1)
   */
  @Field(() => Number, {
    description: '현재 팀 레벨 진행률 (0~1)',
  })
  get levelProgressRatio(): number {
    const curStart = LevelUtil.getExperienceThreshold(this.level);
    const next = LevelUtil.getExperienceThreshold(this.level + 1);
    if (next === curStart) return 1;
    return Math.min(1, (this.experience - curStart) / (next - curStart || 1));
  }

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

  // === 경험치 관리 메서드 ===

  /**
   * 경험치 추가 및 레벨업 정보 반환
   * @param experience 추가할 경험치 양
   * @returns 레벨업 정보
   */
  addExperience(experience: number): {
    previousLevel: number;
    newLevel: number;
    levelUp: boolean;
    experienceGained: number;
    totalExperience: number;
  } {
    const safeExp = Math.max(0, Math.floor(experience));
    const previousLevel = this.level;
    const previousExperience = this.experience || 0;

    this.experience = previousExperience + safeExp;
    const newLevel = this.level;

    return {
      previousLevel,
      newLevel,
      levelUp: newLevel > previousLevel,
      experienceGained: safeExp,
      totalExperience: this.experience,
    };
  }

  /**
   * 채팅 메시지 작성으로 경험치 적립
   * @returns 레벨업 정보
   */
  earnExperienceForChat(): {
    previousLevel: number;
    newLevel: number;
    levelUp: boolean;
    experienceGained: number;
    totalExperience: number;
  } {
    const expGain = USER_PROGRESS_REWARD[UserProgressAction.CHAT_MESSAGE];
    return this.addExperience(expGain);
  }

  /**
   * 게시물 작성으로 경험치 적립
   * @returns 레벨업 정보
   */
  earnExperienceForPost(): {
    previousLevel: number;
    newLevel: number;
    levelUp: boolean;
    experienceGained: number;
    totalExperience: number;
  } {
    const expGain = USER_PROGRESS_REWARD[UserProgressAction.POST_CREATE];
    return this.addExperience(expGain);
  }

  /**
   * 출석 체크로 경험치 적립
   * @returns 레벨업 정보
   */
  earnExperienceForAttendance(): {
    previousLevel: number;
    newLevel: number;
    levelUp: boolean;
    experienceGained: number;
    totalExperience: number;
  } {
    const expGain = USER_PROGRESS_REWARD[UserProgressAction.DAILY_ATTENDANCE];
    return this.addExperience(expGain);
  }

  /**
   * 사용자 액션에 따른 경험치 적립 (범용 메서드)
   * @param action 사용자 액션 타입
   * @returns 레벨업 정보
   */
  earnExperienceForAction(action: UserProgressAction): {
    previousLevel: number;
    newLevel: number;
    levelUp: boolean;
    experienceGained: number;
    totalExperience: number;
  } {
    const expGain = USER_PROGRESS_REWARD[action];
    return this.addExperience(expGain);
  }

  /**
   * 경험치 증가 시뮬레이션 (실제 적용 전 미리보기)
   * @param additionalExperience 추가될 경험치
   * @returns 시뮬레이션 결과
   */
  simulateExperienceGain(additionalExperience: number): {
    previousLevel: number;
    newLevel: number;
    levelUp: boolean;
    experienceGained: number;
    currentExperience: number;
    projectedExperience: number;
    toNextBefore: number;
    toNextAfter: number;
  } {
    const safeExp = Math.max(0, Math.floor(additionalExperience));
    const currentExp = this.experience || 0;
    const previousLevel = this.level;

    const simulation = LevelUtil.simulateAddExperience(currentExp, safeExp);

    return {
      previousLevel,
      newLevel: simulation.newLevel,
      levelUp: simulation.levelUp,
      experienceGained: safeExp,
      currentExperience: currentExp,
      projectedExperience: simulation.newExperience,
      toNextBefore: simulation.toNextBefore,
      toNextAfter: simulation.toNextAfter,
    };
  }

  /**
   * 레벨업 보상 정보 계산
   * @param fromLevel 이전 레벨
   * @param toLevel 새로운 레벨
   * @returns 보상 정보
   */
  calculateLevelUpRewards(fromLevel: number, toLevel: number): {
    levelGained: number;
    bonusPoints?: number;
    unlockedFeatures?: string[];
  } {
    const levelGained = toLevel - fromLevel;

    // 레벨업 보상 로직 (필요에 따라 확장)
    const rewards = {
      levelGained,
      bonusPoints: levelGained * 10, // 레벨당 10 포인트 보너스
      unlockedFeatures: levelGained >= 5 ? ['프리미엄 기능 해제'] : [],
    };

    return rewards;
  }

  /**
   * 현재 팀 레벨의 상세 정보
   * @returns 레벨 상세 정보
   */
  getDetailedLevelInfo(): {
    currentLevel: number;
    currentExperience: number;
    experienceToNext: number;
    levelProgressRatio: number;
    nextLevelThreshold: number;
    isMaxLevel: boolean;
  } {
    const currentExp = this.experience || 0;
    const currentLevel = this.level;
    const nextThreshold = LevelUtil.getExperienceThreshold(currentLevel + 1);
    const currentThreshold = LevelUtil.getExperienceThreshold(currentLevel);

    return {
      currentLevel,
      currentExperience: currentExp,
      experienceToNext: Math.max(0, nextThreshold - currentExp),
      levelProgressRatio: currentLevel >= LevelUtil.LEVEL_THRESHOLDS.length - 1 ? 1 :
        Math.min(1, Math.max(0, (currentExp - currentThreshold) / (nextThreshold - currentThreshold))),
      nextLevelThreshold: nextThreshold,
      isMaxLevel: currentLevel >= LevelUtil.LEVEL_THRESHOLDS.length - 1,
    };
  }

  // === 트랜잭션 생성 팩토리 메서드 ===

  /**
   * 경험치 트랜잭션 생성 (채팅 메시지)
   * @param referenceId 관련 채팅 메시지 ID (선택사항)
   * @param description 설명 (선택사항)
   * @returns 트랜잭션 객체
   */
  createChatExperienceTransaction(
    referenceId?: string,
    description?: string,
  ): TeamExperienceTransaction {
    const previousExp = this.experience || 0;
    const previousLevel = this.level;
    const expGain = USER_PROGRESS_REWARD[UserProgressAction.CHAT_MESSAGE];

    return {
      userTeamId: this.id,
      type: TeamExperienceTransactionType.CHAT_MESSAGE,
      experienceGained: expGain,
      previousExperience: previousExp,
      newExperience: previousExp + expGain,
      previousLevel,
      newLevel: LevelUtil.calculateLevel(previousExp + expGain),
      levelUp: LevelUtil.calculateLevel(previousExp + expGain) > previousLevel,
      description: description || `채팅 메시지 작성으로 ${expGain} 경험치 획득`,
      referenceType: 'CHAT_MESSAGE',
      referenceId,
    };
  }

  /**
   * 경험치 트랜잭션 생성 (게시물 작성)
   * @param referenceId 관련 게시물 ID (선택사항)
   * @param description 설명 (선택사항)
   * @returns 트랜잭션 객체
   */
  createPostExperienceTransaction(
    referenceId?: string,
    description?: string,
  ): TeamExperienceTransaction {
    const previousExp = this.experience || 0;
    const previousLevel = this.level;
    const expGain = USER_PROGRESS_REWARD[UserProgressAction.POST_CREATE];

    return {
      userTeamId: this.id,
      type: TeamExperienceTransactionType.POST_CREATE,
      experienceGained: expGain,
      previousExperience: previousExp,
      newExperience: previousExp + expGain,
      previousLevel,
      newLevel: LevelUtil.calculateLevel(previousExp + expGain),
      levelUp: LevelUtil.calculateLevel(previousExp + expGain) > previousLevel,
      description: description || `게시물 작성으로 ${expGain} 경험치 획득`,
      referenceType: 'POST',
      referenceId,
    };
  }

  /**
   * 경험치 트랜잭션 생성 (출석 체크)
   * @param referenceId 관련 출석 기록 ID (선택사항)
   * @param description 설명 (선택사항)
   * @returns 트랜잭션 객체
   */
  createAttendanceExperienceTransaction(
    referenceId?: string,
    description?: string,
  ): TeamExperienceTransaction {
    const previousExp = this.experience || 0;
    const previousLevel = this.level;
    const expGain = USER_PROGRESS_REWARD[UserProgressAction.DAILY_ATTENDANCE];

    return {
      userTeamId: this.id,
      type: TeamExperienceTransactionType.DAILY_ATTENDANCE,
      experienceGained: expGain,
      previousExperience: previousExp,
      newExperience: previousExp + expGain,
      previousLevel,
      newLevel: LevelUtil.calculateLevel(previousExp + expGain),
      levelUp: LevelUtil.calculateLevel(previousExp + expGain) > previousLevel,
      description: description || `출석 체크로 ${expGain} 경험치 획득`,
      referenceType: 'ATTENDANCE',
      referenceId,
    };
  }

  /**
   * 범용 경험치 트랜잭션 생성
   * @param action 액션 타입
   * @param referenceType 참조 타입
   * @param referenceId 참조 ID
   * @param description 설명
   * @param metadata 추가 메타데이터
   * @returns 트랜잭션 객체
   */
  createExperienceTransaction(
    action: UserProgressAction,
    referenceType?: 'POST' | 'COMMENT' | 'CHAT_MESSAGE' | 'ATTENDANCE',
    referenceId?: string,
    description?: string,
    metadata?: Record<string, any>,
  ): TeamExperienceTransaction {
    const previousExp = this.experience || 0;
    const previousLevel = this.level;
    const expGain = USER_PROGRESS_REWARD[action];

    let transactionType: TeamExperienceTransactionType;
    switch (action) {
      case UserProgressAction.CHAT_MESSAGE:
        transactionType = TeamExperienceTransactionType.CHAT_MESSAGE;
        break;
      case UserProgressAction.POST_CREATE:
        transactionType = TeamExperienceTransactionType.POST_CREATE;
        break;
      case UserProgressAction.DAILY_ATTENDANCE:
        transactionType = TeamExperienceTransactionType.DAILY_ATTENDANCE;
        break;
      default:
        transactionType = TeamExperienceTransactionType.SYSTEM_ADJUSTMENT;
    }

    return {
      userTeamId: this.id,
      type: transactionType,
      experienceGained: expGain,
      previousExperience: previousExp,
      newExperience: previousExp + expGain,
      previousLevel,
      newLevel: LevelUtil.calculateLevel(previousExp + expGain),
      levelUp: LevelUtil.calculateLevel(previousExp + expGain) > previousLevel,
      description: description || `${action}으로 ${expGain} 경험치 획득`,
      referenceType,
      referenceId,
      metadata,
    };
  }

  // === 정적 팩토리 메서드 ===

  /**
   * 경험치 트랜잭션 생성을 위한 정적 팩토리
   * @param userTeam UserTeam 인스턴스
   * @param action 액션 타입
   * @param referenceType 참조 타입
   * @param referenceId 참조 ID
   * @param description 설명
   * @returns 트랜잭션 객체
   */
  static createTransaction(
    userTeam: UserTeam,
    action: UserProgressAction,
    referenceType?: 'POST' | 'COMMENT' | 'CHAT_MESSAGE' | 'ATTENDANCE',
    referenceId?: string,
    description?: string,
  ): TeamExperienceTransaction {
    return userTeam.createExperienceTransaction(action, referenceType, referenceId, description);
  }
}
