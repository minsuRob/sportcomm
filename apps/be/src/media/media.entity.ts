import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Post } from '../posts/post.entity';

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
}

@Entity('media')
export class Media {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  url: string;

  @Column({
    type: 'enum',
    enum: MediaType,
  })
  type: MediaType;

  @Column({ name: 'post_id' })
  postId: string;

  @ManyToOne(() => Post, (post) => post.media, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'post_id' })
  post: Post;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
