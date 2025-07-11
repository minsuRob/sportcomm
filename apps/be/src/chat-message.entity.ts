import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { forwardRef } from '@nestjs/common';
import { User } from './users/user.entity';
import { ChatRoom } from './chat-room.entity';

/**
 * @description 채팅 메시지 정보를 나타내는 엔티티입니다.
 */
@ObjectType({ description: '채팅 메시지 정보' })
@Entity('chat_messages')
export class ChatMessage {
  @Field(() => ID, { description: '메시지의 고유 ID (UUID)' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field({ description: '메시지 내용' })
  @Column('text')
  content: string;

  @Field({ description: '작성자의 ID' })
  @Column()
  authorId: string;

  @Field({ description: '메시지가 속한 채팅방의 ID' })
  @Column()
  roomId: string;

  @Field(() => Date, { description: '메시지 생성일' })
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Field(() => Date, { description: '메시지 마지막 수정일' })
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt?: Date;

  // --- 관계 설정 ---

  @Field(() => User, { description: '메시지 작성자' })
  @ManyToOne(() => User, (user) => user.chatMessages, {
    onDelete: 'CASCADE', // 사용자가 삭제되면 메시지도 함께 삭제
    nullable: false,
  })
  @JoinColumn({ name: 'authorId' })
  author: User;

  @Field(() => ChatRoom, { description: '메시지가 속한 채팅방' })
  @ManyToOne(() => ChatRoom, (room) => room.messages, {
    onDelete: 'CASCADE', // 채팅방이 삭제되면 메시지도 함께 삭제
    nullable: false,
  })
  @JoinColumn({ name: 'roomId' })
  room: ChatRoom;
}
