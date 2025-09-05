import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import * as sharp from 'sharp';
// Sharp CJS/ESM 호환 팩토리 (sharp가 ESM(default) 혹은 CJS(함수 자체) 모두 대응)
const sharpFactory: any = (sharp as any)?.default || (sharp as any);
import * as ffmpeg from 'fluent-ffmpeg';
import axios from 'axios';
import * as path from 'path';
import * as fs from 'fs';

import { Media, MediaType } from '../../entities/media.entity';
import {
  MediaOptimizer,
  MediaOptimizationType,
} from '../../common/media-optimizer.entity';
import { SupabaseService } from '../../common/services/supabase.service';

import { randomUUID } from 'crypto';
import * as os from 'os';

type MediaSizeConfig = {
  name: MediaOptimizationType;
  maxSize: number;
  quality: number;
  bucket: string; // 각 타입별 대상 버킷
};

@Injectable()
export class MediaOptimizerService {
  private readonly logger = new Logger(MediaOptimizerService.name);

  // 용도별 사이즈 설정
  private readonly mediaSizes: MediaSizeConfig[] = [
    {
      name: MediaOptimizationType.THUMBNAIL,
      maxSize: 200,
      quality: 80,
      bucket: 'thumbnails',
    },
    {
      name: MediaOptimizationType.MOBILE,
      maxSize: 600,
      quality: 80,
      bucket: 'mobile',
    },
    {
      name: MediaOptimizationType.DESKTOP,
      maxSize: 1200,
      quality: 85,
      bucket: 'desktop',
    },
  ];

  // Repositories (DataSource 기반 수동 주입)
  private optimizerRepo: Repository<MediaOptimizer>;
  private mediaRepo: Repository<Media>;

  constructor(
    private readonly dataSource: DataSource,
    private readonly supabaseService: SupabaseService,
  ) {
    this.optimizerRepo = this.dataSource.getRepository(MediaOptimizer);
    this.mediaRepo = this.dataSource.getRepository(Media);
  }

  /**
   * 이미지 최적화 처리
   * - 아바타(avatars 버킷 / 파일명 포함 avatar|profile)는 추가 최적화 스킵 (이미 200x200 변환 완료됨)
   * - 일반 이미지는 3종(WebP: thumbnail/mobile/desktop) 생성
   */
  async optimizeImageMedia(media: Media): Promise<MediaOptimizer[]> {
    if (media.type !== MediaType.IMAGE) {
      return [];
    }

    // 버킷 사전 보장(없으면 생성 시도, 이미 있으면 무시)
    await this.ensureBuckets();

    const results: MediaOptimizer[] = [];

    // 원본 파일을 다운로드하여 버퍼 확보
    const originalBuffer = await this.downloadPublicUrlToBuffer(media.url);

    // GIF 여부 확인 (mimeType 기반 또는 확장자 기반)
    const isAnimatedGif =
      /gif$/i.test(media.extension || '') || /gif/i.test(media.mimeType || '');

    // 아바타 여부 판단: 원본 이름 또는 URL 에 avatar/profile 포함 + avatars 버킷 경로
    const isAvatar =
      (media.originalName || '').toLowerCase().includes('avatar') ||
      (media.originalName || '').toLowerCase().includes('profile') ||
      media.url.includes('/avatars/') ||
      media.url.includes('/avatar/');

    if (isAvatar) {
      this.logger.log(`아바타 이미지 - 추가 최적화 스킵 (mediaId=${media.id})`);
      return [];
    }
    // 일반 이미지: 3종 생성
    for (const size of this.mediaSizes) {
      const { buffer, width, height } = await this.createOptimizedImage(
        originalBuffer,
        size,
        isAnimatedGif,
      );

      const objectKey = this.buildObjectKey(media.id, size.name);
      await this.supabaseService.uploadFile(
        size.bucket,
        objectKey,
        buffer,
        'image/webp',
      );

      const url = this.supabaseService.getPublicUrl(size.bucket, objectKey);

      const entity = this.optimizerRepo.create({
        mediaId: media.id,
        media: media,
        mediaOptType: size.name,
        url,
        width,
        height,
        fileSize: buffer.length,
      });
      results.push(await this.optimizerRepo.save(entity));
    }

    // 일반 이미지 후처리: desktop 대표 URL 교체 + post-images 원본 삭제 (thumbnailUrl 제거, 아바타는 이전에 return)
    try {
      const originalUrl = media.url;
      const POST_IMAGES_SEGMENT = '/storage/v1/object/public/post-images/';
      const isPostImagesOriginal = originalUrl.includes(POST_IMAGES_SEGMENT);

      const desktopOpt = results.find(
        (r) => r.mediaOptType === MediaOptimizationType.DESKTOP,
      );
      if (desktopOpt) {
        media.url = desktopOpt.url;
        media.mimeType = 'image/webp';
        media.extension = 'webp';
        await this.mediaRepo.save(media);
        this.logger.log(
          `일반 이미지 desktop URL 교체 완료 (mediaId=${media.id})`,
        );
      } else {
        this.logger.warn(
          `desktop 최적화 결과 없음 - media.url 교체 생략 (mediaId=${media.id})`,
        );
      }

      if (isPostImagesOriginal) {
        const objectPath = originalUrl.split(POST_IMAGES_SEGMENT)[1];
        if (objectPath) {
          try {
            await this.supabaseService.deleteFiles('post-images', [objectPath]);
            this.logger.log(
              `post-images 원본 삭제 완료: ${objectPath} (mediaId=${media.id})`,
            );
          } catch (delErr: any) {
            this.logger.warn(
              `post-images 원본 삭제 실패 (mediaId=${media.id}): ${delErr?.message || delErr}`,
            );
          }
        } else {
          this.logger.warn(
            `post-images 원본 object path 추출 실패 (mediaId=${media.id})`,
          );
        }
      }
    } catch (afterError: any) {
      this.logger.warn(
        `일반 이미지 후처리(대표URL 교체/원본삭제) 실패 (mediaId=${media.id}): ${afterError?.message || afterError}`,
      );
    }
    return results;
  }

  /**
   * WebP 썸네일/최적화 이미지 생성 (Sharp 사용, GIF 애니메이션 지원)
   */
  private async createOptimizedImage(
    source: string | Buffer,
    sizeConfig: MediaSizeConfig,
    isAnimated: boolean = false,
  ): Promise<{ buffer: Buffer; width?: number; height?: number }> {
    // Sharp 인스턴스 생성 (CJS/ESM 호환 sharpFactory 사용)
    const instance =
      typeof source === 'string'
        ? sharpFactory(source, { animated: isAnimated })
        : sharpFactory(source, { animated: isAnimated });

    // 메타데이터로 원본 크기 파악 후 리사이즈 전략
    const metadata = await instance.metadata();
    const originalWidth = metadata.width || sizeConfig.maxSize;
    const originalHeight = metadata.height || sizeConfig.maxSize;

    // 정사각형 썸네일은 200x200, 나머지는 긴변 기준 리사이즈
    const isSquare = sizeConfig.name === MediaOptimizationType.THUMBNAIL;
    const targetWidth = isSquare
      ? 200
      : Math.min(sizeConfig.maxSize, originalWidth);
    const targetHeight = isSquare ? 200 : undefined;

    const pipeline = instance
      .resize(targetWidth, targetHeight, {
        fit: isSquare ? 'cover' : 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: sizeConfig.quality, effort: 4 }); // effort: 속도/압축 밸런스

    const output = await pipeline.toBuffer({ resolveWithObject: true });

    // 결과 메타데이터에서 실제 저장 크기 파생
    const outMeta = await sharpFactory(output.data, {
      animated: isAnimated,
    }).metadata();
    return {
      buffer: output.data,
      width: outMeta.width,
      height: outMeta.height,
    };
  }

  /**
   * 공개 URL에서 파일을 버퍼로 다운로드
   */
  private async downloadPublicUrlToBuffer(url: string): Promise<Buffer> {
    const res = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(res.data);
  }

  /**
   * 오브젝트 키 규칙
   * `${mediaId}.webp`
   */
  private buildObjectKey(mediaId: string, name: MediaOptimizationType): string {
    // 버킷은 타입별(thumbnails/mobile/desktop)로 분리되어 있으므로
    // 오브젝트 키에는 타입명을 포함하지 않고 mediaId만 사용합니다.
    // 최종 공개 URL 예: /storage/v1/object/public/mobile/${mediaId}.webp
    return `${mediaId}.webp`;
  }

  /**
   * 주어진 `Media`(VIDEO)에 대해 3종 썸네일을 생성 후 저장
   *
   */
  async optimizeVideoMedia(media: Media): Promise<MediaOptimizer[]> {
    if (media.type !== MediaType.VIDEO) {
      return [];
    }

    // 버킷 사전 보장(없으면 생성 시도, 이미 있으면 무시)
    await this.ensureBuckets();

    const results: MediaOptimizer[] = [];
    const tempDir = path.join(os.tmpdir(), 'temp', 'video-thumbnails');

    try {
      // 임시 디렉토리 생성
      await fs.promises.mkdir(tempDir, { recursive: true });

      // 원본 동영상 파일을 임시 디렉토리에 다운로드
      const originalBuffer = await this.downloadPublicUrlToBuffer(media.url);
      const tempVideoPath = path.join(
        tempDir,
        `temp_video_${randomUUID()}.mp4`,
      );
      await fs.promises.writeFile(tempVideoPath, originalBuffer);

      // 동영상에서 프레임 추출
      const tempImagePath = path.join(
        tempDir,
        `temp_frame_${randomUUID()}.jpg`,
      );
      await this.extractVideoFrame(tempVideoPath, tempImagePath, 1);

      // 추출된 프레임으로 3종 썸네일 생성
      for (const size of this.mediaSizes) {
        try {
          const { buffer, width, height } = await this.createOptimizedImage(
            tempImagePath,
            size,
            false, // 동영상 썸네일은 애니메이션이 아님
          );

          const objectKey = this.buildObjectKey(media.id, size.name);
          await this.supabaseService.uploadFile(
            size.bucket,
            objectKey,
            buffer,
            'image/webp',
          );

          const url = this.supabaseService.getPublicUrl(size.bucket, objectKey);

          const entity = this.optimizerRepo.create({
            mediaId: media.id,
            media: media,
            mediaOptType: size.name,
            url,
            width,
            height,
            fileSize: buffer.length,
          });
          results.push(await this.optimizerRepo.save(entity));

          this.logger.log(
            `동영상 썸네일 생성 완료: ${size.name} (${buffer.length} bytes)`,
          );
        } catch (sizeError) {
          this.logger.error(`동영상 썸네일 생성 실패: ${size.name}`, sizeError);
        }
      }

      // 임시 파일 정리
      await this.cleanupTempFiles([tempVideoPath, tempImagePath]);

      this.logger.log(
        `동영상 썸네일 생성 완료: ${results.length}개 생성 (미디어 ID: ${media.id})`,
      );
      return results;
    } catch (error) {
      this.logger.error(
        `동영상 썸네일 생성 중 오류: ${media.originalName}`,
        error,
      );

      // 임시 디렉토리 정리 시도
      try {
        const files = await fs.promises.readdir(tempDir);
        for (const file of files) {
          if (file.includes(media.id) || file.includes('temp_')) {
            await fs.promises.unlink(path.join(tempDir, file));
          }
        }
      } catch (cleanupError) {
        this.logger.warn('임시 파일 정리 실패:', cleanupError);
      }

      return results; // 부분적으로 성공한 결과라도 반환
    }
  }

  /**
   * 동영상에서 특정 시간의 프레임을 추출합니다.
   * @param videoPath 동영상 파일 경로
   * @param outputPath 출력 이미지 경로
   * @param timeStamp 추출할 시간 (초)
   */
  private async extractVideoFrame(
    videoPath: string,
    outputPath: string,
    timeStamp: number = 1,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: [timeStamp],
          filename: path.basename(outputPath),
          folder: path.dirname(outputPath),
          size: '?x720', // 높이 720px로 고정, 가로는 비율 유지
        })
        .on('end', () => {
          this.logger.log(`동영상 프레임 추출 완료: ${outputPath}`);
          resolve();
        })
        .on('error', (err) => {
          this.logger.error('동영상 프레임 추출 실패:', err);
          reject(new Error(`프레임 추출 실패: ${err.message}`));
        });
    });
  }

  /**
   * 임시 파일들을 정리합니다.
   * @param filePaths 정리할 파일 경로 배열
   */
  private async cleanupTempFiles(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        await fs.promises.unlink(filePath);
        this.logger.log(`임시 파일 삭제 완료: ${filePath}`);
      } catch (cleanupError) {
        this.logger.warn(`임시 파일 삭제 실패: ${filePath}`, cleanupError);
      }
    }
  }

  /**
   * 필요한 버킷(thumbnails, mobile, desktop) 보장
   */
  private async ensureBuckets(): Promise<void> {
    const client = this.supabaseService.getClient();
    for (const size of this.mediaSizes) {
      try {
        const { error } = await client.storage.createBucket(size.bucket, {
          public: true,
          fileSizeLimit: '20mb',
        });
        if (error) {
          const msg = String(error.message || error);
          if (!/already exists/i.test(msg)) {
            this.logger.warn(`버킷 생성 실패(${size.bucket}): ${msg}`);
          }
        } else {
          this.logger.log(`버킷 생성됨: ${size.bucket}`);
        }
      } catch (e: any) {
        const msg = e?.message || String(e);
        if (!/already exists/i.test(msg)) {
          this.logger.warn(`버킷 생성 중 예외(${size.bucket}): ${msg}`);
        }
      }
    }
  }
}
