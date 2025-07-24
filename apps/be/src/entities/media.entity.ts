import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ObjectType, Field, registerEnumType } from '@nestjs/graphql';
import {
  IsString,
  IsEnum,
  MaxLength,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';
import { BaseEntity } from './base.entity';
import { Post } from './post.entity';

/**
 * 미디어 파일 유형 열거형
 * 업로드 가능한 미디어 파일의 종류를 정의합니다.
 */
export enum MediaType {
  /** 이미지 파일 (jpg, png, gif 등) */
  IMAGE = 'IMAGE',
  /** 비디오 파일 (mp4, avi, mov 등) */
  VIDEO = 'VIDEO',
}

/**
 * 업로드 상태 열거형
 * 미디어 파일의 업로드 진행 상태를 정의합니다.
 */
export enum UploadStatus {
  /** 업로드 중 */
  UPLOADING = 'UPLOADING',
  /** 업로드 완료 */
  COMPLETED = 'COMPLETED',
  /** 업로드 실패 */
  FAILED = 'FAILED',
}

// GraphQL 스키마에 MediaType enum 등록
registerEnumType(MediaType, {
  name: 'MediaType',
  description: '미디어 파일 유형',
  valuesMap: {
    IMAGE: {
      description: '이미지 파일 (jpg, png, gif 등)',
    },
    VIDEO: {
      description: '비디오 파일 (mp4, avi, mov 등)',
    },
  },
});

// GraphQL 스키마에 UploadStatus enum 등록
registerEnumType(UploadStatus, {
  name: 'UploadStatus',
  description: '업로드 상태',
  valuesMap: {
    UPLOADING: {
      description: '업로드 중',
    },
    COMPLETED: {
      description: '업로드 완료',
    },
    FAILED: {
      description: '업로드 실패',
    },
  },
});

/**
 * 미디어 엔티티
 *
 * 게시물에 첨부되는 미디어 파일(이미지, 비디오)을 관리합니다.
 * 파일 업로드 상태, 메타데이터, 접근 정보 등을 저장하고 관리합니다.
 */
@ObjectType()
@Entity('media')
@Index(['postId'])
@Index(['type'])
@Index(['status'])
@Index(['createdAt'])
export class Media extends BaseEntity {
  /**
   * 파일 원본 이름
   * 사용자가 업로드한 파일의 원래 이름입니다.
   */
  @Field(() => String, { description: '파일 원본 이름' })
  @Column({
    type: 'varchar',
    length: 255,
    comment: '파일 원본 이름',
  })
  @IsString({ message: '파일 이름은 문자열이어야 합니다.' })
  @MaxLength(255, { message: '파일 이름은 최대 255자까지 가능합니다.' })
  originalName: string;

  /**
   * 파일 저장 경로/URL
   * 서버에 저장된 파일의 경로 또는 CDN URL입니다.
   */
  @Field(() => String, { description: '파일 저장 경로/URL' })
  @Column({
    type: 'varchar',
    length: 1000,
    comment: '파일 저장 경로/URL',
  })
  @IsString({ message: '파일 URL은 문자열이어야 합니다.' })
  @MaxLength(1000, { message: '파일 URL은 최대 1000자까지 가능합니다.' })
  url: string;

  /**
   * 미디어 파일 유형
   * 이미지 또는 비디오 중 하나입니다.
   */
  @Field(() => MediaType, { description: '미디어 파일 유형' })
  @Column({
    type: 'enum',
    enum: MediaType,
    comment: '미디어 파일 유형',
  })
  @IsEnum(MediaType, { message: '올바른 미디어 타입을 선택해주세요.' })
  type: MediaType;

  /**
   * 업로드 상태
   * 파일의 업로드 진행 상태를 나타냅니다.
   */
  @Field(() => UploadStatus, { description: '업로드 상태' })
  @Column({
    type: 'enum',
    enum: UploadStatus,
    default: UploadStatus.UPLOADING,
    comment: '업로드 상태',
  })
  @IsEnum(UploadStatus, { message: '올바른 업로드 상태를 선택해주세요.' })
  status: UploadStatus;

  /**
   * 파일 크기 (바이트)
   * 업로드된 파일의 크기입니다.
   */
  @Field(() => Number, { description: '파일 크기 (바이트)' })
  @Column({
    type: 'bigint',
    comment: '파일 크기 (바이트)',
  })
  @IsNumber({}, { message: '파일 크기는 숫자여야 합니다.' })
  @Min(0, { message: '파일 크기는 0 이상이어야 합니다.' })
  fileSize: number;

  /**
   * MIME 타입
   * 파일의 MIME 타입입니다. (예: image/jpeg, video/mp4)
   */
  @Field(() => String, { description: 'MIME 타입' })
  @Column({
    type: 'varchar',
    length: 100,
    comment: 'MIME 타입',
  })
  @IsString({ message: 'MIME 타입은 문자열이어야 합니다.' })
  @MaxLength(100, { message: 'MIME 타입은 최대 100자까지 가능합니다.' })
  mimeType: string;

  /**
   * 파일 확장자
   * 파일의 확장자입니다. (예: jpg, png, mp4)
   */
  @Field(() => String, { description: '파일 확장자' })
  @Column({
    type: 'varchar',
    length: 10,
    comment: '파일 확장자',
  })
  @IsString({ message: '파일 확장자는 문자열이어야 합니다.' })
  @MaxLength(10, { message: '파일 확장자는 최대 10자까지 가능합니다.' })
  extension: string;

  /**
   * 이미지 너비 (픽셀)
   * 이미지 또는 비디오의 너비입니다.
   */
  @Field(() => Number, {
    nullable: true,
    description: '이미지/비디오 너비 (픽셀)',
  })
  @Column({
    type: 'int',
    nullable: true,
    comment: '이미지/비디오 너비 (픽셀)',
  })
  @IsOptional()
  @IsNumber({}, { message: '너비는 숫자여야 합니다.' })
  @Min(0, { message: '너비는 0 이상이어야 합니다.' })
  width?: number;

  /**
   * 이미지 높이 (픽셀)
   * 이미지 또는 비디오의 높이입니다.
   */
  @Field(() => Number, {
    nullable: true,
    description: '이미지/비디오 높이 (픽셀)',
  })
  @Column({
    type: 'int',
    nullable: true,
    comment: '이미지/비디오 높이 (픽셀)',
  })
  @IsOptional()
  @IsNumber({}, { message: '높이는 숫자여야 합니다.' })
  @Min(0, { message: '높이는 0 이상이어야 합니다.' })
  height?: number;

  /**
   * 비디오 재생 시간 (초)
   * 비디오 파일인 경우 재생 시간입니다.
   */
  @Field(() => Number, { nullable: true, description: '비디오 재생 시간 (초)' })
  @Column({
    type: 'int',
    nullable: true,
    comment: '비디오 재생 시간 (초)',
  })
  @IsOptional()
  @IsNumber({}, { message: '재생 시간은 숫자여야 합니다.' })
  @Min(0, { message: '재생 시간은 0 이상이어야 합니다.' })
  duration?: number;

  /**
   * 썸네일 이미지 URL
   * 비디오 파일인 경우 썸네일 이미지의 URL입니다.
   */
  @Field(() => String, { nullable: true, description: '썸네일 이미지 URL' })
  @Column({
    type: 'varchar',
    length: 1000,
    nullable: true,
    comment: '썸네일 이미지 URL',
  })
  @IsOptional()
  @IsString({ message: '썸네일 URL은 문자열이어야 합니다.' })
  @MaxLength(1000, { message: '썸네일 URL은 최대 1000자까지 가능합니다.' })
  thumbnailUrl?: string;

  /**
   * 업로드 실패 사유
   * 업로드가 실패한 경우 그 사유를 저장합니다.
   */
  @Field(() => String, { nullable: true, description: '업로드 실패 사유' })
  @Column({
    type: 'text',
    nullable: true,
    comment: '업로드 실패 사유',
  })
  @IsOptional()
  @IsString({ message: '실패 사유는 문자열이어야 합니다.' })
  failureReason?: string;

  /**
   * 게시물 ID
   * 미디어 파일이 첨부된 게시물의 ID입니다.
   */
  @Column({
    type: 'uuid',
    nullable: true,
    comment: '게시물 ID',
  })
  postId: string | null;

  // === 관계 설정 ===

  /**
   * 미디어 파일이 첨부된 게시물
   * 다대일 관계: 여러 미디어 파일이 한 게시물에 첨부됩니다.
   */
  @Field(() => Post, { description: '미디어 파일이 첨부된 게시물' })
  @ManyToOne(() => Post, (post) => post.media, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'postId' })
  post: Post;

  // === 헬퍼 메서드 ===

  /**
   * 이미지 파일인지 확인하는 메서드
   * @returns 이미지 파일인 경우 true, 아닌 경우 false
   */
  isImage(): boolean {
    return this.type === MediaType.IMAGE;
  }

  /**
   * 비디오 파일인지 확인하는 메서드
   * @returns 비디오 파일인 경우 true, 아닌 경우 false
   */
  isVideo(): boolean {
    return this.type === MediaType.VIDEO;
  }

  /**
   * 업로드가 완료되었는지 확인하는 메서드
   * @returns 업로드 완료된 경우 true, 아닌 경우 false
   */
  isUploaded(): boolean {
    return this.status === UploadStatus.COMPLETED;
  }

  /**
   * 업로드 중인지 확인하는 메서드
   * @returns 업로드 중인 경우 true, 아닌 경우 false
   */
  isUploading(): boolean {
    return this.status === UploadStatus.UPLOADING;
  }

  /**
   * 업로드에 실패했는지 확인하는 메서드
   * @returns 업로드 실패한 경우 true, 아닌 경우 false
   */
  isFailed(): boolean {
    return this.status === UploadStatus.FAILED;
  }

  /**
   * 업로드 완료 처리 메서드
   * 업로드가 성공적으로 완료된 경우 호출됩니다.
   */
  markAsCompleted(): void {
    this.status = UploadStatus.COMPLETED;
    this.failureReason = undefined;
  }

  /**
   * 업로드 실패 처리 메서드
   * @param reason 실패 사유
   */
  markAsFailed(reason: string): void {
    this.status = UploadStatus.FAILED;
    this.failureReason = reason;
  }

  /**
   * 파일 크기를 사람이 읽기 쉬운 형태로 반환하는 메서드
   * @returns 포맷된 파일 크기 문자열
   */
  getFormattedFileSize(): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = this.fileSize;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * 미디어 파일의 화면 비율을 계산하는 메서드
   * @returns 화면 비율 (너비/높이)
   */
  getAspectRatio(): number | null {
    if (!this.width || !this.height) {
      return null;
    }
    return this.width / this.height;
  }

  /**
   * 미디어 파일이 표시 가능한지 확인하는 메서드
   * @returns 표시 가능한 경우 true, 아닌 경우 false
   */
  isDisplayable(): boolean {
    return this.isUploaded() && this.isEntityActive;
  }

  /**
   * 썸네일 URL이 있는지 확인하는 메서드
   * @returns 썸네일이 있는 경우 true, 아닌 경우 false
   */
  hasThumbnail(): boolean {
    return !!this.thumbnailUrl;
  }

  /**
   * 미디어 파일의 메타데이터 요약을 반환하는 메서드
   * @returns 메타데이터 요약 정보
   */
  getMetadataSummary(): string {
    const parts = [this.type, this.getFormattedFileSize()];

    if (this.width && this.height) {
      parts.push(`${this.width}x${this.height}`);
    }

    if (this.duration) {
      parts.push(`${this.duration}초`);
    }

    return parts.join(' | ');
  }
}
