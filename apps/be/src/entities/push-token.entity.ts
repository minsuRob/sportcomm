import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('user_push_tokens')
export class PushToken extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @Index()
  @Column({ type: 'text' })
  token!: string;

  @Column({ type: 'text', nullable: true })
  device?: string;
}
