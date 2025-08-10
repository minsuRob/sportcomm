import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ObjectType, Field, registerEnumType, ID } from '@nestjs/graphql';
import { IsString, IsNumber, IsEnum, IsUrl, Min } from 'class-validator';
import { BaseEntity } from './base.entity';
import { Media } from './media.entity';

/**
 * 썸네일 크기 타입 열거형
 */
export enum ThumbnailSize {
  /** 작은 썸네일 (150x150) - 프로필, 목록용 */
  SMALL = 'thumbnail_small',
  /** 중간 썸네일 (300x300) - 모바일 피드용 */
  MEDIUM = 'thumbnail_medium',
  /** 큰 썸네일 (600x600) - 웹 피드용 */
  LARGE = 'thumbnail_large',
  /** 미리보기 (1200x1200) - 상세보기용 */
  PREVIEW = 'preview',
}

// GraphQL 스키마에 ThumbnailSize enum 등록
registerEnumType(ThumbnailSize, {
  name: 'ThumbnailSize',
  description: '썸네일 크기 타입',
  valuesMap: {
    SMALL: {
      description: '작은 썸네일 (150x150) - 프로필, 목록용',
    },
    MEDIUM: {
      description: '중간 썸네일 (300x300) - 모바일 피드용',
    },
    LARGE: {
      description: '큰 썸네일 (600x600) - 웹 피드용',
    },
    PREVIEW: {
      description: '미리보기 (1200x1200) - 상세보기용',
    },
  },
});

/**
 * 썸네일 엔티티
 *
 * 이미지와 동영상의 다양한 크기 썸네일을 관리합니다.
 * 각 미디어 파일당 여러 개의 썸네일이 생성될 수 있습니다.
 */
@ObjectType()
@Entity('thumbnails')
@Index(['mediaId', 'size'], { unique: true }) // 미디어당 크기별로 하나씩만
@Index(['mediaId']) // 미디어별 조회 최적화
@Index(['size']) // 크기별 조회 최적화
export class Thumbnail extends BaseEntity {
  /**
   * 원본 미디어 ID (외래키)
   */
  @Field(() => ID, { description: '원본 미디어 ID' })
  @Column('uuid', { comment: '원본 미디어 ID' })
  @IsString({ message: '미디어 ID는 문자열이어야 합니다.' })
  mediaId: string;

  /**
   * 썸네일 크기 타입
   */
  @Field(() => ThumbnailSize, { description: '썸네일 크기 타입' })
  @Column({
    type: 'enum',
    enum: ThumbnailSize,
    comment: '썸네일 크기 타입',
  })
  @IsEnum(ThumbnailSize, { message: '올바른 썸네일 크기 타입을 선택해주세요.' })
  size: ThumbnailSize;

  /**
   * 썸네일 이미지 URL
   */
  @Field(() => String, { description: '썸네일 이미지 URL' })
  @Column({
    type: 'varchar',
    length: 500,
    comment: '썸네일 이미지 URL',
  })
  @IsUrl({}, { message: '올바른 URL 형식이어야 합니다.' })
  url: string;

  /**
   * 썸네일 너비 (픽셀)
   */
  @Field(() => Number, { description: '썸네일 너비 (픽셀)' })
  @Column({
    type: 'int',
    comment: '썸네일 너비 (픽셀)',
  })
  @IsNumber({}, { message: '너비는 숫자여야 합니다.' })
  @Min(1, { message: '너비는 1 이상이어야 합니다.' })
  width: number;

  /**
   * 썸네일 높이 (픽셀)
   */
  @Field(() => Number, { description: '썸네일 높이 (픽셀)' })
  @Column({
    type: 'int',
    comment: '썸네일 높이 (픽셀)',
  })
  @IsNumber({}, { message: '높이는 숫자여야 합니다.' })
  @Min(1, { message: '높이는 1 이상이어야 합니다.' })
  height: number;

  /**
   * 썸네일 파일 크기 (바이트)
   */
  @Field(() => Number, { description: '썸네일 파일 크기 (바이트)' })
  @Column({
    type: 'int',
    comment: '썸네일 파일 크기 (바이트)',
  })
  @IsNumber({}, { message: '파일 크기는 숫자여야 합니다.' })
  @Min(0, { message: '파일 크기는 0 이상이어야 합니다.' })
  fileSize: number;

  /**
   * 썸네일 품질 (1-100)
   */
  @Field(() => Number, { description: '썸네일 품질 (1-100)' })
  @Column({
    type: 'int',
    default: 80,
    comment: '썸네일 품질 (1-100)',
  })
  @IsNumber({}, { message: '품질은 숫자여야 합니다.' })
  @Min(1, { message: '품질은 1 이상이어야 합니다.' })
  quality: number;

  // === 관계 설정 ===

  /**
   * 원본 미디어와의 관계
   * 다대일 관계: 하나의 미디어는 여러 썸네일을 가질 수 있습니다.
   */
  @Field(() => Media, { description: '원본 미디어' })
  @ManyToOne(() => Media, (media) => media.thumbnails, {
    onDelete: 'CASCADE', // 원본 미디어 삭제 시 썸네일도 함께 삭제
  })
  @JoinColumn({ name: 'mediaId' })
  media: Media;

  // === 헬퍼 메서드 ===

  /**
   * 썸네일이 모바일용인지 확인
   * @returns 모바일용 썸네일 여부
   */
  isMobileOptimized(): boolean {
    return (
      this.size === ThumbnailSize.SMALL || this.size === ThumbnailSize.MEDIUM
    );
  }

  /**
   * 썸네일이 웹용인지 확인
   * @returns 웹용 썸네일 여부
   */
  isWebOptimized(): boolean {
    return (
      this.size === ThumbnailSize.LARGE || this.size === ThumbnailSize.PREVIEW
    );
  }

  /**
   * 썸네일 크기 설명 반환
   * @returns 크기 설명
   */
  getSizeDescription(): string {
    const descriptions = {
      [ThumbnailSize.SMALL]: '작은 썸네일 (프로필, 목록용)',
      [ThumbnailSize.MEDIUM]: '중간 썸네일 (모바일 피드용)',
      [ThumbnailSize.LARGE]: '큰 썸네일 (웹 피드용)',
      [ThumbnailSize.PREVIEW]: '미리보기 (상세보기용)',
    };
    return descriptions[this.size] || '알 수 없는 크기';
  }

  /**
   * 파일 크기를 사람이 읽기 쉬운 형태로 반환
   * @returns 포맷된 파일 크기
   */
  getFormattedFileSize(): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = this.fileSize;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * 썸네일 비율 계산
   * @returns 가로세로 비율
   */
  getAspectRatio(): number {
    return this.height > 0 ? this.width / this.height : 1;
  }
}
