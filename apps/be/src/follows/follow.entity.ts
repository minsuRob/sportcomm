import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
  Column,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('follows')
@Unique(['followerId', 'followingId'])
export class Follow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'follower_id' })
  followerId: string;

  @ManyToOne(() => User, (user) => user.following, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'follower_id' })
  follower: User;

  @Column({ name: 'following_id' })
  followingId: string;

  @ManyToOne(() => User, (user) => user.followers, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'following_id' })
  following: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
