import { ObjectType, Field, ID, Int, registerEnumType } from '@nestjs/graphql';
import { forwardRef } from '@nestjs/common';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Post } from '../posts/post.entity';

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
}

registerEnumType(MediaType, {
  name: 'MediaType',
});

export enum UploadStatus {
  UPLOADING = 'UPLOADING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

registerEnumType(UploadStatus, {
  name: 'UploadStatus',
});

@ObjectType()
@Entity('media')
export class Media {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  url: string;

  @Field(() => MediaType)
  @Column({
    type: 'enum',
    enum: MediaType,
  })
  type: MediaType;

  @Field({ nullable: true })
  @Column({ nullable: true })
  mimetype: string;

  @Field(() => Int, { nullable: true })
  @Column({ type: 'integer', nullable: true })
  filesize: number;

  @Field(() => Int, { nullable: true })
  @Column({ type: 'integer', nullable: true })
  width: number;

  @Field(() => Int, { nullable: true })
  @Column({ type: 'integer', nullable: true })
  height: number;

  @Field(() => UploadStatus)
  @Column({
    type: 'enum',
    enum: UploadStatus,
    default: UploadStatus.UPLOADING,
  })
  status: UploadStatus;

  @Field()
  @Column({ name: 'post_id' })
  postId: string;

  @Field(() => forwardRef(() => Post))
  @ManyToOne(() => Post, (post) => post.media, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'post_id' })
  post: Post;

  @Field()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Field({ nullable: true })
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date;
}
