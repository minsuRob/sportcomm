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

@ObjectType()
@Entity('chat_messages')
export class ChatMessage {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ type: 'text' })
  content: string;

  @Field()
  @Column({ name: 'author_id' })
  authorId: string;

  @Field(() => User)
  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Field()
  @Column({ name: 'room_id' })
  roomId: string;

  @Field(() => forwardRef(() => ChatRoom))
  @ManyToOne(() => ChatRoom, (room) => room.messages, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'room_id' })
  room: ChatRoom;

  @Field()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Field()
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Field({ nullable: true })
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date;
}
