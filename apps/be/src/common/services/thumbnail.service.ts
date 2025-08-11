import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { generateSafeFileName } from '../utils/file-utils';
import * as sharp from 'sharp';
import * as ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs';

/**
 * WebP 기반 썸네일 생성 서비스
 * 이미지와 동영상의 WebP 썸네일을 생성하고 관리합니다.
 * GIF 애니메이션도 WebP로 변환하여 용량을 절감합니다.
 */

export interface ThumbnailSizeConfig {
  name: string;
  maxSize: number; // 긴 변 기준 최대 크기 (SMALL은 정사각형)
  quality: number;
  description: string;
  isSquare: boolean; // 정사각형 크롭 여부
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

  // WebP 기반 3단계 썸네일 크기 정의 (서버 비용 절감 최적화)
  private readonly thumbnailSizes: ThumbnailSizeConfig[] = [
    {
      name: 'thumbnail_small',
      maxSize: 150,
      quality: 75, // WebP는 JPEG보다 높은 품질에서도 용량이 작음
      description: '작은 썸네일 (150x150) - 프로필, 목록용',
      isSquare: true, // 프로필용은 정사각형 유지
    },
    {
      name: 'thumbnail_large',
      maxSize: 600,
      quality: 80,
      description: '모바일 최적화 (600px 긴변) - 모바일 피드용',
      isSquare: false, // 비율 유지
    },
    {
      name: 'preview',
      maxSize: 1200,
      quality: 85,
      description: '웹 최적화 (1200px 긴변) - 웹 상세보기용',
      isSquare: false, // 비율 유지
    },
  ];

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * WebP 이미지 썸네일 생성 (GIF 애니메이션 지원)
   * @param source 원본 이미지 파일 경로 또는 버퍼
   * @param originalFileName 원본 파일명
   * @param bucket 저장할 버킷명
   * @returns 생성된 WebP 썸네일 정보 배열
   */
  async generateImageThumbnails(
    source: string | Buffer,
    originalFileName: string,
    bucket: string = 'thumbnails',
  ): Promise<ThumbnailResult[]> {
    const results: ThumbnailResult[] = [];

    try {
      this.logger.log(`WebP 썸네일 생성 시작: ${originalFileName}`);

      // 원본 이미지 정보 확인
      const originalImage = sharp(source);
      const metadata = await originalImage.metadata();

      this.logger.log(
        `원본 이미지 정보: ${metadata.width}x${metadata.height}, 포맷: ${metadata.format}`,
      );

      // GIF 애니메이션 감지
      const isAnimatedGif =
        metadata.format === 'gif' && (metadata.pages || 1) > 1;

      for (const sizeConfig of this.thumbnailSizes) {
        try {
          // 업스케일링 방지 (SMALL 제외 - 프로필용은 항상 생성)
          if (!sizeConfig.isSquare && metadata.width && metadata.height) {
            const maxOriginalSize = Math.max(metadata.width, metadata.height);
            if (sizeConfig.maxSize > maxOriginalSize) {
              this.logger.log(
                `썸네일 크기가 원본보다 큼, 건너뜀: ${sizeConfig.name} (${sizeConfig.maxSize} > ${maxOriginalSize})`,
              );
              continue;
            }
          }

          const {
            buffer: thumbnailBuffer,
            width,
            height,
          } = await this.createWebPThumbnail(source, sizeConfig, isAnimatedGif);

          // WebP 썸네일 파일명 생성
          const thumbnailFileName = this.generateThumbnailFileName(
            originalFileName,
            sizeConfig.name,
            'webp',
          );

          // Supabase Storage에 WebP로 업로드
          await this.supabaseService.uploadFile(
            bucket,
            thumbnailFileName,
            thumbnailBuffer,
            'image/webp',
          );

          // 공개 URL 생성
          const publicUrl = this.supabaseService.getPublicUrl(
            bucket,
            thumbnailFileName,
          );

          results.push({
            size: sizeConfig.name,
            url: publicUrl,
            width,
            height,
            fileSize: thumbnailBuffer.length,
          });

          this.logger.log(
            `WebP 썸네일 생성 완료: ${sizeConfig.name} (${width}x${height}, ${thumbnailBuffer.length} bytes)`,
          );
        } catch (error) {
          this.logger.error(`WebP 썸네일 생성 실패: ${sizeConfig.name}`, error);
          // 개별 썸네일 실패는 전체 프로세스를 중단하지 않음
        }
      }

      this.logger.log(`WebP 썸네일 생성 완료: ${results.length}개 생성`);
      return results;
    } catch (error) {
      this.logger.error(`WebP 썸네일 생성 중 오류: ${originalFileName}`, error);
      throw error;
    }
  }

  /**
   * 동영상 WebP 썸네일 생성
   * @param originalFilePath 원본 동영상 파일 경로
   * @param originalFileName 원본 파일명
   * @param bucket 저장할 버킷명
   * @param timeStamp 썸네일 추출 시간 (초)
   * @returns 생성된 WebP 썸네일 정보 배열
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
      this.logger.log(`동영상 WebP 썸네일 생성 시작: ${originalFileName}`);

      // 임시 디렉토리 생성
      await fs.promises.mkdir(tempDir, { recursive: true });

      // 동영상에서 고품질 스크린샷 추출
      const tempImagePath = path.join(tempDir, `temp_${Date.now()}.png`);

      await this.extractVideoFrame(originalFilePath, tempImagePath, timeStamp);

      // 추출된 이미지로 WebP 썸네일 생성
      for (const sizeConfig of this.thumbnailSizes) {
        try {
          const {
            buffer: thumbnailBuffer,
            width,
            height,
          } = await this.createWebPThumbnail(
            tempImagePath,
            sizeConfig,
            false, // 동영상 썸네일은 애니메이션 없음
          );

          // WebP 썸네일 파일명 생성
          const thumbnailFileName = this.generateThumbnailFileName(
            originalFileName,
            sizeConfig.name,
            'webp',
          );

          // Supabase Storage에 WebP로 업로드
          await this.supabaseService.uploadFile(
            bucket,
            thumbnailFileName,
            thumbnailBuffer,
            'image/webp',
          );

          // 공개 URL 생성
          const publicUrl = this.supabaseService.getPublicUrl(
            bucket,
            thumbnailFileName,
          );

          results.push({
            size: sizeConfig.name,
            url: publicUrl,
            width,
            height,
            fileSize: thumbnailBuffer.length,
          });

          this.logger.log(
            `동영상 WebP 썸네일 생성 완료: ${sizeConfig.name} (${width}x${height}, ${thumbnailBuffer.length} bytes)`,
          );
        } catch (error) {
          this.logger.error(
            `동영상 WebP 썸네일 생성 실패: ${sizeConfig.name}`,
            error,
          );
        }
      }

      // 임시 파일 정리
      try {
        await fs.promises.unlink(tempImagePath);
      } catch (cleanupError) {
        this.logger.warn(`임시 파일 정리 실패: ${tempImagePath}`, cleanupError);
      }

      this.logger.log(`동영상 WebP 썸네일 생성 완료: ${results.length}개 생성`);
      return results;
    } catch (error) {
      this.logger.error(
        `동영상 WebP 썸네일 생성 중 오류: ${originalFileName}`,
        error,
      );
      throw error;
    }
  }

  /**
   * WebP 썸네일 생성 (Sharp 사용, GIF 애니메이션 지원)
   * @param source 이미지 파일 경로 또는 버퍼
   * @param sizeConfig 썸네일 크기 설정
   * @param isAnimated 애니메이션 여부 (GIF)
   * @returns 썸네일 버퍼와 실제 크기
   */
  private async createWebPThumbnail(
    source: string | Buffer,
    sizeConfig: ThumbnailSizeConfig,
    isAnimated: boolean = false,
  ): Promise<{ buffer: Buffer; width: number; height: number }> {
    let sharpInstance = sharp(source, {
      animated: isAnimated, // GIF 애니메이션 지원
    });

    // 원본 메타데이터 확인
    const metadata = await sharpInstance.metadata();
    let resizeOptions: any;
    let finalWidth: number;
    let finalHeight: number;

    if (sizeConfig.isSquare) {
      // 정사각형 크롭 (SMALL 썸네일용)
      resizeOptions = {
        width: sizeConfig.maxSize,
        height: sizeConfig.maxSize,
        fit: 'cover',
        position: 'center',
      };
      finalWidth = sizeConfig.maxSize;
      finalHeight = sizeConfig.maxSize;
    } else {
      // 비율 유지 리사이징 (긴 변 기준)
      const originalWidth = metadata.width || 1;
      const originalHeight = metadata.height || 1;
      const aspectRatio = originalWidth / originalHeight;

      if (originalWidth >= originalHeight) {
        // 가로가 더 긴 경우
        finalWidth = sizeConfig.maxSize;
        finalHeight = Math.round(sizeConfig.maxSize / aspectRatio);
      } else {
        // 세로가 더 긴 경우
        finalWidth = Math.round(sizeConfig.maxSize * aspectRatio);
        finalHeight = sizeConfig.maxSize;
      }

      resizeOptions = {
        width: finalWidth,
        height: finalHeight,
        fit: 'inside', // 비율 유지하면서 내부에 맞춤
        withoutEnlargement: true, // 업스케일링 방지
      };
    }

    // 리사이징 적용
    sharpInstance = sharpInstance.resize(resizeOptions);

    // WebP 변환 및 최적화
    const webpOptions: any = {
      quality: sizeConfig.quality,
      effort: 6, // 최대 압축 효율 (0-6, 6이 최고)
      lossless: false, // 손실 압축으로 용량 절감
      nearLossless: false,
      smartSubsample: true, // 스마트 서브샘플링
      preset: 'photo', // 사진 최적화
    };

    // GIF 애니메이션 지원 (Sharp 버전에 따라 다를 수 있음)
    if (isAnimated) {
      webpOptions.loop = 0; // 무한 반복
      // animated 속성은 Sharp 버전에 따라 지원되지 않을 수 있음
      try {
        webpOptions.animated = true;
      } catch (e) {
        this.logger.warn('애니메이션 WebP 옵션이 지원되지 않습니다.');
      }
    }

    const buffer = await sharpInstance.webp(webpOptions).toBuffer();

    return {
      buffer,
      width: finalWidth,
      height: finalHeight,
    };
  }

  /**
   * 동영상에서 고품질 프레임 추출 (FFmpeg 사용)
   * @param videoPath 동영상 파일 경로
   * @param outputPath 출력 이미지 경로 (PNG로 고품질 추출)
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
          '-pix_fmt',
          'rgb24', // RGB 색공간으로 고품질 추출
          '-f',
          'png', // PNG 형식으로 무손실 추출
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
   * WebP 썸네일 파일명 생성
   * @param originalFileName 원본 파일명
   * @param sizeType 썸네일 크기 타입
   * @param extension 파일 확장자 (기본: webp)
   * @returns WebP 썸네일 파일명
   */
  private generateThumbnailFileName(
    originalFileName: string,
    sizeType: string,
    extension: string = 'webp',
  ): string {
    const baseName = path.parse(originalFileName).name;
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);

    return generateSafeFileName(
      `${baseName}_${sizeType}_${timestamp}_${randomId}.${extension}`,
    );
  }

  /**
   * WebP 썸네일 크기 정보 반환
   * @returns 사용 가능한 WebP 썸네일 크기 목록
   */
  getThumbnailSizes(): ThumbnailSizeConfig[] {
    return [...this.thumbnailSizes];
  }

  /**
   * 특정 크기의 WebP 썸네일 URL 생성
   * @param baseFileName 기본 파일명
   * @param sizeType 썸네일 크기 타입
   * @param bucket 버킷명
   * @returns WebP 썸네일 URL
   */
  getThumbnailUrl(
    baseFileName: string,
    sizeType: string,
    bucket: string = 'thumbnails',
  ): string {
    const thumbnailFileName = this.generateThumbnailFileName(
      baseFileName,
      sizeType,
      'webp',
    );
    return this.supabaseService.getPublicUrl(bucket, thumbnailFileName);
  }

  /**
   * WebP 썸네일 일괄 삭제
   * @param baseFileName 기본 파일명
   * @param bucket 버킷명
   */
  async deleteThumbnails(
    baseFileName: string,
    bucket: string = 'thumbnails',
  ): Promise<void> {
    try {
      const filesToDelete = this.thumbnailSizes.map((sizeConfig) =>
        this.generateThumbnailFileName(baseFileName, sizeConfig.name, 'webp'),
      );

      await this.supabaseService.deleteFiles(bucket, filesToDelete);
      this.logger.log(`WebP 썸네일 삭제 완료: ${baseFileName}`);
    } catch (error) {
      this.logger.error(`WebP 썸네일 삭제 실패: ${baseFileName}`, error);
      throw error;
    }
  }

  /**
   * 플랫폼별 최적화된 WebP 썸네일 크기 추천
   * @param isWeb 웹 환경 여부
   * @param isHighDPI 고해상도 디스플레이 여부
   * @returns 추천 썸네일 크기
   */
  getRecommendedSize(
    isWeb: boolean = false,
    isHighDPI: boolean = false,
  ): string {
    if (isWeb) {
      // 웹 환경: 큰 썸네일 우선
      return isHighDPI ? 'preview' : 'thumbnail_large';
    } else {
      // 모바일 환경: 적절한 크기 선택
      return isHighDPI ? 'thumbnail_large' : 'thumbnail_large';
    }
  }

  /**
   * WebP 지원 여부 확인을 위한 헬퍼 메서드
   * @returns WebP 지원 정보
   */
  getWebPSupportInfo(): {
    format: string;
    benefits: string[];
    fallback: string;
  } {
    return {
      format: 'WebP',
      benefits: [
        '25-35% 용량 절감 (JPEG 대비)',
        '애니메이션 GIF 지원',
        '투명도 지원',
        '점진적 로딩',
        '모든 모던 브라우저 지원',
      ],
      fallback: 'JPEG (구형 브라우저용)',
    };
  }
}
