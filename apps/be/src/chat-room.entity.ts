import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { forwardRef } from '@nestjs/common';
import { ChatMessage } from './chat-message.entity';

/**
 * @description 채팅방 정보를 나타내는 엔티티입니다.
 */
@ObjectType({ description: '채팅방 정보' })
@Entity('chat_rooms')
export class ChatRoom {
  @Field(() => ID, { description: '채팅방의 고유 ID (UUID)' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field({ nullable: true, description: '채팅방 이름' })
  @Column({ nullable: true })
  name?: string;

  @Field(() => Date, { description: '채팅방 생성일' })
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Field(() => Date, { description: '채팅방 마지막 수정일' })
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt?: Date;

  // --- 관계 설정 ---

  @Field(() => [forwardRef(() => ChatMessage)], { nullable: true, description: '채팅방의 메시지 목록' })
  @OneToMany(() => ChatMessage, (message) => message.room)
  messages: ChatMessage[];
}
