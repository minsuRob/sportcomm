import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Post } from './post.entity';

@Entity('post_versions')
@Unique(['postId', 'version'])
export class PostVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'post_id' })
  postId: string;

  @ManyToOne(() => Post, (post) => post.versions, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'post_id' })
  post: Post;

  @Column()
  version: number;

  @Column({ length: 1000 })
  content: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
