import { ObjectType, Field, registerEnumType } from '@nestjs/graphql';
import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { BaseEntity } from '../entities/base.entity';
import { Media } from '../entities/media.entity';

/**
 * 이미지 최적화 타입
 * - 썸네일, 모바일, 데스크탑 용으로 구분
 */
export enum MediaOptimizationType {
  THUMBNAIL = 'thumbnail',
  MOBILE = 'mobile',
  DESKTOP = 'desktop',
}

registerEnumType(MediaOptimizationType, {
  name: 'MediaOptimizationType',
  description: '이미지 최적화 타입',
});

/**
 * MediaOptimizer 엔티티
 * 원본 이미지(`Media`)를 용도별(WebP)로 최적화한 결과를 저장합니다.
 */
@ObjectType()
@Entity('media_optimizers')
@Index(['mediaId'])
@Index(['mediaType'])
export class MediaOptimizer extends BaseEntity {
  /**
   * 원본 미디어 ID (FK)
   */
  @Column({ type: 'uuid', nullable: false, comment: '원본 미디어 ID' })
  mediaId: string;

  /**
   * 원본 미디어
   */
  @ManyToOne(() => Media, (media) => media.optimizer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mediaId' })
  media: Media;

  /**
   * 최적화 타입 (thumbnail | mobile | desktop)
   */
  @Field(() => MediaOptimizationType, { description: '최적화 타입' })
  @Column({ type: 'enum', enum: MediaOptimizationType })
  @IsEnum(MediaOptimizationType)
  mediaType: MediaOptimizationType;

  /**
   * 최적화된 파일의 공개 URL
   */
  @Field(() => String, { description: '최적화 파일 URL' })
  @Column({ type: 'varchar', length: 1000 })
  @IsString()
  @MaxLength(1000)
  url: string;

  /**
   * 실제 저장된 가로 픽셀
   */
  @Field(() => Number, { nullable: true })
  @Column({ type: 'int', nullable: true })
  @IsOptional()
  @IsNumber()
  width?: number | null;

  /**
   * 실제 저장된 세로 픽셀
   */
  @Field(() => Number, { nullable: true })
  @Column({ type: 'int', nullable: true })
  @IsOptional()
  @IsNumber()
  height?: number | null;
}
