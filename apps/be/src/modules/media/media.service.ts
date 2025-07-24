import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Media, MediaType, UploadStatus } from '../../entities/media.entity';
import * as sharp from 'sharp';
import * as path from 'path';

/**
 * 미디어 서비스
 * 파일 업로드 및 미디어 관리 기능을 제공합니다.
 */
@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
  ) {}

  /**
   * 업로드된 파일들로부터 미디어 엔티티를 생성합니다.
   * @param files 업로드된 파일 배열
   * @param userId 업로드한 사용자 ID
   * @returns 생성된 미디어 엔티티 배열
   */
  async createMediaFromFiles(
    files: Express.Multer.File[],
    userId: string,
  ): Promise<Media[]> {
    const mediaEntities: Media[] = [];

    for (const file of files) {
      try {
        // 이미지 메타데이터 추출
        const metadata = await this.extractImageMetadata(file.path);

        const media = this.mediaRepository.create({
          originalName: file.originalname,
          url: `/uploads/images/${file.filename}`,
          type: MediaType.IMAGE,
          status: UploadStatus.COMPLETED,
          fileSize: file.size,
          mimeType: file.mimetype,
          extension: path.extname(file.originalname).substring(1),
          width: metadata.width,
          height: metadata.height,
          // postId는 나중에 게시물 작성 시 연결됨
        });

        const savedMedia = await this.mediaRepository.save(media);
        mediaEntities.push(savedMedia);
      } catch (error) {
        console.error(`파일 처리 실패: ${file.originalname}`, error);
        // 실패한 파일은 건너뛰고 계속 진행
      }
    }

    return mediaEntities;
  }

  /**
   * 이미지 메타데이터를 추출합니다.
   * @param filePath 파일 경로
   * @returns 이미지 메타데이터
   */
  private async extractImageMetadata(filePath: string): Promise<{
    width: number;
    height: number;
  }> {
    try {
      const metadata = await sharp(filePath).metadata();
      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
      };
    } catch (error) {
      console.error('이미지 메타데이터 추출 실패:', error);
      return { width: 0, height: 0 };
    }
  }

  /**
   * 미디어를 게시물에 연결합니다.
   * @param mediaIds 미디어 ID 배열
   * @param postId 게시물 ID
   */
  async attachMediaToPost(mediaIds: string[], postId: string): Promise<void> {
    if (mediaIds.length === 0) return;

    await this.mediaRepository.update({ id: In(mediaIds) }, { postId });
  }

  /**
   * 미디어 ID로 미디어를 조회합니다.
   * @param mediaIds 미디어 ID 배열
   * @returns 미디어 엔티티 배열
   */
  async findByIds(mediaIds: string[]): Promise<Media[]> {
    if (mediaIds.length === 0) return [];

    return this.mediaRepository.find({
      where: {
        id: In(mediaIds),
      },
    });
  }
}
