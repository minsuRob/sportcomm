import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Comment } from '../comments/comment.entity';
import { PostVersion } from './post-version.entity';
import { Media } from '../media/media.entity';

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 1000 })
  content: string;

  @Column({ name: 'author_id' })
  authorId: string;

  @ManyToOne(() => User, (user) => user.posts, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => Comment, (comment) => comment.post)
  comments: Comment[];

  @OneToMany(() => PostVersion, (version) => version.post)
  versions: PostVersion[];

  @OneToMany(() => Media, (media) => media.post)
  media: Media[];
}
