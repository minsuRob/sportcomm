import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
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
import { Post } from '../posts/post.entity';

/**
 * @description 미디어 파일의 종류를 나타내는 열거형입니다.
 * - `IMAGE`: 이미지 파일
 * - `VIDEO`: 비디오 파일
 */
export enum MediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
}

registerEnumType(MediaType, {
  name: 'MediaType',
  description: '미디어 파일의 종류 (이미지, 비디오)',
});

/**
 * @description 파일 업로드 상태를 나타내는 열거형입니다.
 * - `UPLOADING`: 업로드 중
 * - `COMPLETED`: 업로드 완료
 * - `FAILED`: 업로드 실패
 */
export enum UploadStatus {
  UPLOADING = 'UPLOADING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

registerEnumType(UploadStatus, {
  name: 'UploadStatus',
  description: '파일 업로드 상태 (업로드 중, 완료, 실패)',
});

/**
 * @description 게시물에 첨부된 미디어 파일 정보를 나타내는 엔티티입니다.
 */
@ObjectType({ description: '미디어 파일 정보' })
@Entity('media')
export class Media {
  @Field(() => ID, { description: '미디어 파일의 고유 ID (UUID)' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field({ description: '미디어 파일에 접근할 수 있는 URL' })
  @Column()
  url: string;

  @Field(() => MediaType, { description: '미디어 타입' })
  @Column({
    type: 'enum',
    enum: MediaType,
  })
  type: MediaType;

  @Field(() => UploadStatus, { description: '업로드 상태' })
  @Column({
    type: 'enum',
    enum: UploadStatus,
  })
  status: UploadStatus;

  @Field({ description: '미디어가 첨부된 게시물의 ID' })
  @Column()
  postId: string;

  @Field(() => Date, { description: '미디어 레코드 생성일' })
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Field(() => Date, { description: '미디어 레코드 마지막 수정일' })
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt?: Date;

  // --- 관계 설정 ---

  @Field(() => Post, { description: '미디어가 첨부된 게시물' })
  @ManyToOne(() => Post, (post) => post.media, {
    onDelete: 'CASCADE', // 게시물이 삭제되면 미디어도 함께 삭제
    nullable: false,
  })
  @JoinColumn({ name: 'postId' })
  post: Post;
}
