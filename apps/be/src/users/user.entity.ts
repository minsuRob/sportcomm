import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Post } from '../posts/post.entity';
import { Comment } from '../comments/comment.entity';
import { Follow } from '../follows/follow.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 30 })
  nickname: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => Post, (post) => post.author)
  posts: Post[];

  @OneToMany(() => Comment, (comment) => comment.author)
  comments: Comment[];

  @OneToMany(() => Follow, (follow) => follow.following)
  followers: Follow[];

  @OneToMany(() => Follow, (follow) => follow.follower)
  following: Follow[];
}
