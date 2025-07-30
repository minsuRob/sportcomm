import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ObjectType, Field, registerEnumType } from '@nestjs/graphql';
import {
  IsString,
  IsEnum,
  MaxLength,
  MinLength,
  IsOptional,
} from 'class-validator';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { ChatRoom } from './chat-room.entity';

/**
 * 채팅 메시지 유형 열거형
 * 다양한 종류의 채팅 메시지를 정의합니다.
 */
export enum ChatMessageType {
  /** 일반 텍스트 메시지 */
  TEXT = 'TEXT',
  /** 이미지 메시지 */
  IMAGE = 'IMAGE',
  /** 비디오 메시지 */
  VIDEO = 'VIDEO',
  /** 파일 첨부 메시지 */
  FILE = 'FILE',
  /** 시스템 메시지 (입장, 퇴장 등) */
  SYSTEM = 'SYSTEM',
}

// GraphQL 스키마에 ChatMessageType enum 등록
registerEnumType(ChatMessageType, {
  name: 'ChatMessageType',
  description: '채팅 메시지 유형',
  valuesMap: {
    TEXT: {
      description: '일반 텍스트 메시지',
    },
    IMAGE: {
      description: '이미지 메시지',
    },
    VIDEO: {
      description: '비디오 메시지',
    },
    FILE: {
      description: '파일 첨부 메시지',
    },
    SYSTEM: {
      description: '시스템 메시지 (입장, 퇴장 등)',
    },
  },
});

/**
 * 채팅 메시지 엔티티
 *
 * 채팅방에서 주고받는 메시지를 관리합니다.
 * 텍스트, 이미지, 비디오, 파일 등 다양한 형태의 메시지를 지원하며,
 * 메시지 상태, 읽음 확인, 반응 등의 기능을 제공합니다.
 */
@ObjectType()
@Entity('chat_messages')
@Index(['authorId'])
@Index(['roomId'])
@Index(['type'])
@Index(['createdAt'])
@Index(['isRead'])
export class ChatMessage extends BaseEntity {
  /**
   * 메시지 내용
   * 사용자가 전송한 메시지의 본문입니다.
   */
  @Field(() => String, { description: '메시지 내용' })
  @Column({
    type: 'text',
    comment: '메시지 내용',
  })
  @IsString({ message: '메시지 내용은 문자열이어야 합니다.' })
  @MinLength(1, { message: '메시지 내용은 최소 1자 이상이어야 합니다.' })
  @MaxLength(5000, { message: '메시지 내용은 최대 5,000자까지 가능합니다.' })
  content: string;

  /**
   * 메시지 유형
   * 텍스트, 이미지, 비디오, 파일, 시스템 메시지 중 하나입니다.
   */
  @Field(() => ChatMessageType, { description: '메시지 유형' })
  @Column({
    type: 'enum',
    enum: ChatMessageType,
    default: ChatMessageType.TEXT,
    comment: '메시지 유형',
  })
  @IsEnum(ChatMessageType, { message: '올바른 메시지 유형을 선택해주세요.' })
  type: ChatMessageType;

  /**
   * 메시지 읽음 상태
   * 메시지가 읽혔는지 여부를 나타냅니다.
   */
  @Field(() => Boolean, { description: '메시지 읽음 상태' })
  @Column({
    type: 'boolean',
    default: false,
    comment: '메시지 읽음 상태',
  })
  isRead: boolean;

  /**
   * 메시지 수정 여부
   * 메시지가 수정되었는지 여부를 나타냅니다.
   */
  @Field(() => Boolean, { description: '메시지 수정 여부' })
  @Column({
    type: 'boolean',
    default: false,
    comment: '메시지 수정 여부',
  })
  isEdited: boolean;

  /**
   * 메시지 고정 여부
   * 중요한 메시지를 채팅방에 고정할 수 있습니다.
   */
  @Field(() => Boolean, { description: '메시지 고정 여부' })
  @Column({
    type: 'boolean',
    default: false,
    comment: '메시지 고정 여부',
  })
  isPinned: boolean;

  /**
   * 메시지 읽음 시간
   * 메시지가 읽힌 시간을 기록합니다.
   */
  @Field(() => Date, { nullable: true, description: '메시지 읽음 시간' })
  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '메시지 읽음 시간',
  })
  readAt?: Date;

  /**
   * 메시지 수정 시간
   * 메시지가 마지막으로 수정된 시간을 기록합니다.
   */
  @Field(() => Date, { nullable: true, description: '메시지 수정 시간' })
  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '메시지 수정 시간',
  })
  editedAt?: Date;

  /**
   * 첨부 파일 URL
   * 이미지, 비디오, 파일 메시지인 경우 파일의 URL입니다.
   */
  @Field(() => String, { nullable: true, description: '첨부 파일 URL' })
  @Column({
    type: 'varchar',
    length: 1000,
    nullable: true,
    comment: '첨부 파일 URL',
  })
  @IsOptional()
  @IsString({ message: '첨부 파일 URL은 문자열이어야 합니다.' })
  @MaxLength(1000, { message: '첨부 파일 URL은 최대 1000자까지 가능합니다.' })
  attachmentUrl?: string;

  /**
   * 첨부 파일 이름
   * 첨부 파일의 원본 이름입니다.
   */
  @Field(() => String, { nullable: true, description: '첨부 파일 이름' })
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '첨부 파일 이름',
  })
  @IsOptional()
  @IsString({ message: '첨부 파일 이름은 문자열이어야 합니다.' })
  @MaxLength(255, { message: '첨부 파일 이름은 최대 255자까지 가능합니다.' })
  attachmentName?: string;

  /**
   * 첨부 파일 크기
   * 첨부 파일의 크기(바이트)입니다.
   */
  @Field(() => Number, {
    nullable: true,
    description: '첨부 파일 크기 (바이트)',
  })
  @Column({
    type: 'bigint',
    nullable: true,
    comment: '첨부 파일 크기 (바이트)',
  })
  attachmentSize?: number;

  /**
   * 반응 수
   * 메시지에 대한 반응(이모지) 수입니다.
   */
  @Field(() => Number, { description: '반응 수' })
  @Column({
    type: 'int',
    default: 0,
    comment: '메시지 반응 수',
  })
  reactionCount: number;

  /**
   * 답장 대상 메시지 ID
   * 다른 메시지에 답장하는 경우 원본 메시지의 ID입니다.
   */
  @Field(() => String, { nullable: true, description: '답장 대상 메시지 ID' })
  @Column({
    type: 'uuid',
    nullable: true,
    comment: '답장 대상 메시지 ID',
  })
  replyToMessageId?: string;

  /**
   * 메시지 작성자 ID
   * 메시지를 작성한 사용자의 ID입니다.
   */
  @Column({
    type: 'uuid',
    comment: '메시지 작성자 ID',
  })
  authorId: string;

  /**
   * 채팅방 ID
   * 메시지가 속한 채팅방의 ID입니다.
   */
  @Column({
    type: 'uuid',
    comment: '채팅방 ID',
  })
  roomId: string;

  // === 관계 설정 ===

  /**
   * 메시지 작성자
   * 다대일 관계: 여러 메시지가 한 사용자에 의해 작성됩니다.
   */
  @Field(() => User, { description: '메시지 작성자' })
  @ManyToOne(() => User, (user) => user.chatMessages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'authorId' })
  author: User;

  /**
   * 메시지가 속한 채팅방
   * 다대일 관계: 여러 메시지가 한 채팅방에 속합니다.
   */
  @Field(() => ChatRoom, { description: '메시지가 속한 채팅방' })
  @ManyToOne(() => ChatRoom, (chatRoom) => chatRoom.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'roomId' })
  room: ChatRoom;

  /**
   * 답장 대상 메시지
   * 다대일 관계: 여러 메시지가 한 메시지에 답장할 수 있습니다.
   * 자기 참조 관계입니다.
   */
  @Field(() => ChatMessage, { nullable: true, description: '답장 대상 메시지' })
  @ManyToOne(() => ChatMessage, { nullable: true })
  @JoinColumn({ name: 'replyToMessageId' })
  replyToMessage?: ChatMessage;

  // === 헬퍼 메서드 ===

  /**
   * 텍스트 메시지인지 확인하는 메서드
   * @returns 텍스트 메시지인 경우 true, 아닌 경우 false
   */
  isTextMessage(): boolean {
    return this.type === ChatMessageType.TEXT;
  }

  /**
   * 이미지 메시지인지 확인하는 메서드
   * @returns 이미지 메시지인 경우 true, 아닌 경우 false
   */
  isImageMessage(): boolean {
    return this.type === ChatMessageType.IMAGE;
  }

  /**
   * 비디오 메시지인지 확인하는 메서드
   * @returns 비디오 메시지인 경우 true, 아닌 경우 false
   */
  isVideoMessage(): boolean {
    return this.type === ChatMessageType.VIDEO;
  }

  /**
   * 파일 메시지인지 확인하는 메서드
   * @returns 파일 메시지인 경우 true, 아닌 경우 false
   */
  isFileMessage(): boolean {
    return this.type === ChatMessageType.FILE;
  }

  /**
   * 시스템 메시지인지 확인하는 메서드
   * @returns 시스템 메시지인 경우 true, 아닌 경우 false
   */
  isSystemMessage(): boolean {
    return this.type === ChatMessageType.SYSTEM;
  }

  /**
   * 첨부 파일이 있는지 확인하는 메서드
   * @returns 첨부 파일이 있는 경우 true, 아닌 경우 false
   */
  hasAttachment(): boolean {
    return !!this.attachmentUrl;
  }

  /**
   * 답장 메시지인지 확인하는 메서드
   * @returns 답장 메시지인 경우 true, 아닌 경우 false
   */
  isReplyMessage(): boolean {
    return !!this.replyToMessageId;
  }

  /**
   * 메시지 읽음 처리 메서드
   */
  markAsRead(): void {
    this.isRead = true;
    this.readAt = new Date();
  }

  /**
   * 메시지 수정 처리 메서드
   * @param newContent 새로운 내용
   */
  editContent(newContent: string): void {
    this.content = newContent;
    this.isEdited = true;
    this.editedAt = new Date();
  }

  /**
   * 메시지 고정 상태 토글 메서드
   */
  togglePin(): void {
    this.isPinned = !this.isPinned;
  }

  /**
   * 반응 수 증가 메서드
   * @param count 증가시킬 반응 수 (기본값: 1)
   */
  incrementReactionCount(count: number = 1): void {
    this.reactionCount += count;
  }

  /**
   * 반응 수 감소 메서드
   * @param count 감소시킬 반응 수 (기본값: 1)
   */
  decrementReactionCount(count: number = 1): void {
    this.reactionCount = Math.max(this.reactionCount - count, 0);
  }

  /**
   * 첨부 파일 크기를 사람이 읽기 쉬운 형태로 반환하는 메서드
   * @returns 포맷된 파일 크기 문자열
   */
  getFormattedAttachmentSize(): string | null {
    if (!this.attachmentSize) return null;

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = this.attachmentSize;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * 메시지 요약 정보 반환 메서드
   * @param maxLength 요약 최대 길이 (기본값: 50)
   * @returns 요약된 메시지 내용
   */
  getMessageSummary(maxLength: number = 50): string {
    if (this.isSystemMessage()) {
      return `[시스템] ${this.content}`;
    }

    if (this.hasAttachment()) {
      const fileType =
        this.type === ChatMessageType.IMAGE
          ? '이미지'
          : this.type === ChatMessageType.VIDEO
            ? '비디오'
            : '파일';
      return `[${fileType}] ${this.attachmentName || 'Untitled'}`;
    }

    if (this.content.length <= maxLength) {
      return this.content;
    }

    return this.content.substring(0, maxLength) + '...';
  }

  /**
   * 메시지 전송 후 경과 시간 계산 메서드
   * @returns 경과 시간 (분 단위)
   */
  getElapsedMinutes(): number {
    const now = new Date();
    const diffMs = now.getTime() - this.createdAt.getTime();
    return Math.floor(diffMs / (1000 * 60));
  }

  /**
   * 메시지 수정 가능 여부 확인 메서드
   * @param timeLimit 수정 가능 시간 제한 (분 단위, 기본값: 30분)
   * @returns 수정 가능한 경우 true, 아닌 경우 false
   */
  canBeEdited(timeLimit: number = 30): boolean {
    if (this.isSystemMessage()) return false;
    return this.getElapsedMinutes() <= timeLimit;
  }

  /**
   * 메시지 삭제 가능 여부 확인 메서드
   * @param timeLimit 삭제 가능 시간 제한 (분 단위, 기본값: 60분)
   * @returns 삭제 가능한 경우 true, 아닌 경우 false
   */
  canBeDeleted(timeLimit: number = 60): boolean {
    if (this.isSystemMessage()) return false;
    return this.getElapsedMinutes() <= timeLimit;
  }

  /**
   * 메시지 상태 정보 반환 메서드
   * @returns 메시지 상태 정보
   */
  getMessageStatus(): {
    isRead: boolean;
    isEdited: boolean;
    isPinned: boolean;
    hasAttachment: boolean;
    reactionCount: number;
  } {
    return {
      isRead: this.isRead,
      isEdited: this.isEdited,
      isPinned: this.isPinned,
      hasAttachment: this.hasAttachment(),
      reactionCount: this.reactionCount,
    };
  }
}
