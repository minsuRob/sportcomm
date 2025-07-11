import {
  Entity,
  Column,
  OneToMany,
  ManyToMany,
  JoinTable,
  Index,
} from 'typeorm';
import { ObjectType, Field, registerEnumType } from '@nestjs/graphql';
import {
  IsString,
  IsEnum,
  MaxLength,
  MinLength,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { ChatMessage } from './chat-message.entity';

/**
 * 채팅방 유형 열거형
 * 다양한 종류의 채팅방을 정의합니다.
 */
export enum ChatRoomType {
  /** 개인 채팅방 (1:1 채팅) */
  PRIVATE = 'PRIVATE',
  /** 그룹 채팅방 (다수 참여) */
  GROUP = 'GROUP',
  /** 공개 채팅방 (누구나 참여 가능) */
  PUBLIC = 'PUBLIC',
}

// GraphQL 스키마에 ChatRoomType enum 등록
registerEnumType(ChatRoomType, {
  name: 'ChatRoomType',
  description: '채팅방 유형',
  valuesMap: {
    PRIVATE: {
      description: '개인 채팅방 (1:1 채팅)',
    },
    GROUP: {
      description: '그룹 채팅방 (다수 참여)',
    },
    PUBLIC: {
      description: '공개 채팅방 (누구나 참여 가능)',
    },
  },
});

/**
 * 채팅방 엔티티
 *
 * 사용자들이 실시간으로 소통할 수 있는 채팅방을 관리합니다.
 * 개인 채팅, 그룹 채팅, 공개 채팅 등 다양한 형태를 지원하며,
 * 참여자 관리, 메시지 이력, 설정 등을 포함합니다.
 */
@ObjectType()
@Entity('chat_rooms')
@Index(['type'])
@Index(['isRoomActive'])
@Index(['createdAt'])
@Index(['name'])
export class ChatRoom extends BaseEntity {
  /**
   * 채팅방 이름
   * 채팅방을 식별하는 이름입니다.
   */
  @Field(() => String, { description: '채팅방 이름' })
  @Column({
    type: 'varchar',
    length: 100,
    comment: '채팅방 이름',
  })
  @IsString({ message: '채팅방 이름은 문자열이어야 합니다.' })
  @MinLength(1, { message: '채팅방 이름은 최소 1자 이상이어야 합니다.' })
  @MaxLength(100, { message: '채팅방 이름은 최대 100자까지 가능합니다.' })
  name: string;

  /**
   * 채팅방 설명
   * 채팅방의 목적이나 규칙을 설명합니다.
   */
  @Field(() => String, { nullable: true, description: '채팅방 설명' })
  @Column({
    type: 'text',
    nullable: true,
    comment: '채팅방 설명',
  })
  @IsString({ message: '채팅방 설명은 문자열이어야 합니다.' })
  @MaxLength(1000, { message: '채팅방 설명은 최대 1,000자까지 가능합니다.' })
  description?: string;

  /**
   * 채팅방 유형
   * 개인, 그룹, 공개 채팅방 중 하나입니다.
   */
  @Field(() => ChatRoomType, { description: '채팅방 유형' })
  @Column({
    type: 'enum',
    enum: ChatRoomType,
    default: ChatRoomType.PRIVATE,
    comment: '채팅방 유형',
  })
  @IsEnum(ChatRoomType, { message: '올바른 채팅방 유형을 선택해주세요.' })
  type: ChatRoomType;

  /**
   * 채팅방 활성화 상태
   * 비활성화된 채팅방은 메시지를 보낼 수 없습니다.
   */
  @Field(() => Boolean, { description: '채팅방 활성화 상태' })
  @Column({
    type: 'boolean',
    default: true,
    comment: '채팅방 활성화 상태',
  })
  isRoomActive: boolean;

  /**
   * 최대 참여자 수
   * 채팅방에 참여할 수 있는 최대 인원수입니다.
   */
  @Field(() => Number, { description: '최대 참여자 수' })
  @Column({
    type: 'int',
    default: 2,
    comment: '최대 참여자 수',
  })
  @IsNumber({}, { message: '최대 참여자 수는 숫자여야 합니다.' })
  @Min(2, { message: '최대 참여자 수는 최소 2명 이상이어야 합니다.' })
  @Max(1000, { message: '최대 참여자 수는 최대 1000명까지 가능합니다.' })
  maxParticipants: number;

  /**
   * 현재 참여자 수
   * 현재 채팅방에 참여 중인 사용자 수입니다.
   */
  @Field(() => Number, { description: '현재 참여자 수' })
  @Column({
    type: 'int',
    default: 0,
    comment: '현재 참여자 수',
  })
  @IsNumber({}, { message: '현재 참여자 수는 숫자여야 합니다.' })
  @Min(0, { message: '현재 참여자 수는 0 이상이어야 합니다.' })
  currentParticipants: number;

  /**
   * 채팅방 프로필 이미지 URL
   * 채팅방을 대표하는 이미지입니다.
   */
  @Field(() => String, {
    nullable: true,
    description: '채팅방 프로필 이미지 URL',
  })
  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: '채팅방 프로필 이미지 URL',
  })
  @IsString({ message: '프로필 이미지 URL은 문자열이어야 합니다.' })
  @MaxLength(500, { message: '프로필 이미지 URL은 최대 500자까지 가능합니다.' })
  profileImageUrl?: string;

  /**
   * 최근 메시지 내용
   * 채팅방에서 가장 최근에 전송된 메시지의 내용입니다.
   */
  @Field(() => String, { nullable: true, description: '최근 메시지 내용' })
  @Column({
    type: 'text',
    nullable: true,
    comment: '최근 메시지 내용',
  })
  @IsString({ message: '최근 메시지 내용은 문자열이어야 합니다.' })
  lastMessageContent?: string;

  /**
   * 최근 메시지 전송 시간
   * 가장 최근 메시지가 전송된 시간입니다.
   */
  @Field(() => Date, { nullable: true, description: '최근 메시지 전송 시간' })
  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '최근 메시지 전송 시간',
  })
  lastMessageAt?: Date;

  /**
   * 총 메시지 수
   * 채팅방에서 전송된 전체 메시지 수입니다.
   */
  @Field(() => Number, { description: '총 메시지 수' })
  @Column({
    type: 'int',
    default: 0,
    comment: '총 메시지 수',
  })
  @IsNumber({}, { message: '총 메시지 수는 숫자여야 합니다.' })
  @Min(0, { message: '총 메시지 수는 0 이상이어야 합니다.' })
  totalMessages: number;

  /**
   * 비밀번호 보호 여부
   * 공개 채팅방에서 비밀번호가 필요한지 여부입니다.
   */
  @Field(() => Boolean, { description: '비밀번호 보호 여부' })
  @Column({
    type: 'boolean',
    default: false,
    comment: '비밀번호 보호 여부',
  })
  isPasswordProtected: boolean;

  /**
   * 채팅방 비밀번호
   * 보호된 채팅방에 입장하기 위한 비밀번호입니다.
   * GraphQL 스키마에 노출되지 않습니다.
   */
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '채팅방 비밀번호 (해시된 값)',
  })
  @IsString({ message: '비밀번호는 문자열이어야 합니다.' })
  password?: string;

  // === 관계 설정 ===

  /**
   * 채팅방 참여자들
   * 다대다 관계: 여러 사용자가 여러 채팅방에 참여할 수 있습니다.
   */
  @Field(() => [User], { description: '채팅방 참여자 목록' })
  @ManyToMany(() => User, { cascade: true })
  @JoinTable({
    name: 'chat_room_participants',
    joinColumn: {
      name: 'roomId',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'userId',
      referencedColumnName: 'id',
    },
  })
  participants: User[];

  /**
   * 채팅방 메시지들
   * 일대다 관계: 한 채팅방에는 여러 메시지가 있습니다.
   */
  @Field(() => [ChatMessage], { description: '채팅방 메시지 목록' })
  @OneToMany(() => ChatMessage, (chatMessage) => chatMessage.room)
  messages: ChatMessage[];

  // === 헬퍼 메서드 ===

  /**
   * 개인 채팅방인지 확인하는 메서드
   * @returns 개인 채팅방인 경우 true, 아닌 경우 false
   */
  isPrivateChat(): boolean {
    return this.type === ChatRoomType.PRIVATE;
  }

  /**
   * 그룹 채팅방인지 확인하는 메서드
   * @returns 그룹 채팅방인 경우 true, 아닌 경우 false
   */
  isGroupChat(): boolean {
    return this.type === ChatRoomType.GROUP;
  }

  /**
   * 공개 채팅방인지 확인하는 메서드
   * @returns 공개 채팅방인 경우 true, 아닌 경우 false
   */
  isPublicChat(): boolean {
    return this.type === ChatRoomType.PUBLIC;
  }

  /**
   * 채팅방이 가득 찼는지 확인하는 메서드
   * @returns 가득 찬 경우 true, 아닌 경우 false
   */
  isFull(): boolean {
    return this.currentParticipants >= this.maxParticipants;
  }

  /**
   * 채팅방에 참여할 수 있는지 확인하는 메서드
   * @returns 참여 가능한 경우 true, 아닌 경우 false
   */
  canJoin(): boolean {
    return this.isRoomActive && !this.isFull();
  }

  /**
   * 참여자 수 증가 메서드
   * @param count 증가시킬 참여자 수 (기본값: 1)
   */
  incrementParticipants(count: number = 1): void {
    this.currentParticipants = Math.min(
      this.currentParticipants + count,
      this.maxParticipants,
    );
  }

  /**
   * 참여자 수 감소 메서드
   * @param count 감소시킬 참여자 수 (기본값: 1)
   */
  decrementParticipants(count: number = 1): void {
    this.currentParticipants = Math.max(this.currentParticipants - count, 0);
  }

  /**
   * 총 메시지 수 증가 메서드
   * @param count 증가시킬 메시지 수 (기본값: 1)
   */
  incrementMessageCount(count: number = 1): void {
    this.totalMessages += count;
  }

  /**
   * 최근 메시지 정보 업데이트 메서드
   * @param content 메시지 내용
   * @param timestamp 메시지 전송 시간
   */
  updateLastMessage(content: string, timestamp: Date): void {
    this.lastMessageContent = content;
    this.lastMessageAt = timestamp;
  }

  /**
   * 채팅방 비활성화 메서드
   */
  deactivate(): void {
    this.isRoomActive = false;
  }

  /**
   * 채팅방 활성화 메서드
   */
  activate(): void {
    this.isRoomActive = true;
  }

  /**
   * 채팅방 사용률 계산 메서드
   * @returns 사용률 (0-1 사이 값)
   */
  getUsageRate(): number {
    if (this.maxParticipants === 0) return 0;
    return this.currentParticipants / this.maxParticipants;
  }

  /**
   * 채팅방 활성도 확인 메서드
   * @param hoursThreshold 활성도 기준 시간 (기본값: 24시간)
   * @returns 활성 상태인 경우 true, 아닌 경우 false
   */
  isRecentlyActive(hoursThreshold: number = 24): boolean {
    if (!this.lastMessageAt) return false;

    const now = new Date();
    const diffHours =
      (now.getTime() - this.lastMessageAt.getTime()) / (1000 * 60 * 60);
    return diffHours <= hoursThreshold;
  }

  /**
   * 채팅방 요약 정보 반환 메서드
   * @returns 채팅방 요약 정보
   */
  getRoomSummary(): string {
    const typeStr =
      this.type === ChatRoomType.PRIVATE
        ? '개인'
        : this.type === ChatRoomType.GROUP
          ? '그룹'
          : '공개';
    return `${this.name} (${typeStr}, ${this.currentParticipants}/${this.maxParticipants}명)`;
  }

  /**
   * 채팅방 표시명 반환 메서드
   * 개인 채팅방의 경우 상대방 이름을 반환할 수 있습니다.
   * @returns 표시할 채팅방 이름
   */
  getDisplayName(): string {
    if (
      this.isPrivateChat() &&
      this.participants &&
      this.participants.length === 2
    ) {
      // 개인 채팅방인 경우 상대방 이름을 반환
      // 실제 구현에서는 현재 사용자 정보를 받아서 상대방을 찾아야 합니다.
      return this.name;
    }
    return this.name;
  }

  /**
   * 채팅방 입장 가능 여부 확인 메서드
   * @param password 입장 시 제공된 비밀번호
   * @returns 입장 가능한 경우 true, 아닌 경우 false
   */
  canEnter(password?: string): boolean {
    if (!this.canJoin()) return false;

    if (this.isPasswordProtected) {
      // 실제 구현에서는 해시된 비밀번호와 비교해야 합니다.
      return !!password && password === this.password;
    }

    return true;
  }

  /**
   * 채팅방 통계 정보 반환 메서드
   * @returns 채팅방 통계 정보
   */
  getStatistics(): {
    totalMessages: number;
    currentParticipants: number;
    maxParticipants: number;
    usageRate: number;
    isActive: boolean;
  } {
    return {
      totalMessages: this.totalMessages,
      currentParticipants: this.currentParticipants,
      maxParticipants: this.maxParticipants,
      usageRate: this.getUsageRate(),
      isActive: this.isRoomActive,
    };
  }
}
