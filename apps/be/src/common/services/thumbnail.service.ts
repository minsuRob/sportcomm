import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { generateSafeFileName } from '../utils/file-utils';
import * as sharp from 'sharp';
import * as ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs';

/**
 * 썸네일 생성 서비스
 * 이미지와 동영상의 다양한 크기 썸네일을 생성하고 관리합니다.
 */

export interface ThumbnailSize {
  name: string;
  width: number;
  height: number;
  quality: number;
  description: string;
}

export interface ThumbnailResult {
  size: string;
  url: string;
  width: number;
  height: number;
  fileSize: number;
}

@Injectable()
export class ThumbnailService {
  private readonly logger = new Logger(ThumbnailService.name);

  // 썸네일 크기 정의 (모바일 우선, 점진적 향상)
  private readonly thumbnailSizes: ThumbnailSize[] = [
    {
      name: 'thumbnail_small',
      width: 150,
      height: 150,
      quality: 70,
      description: '작은 썸네일 (프로필, 목록용)',
    },
    {
      name: 'thumbnail_medium',
      width: 300,
      height: 300,
      quality: 75,
      description: '중간 썸네일 (모바일 피드용)',
    },
    {
      name: 'thumbnail_large',
      width: 600,
      height: 600,
      quality: 80,
      description: '큰 썸네일 (웹 피드용)',
    },
    {
      name: 'preview',
      width: 1200,
      height: 1200,
      quality: 85,
      description: '미리보기 (상세보기용)',
    },
  ];

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * 이미지 썸네일 생성
   * @param originalFilePath 원본 이미지 파일 경로
   * @param originalFileName 원본 파일명
   * @param bucket 저장할 버킷명
   * @returns 생성된 썸네일 정보 배열
   */
  async generateImageThumbnails(
    source: string | Buffer,
    originalFileName: string,
    bucket: string = 'thumbnails',
  ): Promise<ThumbnailResult[]> {
    const results: ThumbnailResult[] = [];

    try {
      this.logger.log(`이미지 썸네일 생성 시작: ${originalFileName}`);

      // 원본 이미지 정보 확인
      const originalImage = sharp(source);
      const metadata = await originalImage.metadata();

      this.logger.log(
        `원본 이미지 정보: ${metadata.width}x${metadata.height}, 포맷: ${metadata.format}`,
      );

      for (const size of this.thumbnailSizes) {
        try {
          // 원본보다 큰 썸네일은 생성하지 않음 (업스케일링 방지)
          if (metadata.width && metadata.height) {
            if (size.width > metadata.width && size.height > metadata.height) {
              this.logger.log(
                `썸네일 크기가 원본보다 큼, 건너뜀: ${size.name}`,
              );
              continue;
            }
          }

          const thumbnailBuffer = await this.createImageThumbnail(source, size);

          // 썸네일 파일명 생성
          const thumbnailFileName = this.generateThumbnailFileName(
            originalFileName,
            size.name,
          );

          // Supabase Storage에 업로드
          await this.supabaseService.uploadFile(
            bucket,
            thumbnailFileName,
            thumbnailBuffer,
            'image/jpeg',
          );

          // 공개 URL 생성
          const publicUrl = this.supabaseService.getPublicUrl(
            bucket,
            thumbnailFileName,
          );

          results.push({
            size: size.name,
            url: publicUrl,
            width: size.width,
            height: size.height,
            fileSize: thumbnailBuffer.length,
          });

          this.logger.log(
            `썸네일 생성 완료: ${size.name} (${thumbnailBuffer.length} bytes)`,
          );
        } catch (error) {
          this.logger.error(`썸네일 생성 실패: ${size.name}`, error);
          // 개별 썸네일 실패는 전체 프로세스를 중단하지 않음
        }
      }

      this.logger.log(`이미지 썸네일 생성 완료: ${results.length}개 생성`);
      return results;
    } catch (error) {
      this.logger.error(
        `이미지 썸네일 생성 중 오류: ${originalFileName}`,
        error,
      );
      throw error;
    }
  }

  /**
   * 동영상 썸네일 생성
   * @param originalFilePath 원본 동영상 파일 경로
   * @param originalFileName 원본 파일명
   * @param bucket 저장할 버킷명
   * @param timeStamp 썸네일 추출 시간 (초)
   * @returns 생성된 썸네일 정보 배열
   */
  async generateVideoThumbnails(
    originalFilePath: string,
    originalFileName: string,
    bucket: string = 'thumbnails',
    timeStamp: number = 1,
  ): Promise<ThumbnailResult[]> {
    const results: ThumbnailResult[] = [];
    const tempDir = path.join(process.cwd(), 'temp', 'thumbnails');

    try {
      this.logger.log(`동영상 썸네일 생성 시작: ${originalFileName}`);

      // 임시 디렉토리 생성
      await fs.promises.mkdir(tempDir, { recursive: true });

      // 동영상에서 스크린샷 추출
      const tempImagePath = path.join(tempDir, `temp_${Date.now()}.jpg`);

      await this.extractVideoFrame(originalFilePath, tempImagePath, timeStamp);

      // 추출된 이미지로 썸네일 생성
      for (const size of this.thumbnailSizes) {
        try {
          const thumbnailBuffer = await this.createImageThumbnail(
            tempImagePath,
            size,
          );

          // 썸네일 파일명 생성
          const thumbnailFileName = this.generateThumbnailFileName(
            originalFileName,
            size.name,
          );

          // Supabase Storage에 업로드
          await this.supabaseService.uploadFile(
            bucket,
            thumbnailFileName,
            thumbnailBuffer,
            'image/jpeg',
          );

          // 공개 URL 생성
          const publicUrl = this.supabaseService.getPublicUrl(
            bucket,
            thumbnailFileName,
          );

          results.push({
            size: size.name,
            url: publicUrl,
            width: size.width,
            height: size.height,
            fileSize: thumbnailBuffer.length,
          });

          this.logger.log(
            `동영상 썸네일 생성 완료: ${size.name} (${thumbnailBuffer.length} bytes)`,
          );
        } catch (error) {
          this.logger.error(`동영상 썸네일 생성 실패: ${size.name}`, error);
        }
      }

      // 임시 파일 정리
      try {
        await fs.promises.unlink(tempImagePath);
      } catch (cleanupError) {
        this.logger.warn(`임시 파일 정리 실패: ${tempImagePath}`, cleanupError);
      }

      this.logger.log(`동영상 썸네일 생성 완료: ${results.length}개 생성`);
      return results;
    } catch (error) {
      this.logger.error(
        `동영상 썸네일 생성 중 오류: ${originalFileName}`,
        error,
      );
      throw error;
    }
  }

  /**
   * 이미지 썸네일 생성 (Sharp 사용)
   * @param imagePath 이미지 파일 경로
   * @param size 썸네일 크기 설정
   * @returns 썸네일 버퍼
   */
  private async createImageThumbnail(
    source: string | Buffer,
    size: ThumbnailSize,
  ): Promise<Buffer> {
    return sharp(source)
      .resize(size.width, size.height, {
        fit: 'cover', // 비율 유지하면서 크롭
        position: 'center',
      })
      .jpeg({
        quality: size.quality,
        progressive: true, // 점진적 로딩
        mozjpeg: true, // 더 나은 압축
      })
      .toBuffer();
  }

  /**
   * 동영상에서 프레임 추출 (FFmpeg 사용)
   * @param videoPath 동영상 파일 경로
   * @param outputPath 출력 이미지 경로
   * @param timeStamp 추출할 시간 (초)
   */
  private async extractVideoFrame(
    videoPath: string,
    outputPath: string,
    timeStamp: number,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .seekInput(timeStamp)
        .frames(1)
        .output(outputPath)
        .outputOptions([
          '-vf',
          'scale=1920:1080:force_original_aspect_ratio=decrease', // 최대 해상도 제한
          '-q:v',
          '2', // 고품질
        ])
        .on('end', () => {
          this.logger.log(`동영상 프레임 추출 완료: ${outputPath}`);
          resolve();
        })
        .on('error', (error) => {
          this.logger.error(`동영상 프레임 추출 실패: ${videoPath}`, error);
          reject(error);
        })
        .run();
    });
  }

  /**
   * 썸네일 파일명 생성
   * @param originalFileName 원본 파일명
   * @param sizeType 썸네일 크기 타입
   * @returns 썸네일 파일명
   */
  private generateThumbnailFileName(
    originalFileName: string,
    sizeType: string,
  ): string {
    const baseName = path.parse(originalFileName).name;
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);

    return generateSafeFileName(
      `${baseName}_${sizeType}_${timestamp}_${randomId}.jpg`,
    );
  }

  /**
   * 썸네일 크기 정보 반환
   * @returns 사용 가능한 썸네일 크기 목록
   */
  getThumbnailSizes(): ThumbnailSize[] {
    return [...this.thumbnailSizes];
  }

  /**
   * 특정 크기의 썸네일 URL 생성
   * @param baseFileName 기본 파일명
   * @param sizeType 썸네일 크기 타입
   * @param bucket 버킷명
   * @returns 썸네일 URL
   */
  getThumbnailUrl(
    baseFileName: string,
    sizeType: string,
    bucket: string = 'thumbnails',
  ): string {
    const thumbnailFileName = this.generateThumbnailFileName(
      baseFileName,
      sizeType,
    );
    return this.supabaseService.getPublicUrl(bucket, thumbnailFileName);
  }

  /**
   * 썸네일 일괄 삭제
   * @param baseFileName 기본 파일명
   * @param bucket 버킷명
   */
  async deleteThumbnails(
    baseFileName: string,
    bucket: string = 'thumbnails',
  ): Promise<void> {
    try {
      const filesToDelete = this.thumbnailSizes.map((size) =>
        this.generateThumbnailFileName(baseFileName, size.name),
      );

      await this.supabaseService.deleteFiles(bucket, filesToDelete);
      this.logger.log(`썸네일 삭제 완료: ${baseFileName}`);
    } catch (error) {
      this.logger.error(`썸네일 삭제 실패: ${baseFileName}`, error);
      throw error;
    }
  }
}
