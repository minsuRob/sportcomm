import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { forwardRef } from '@nestjs/common';
import { ChatMessage } from './chat-message.entity';

@ObjectType()
@Entity('chat_rooms')
export class ChatRoom {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ length: 100, unique: true })
  @Index()
  name: string;

  /**
   * A field to associate the chat room with a specific match or event.
   * This can be a foreign key to a 'matches' table in the future.
   */
  @Field({ nullable: true })
  @Column({ name: 'match_id', nullable: true })
  @Index()
  matchId: string;

  @Field(() => [ChatMessage], {
    nullable: 'itemsAndList',
    description: 'The messages sent in this chat room.',
  })
  @OneToMany(() => ChatMessage, (message) => message.room, {
    cascade: true,
  })
  messages: ChatMessage[];

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
