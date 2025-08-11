import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as sharp from 'sharp';
import * as ffmpeg from 'fluent-ffmpeg';
import axios from 'axios';

import { Media, MediaType } from '../../entities/media.entity';
import {
  MediaOptimizer,
  MediaOptimizationType,
} from '../../common/media-optimizer.entity';
import { SupabaseService } from '../../common/services/supabase.service';

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

  constructor(
    @InjectRepository(MediaOptimizer)
    private readonly optimizerRepo: Repository<MediaOptimizer>,
    @InjectRepository(Media)
    private readonly mediaRepo: Repository<Media>,
    private readonly supabaseService: SupabaseService,
  ) {}

  /**
   * 주어진 `Media`(IMAGE)에 대해 3종(WebP) 최적화를 생성 후 저장
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

    // 원본 이미지 URL은 추후 삭제 예정이라고 했으므로, 여기서는 유지하고 후속 작업에서 제거
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
    // Sharp 인스턴스 생성
    const instance =
      typeof source === 'string'
        ? sharp(source, { animated: isAnimated })
        : sharp(source, { animated: isAnimated });

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
    const outMeta = await sharp(output.data, {
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
