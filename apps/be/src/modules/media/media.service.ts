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
        console.log(`파일 정보:`, {
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          path: file.path,
        });

        // 파일 유효성 검사
        if (file.size <= 0) {
          throw new Error(`파일 크기가 0 또는 음수입니다: ${file.size} bytes`);
        }

        // 이미지 메타데이터 추출
        const metadata = await this.extractImageMetadata(file.path);

        // 환경에 따른 기본 URL 설정
        const baseUrl = 'http://localhost:3000';

        // 파일 경로에서 '/uploads/images/' 이후 부분만 추출
        const relativePath =
          file.path.split('uploads/images/')[1] || file.filename;

        const media = this.mediaRepository.create({
          originalName: file.originalname,
          url: `${baseUrl}/uploads/images/${relativePath}`,
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
        // 실패해도 DB에 기록하여 클라이언트에서 처리할 수 있게 함
        try {
          const media = this.mediaRepository.create({
            originalName: file.originalname,
            url: file.path,
            type: MediaType.IMAGE,
            status: UploadStatus.FAILED,
            fileSize: file.size,
            mimeType: file.mimetype,
            extension: path.extname(file.originalname).substring(1),
            width: 0,
            height: 0,
            failureReason: error.message || '이미지 처리 오류',
          });
          const savedMedia = await this.mediaRepository.save(media);
          mediaEntities.push(savedMedia);
        } catch (saveError) {
          console.error('실패한 미디어 저장 중 오류:', saveError);
        }
      }
    }

    return mediaEntities;
  }

  /**
   * 이미지 메타데이터를 추출합니다.
   * @param filePath 파일 경로
   * @returns 이미지 메타데이터
   * @throws Error 메타데이터 추출 실패 시
   */
  private async extractImageMetadata(filePath: string): Promise<{
    width: number;
    height: number;
  }> {
    try {
      // 파일이 존재하는지 확인
      const fs = require('fs');
      const fileExists = fs.existsSync(filePath);
      if (!fileExists) {
        throw new Error(`파일이 존재하지 않습니다: ${filePath}`);
      }

      // 파일 크기 확인
      const stats = fs.statSync(filePath);
      if (stats.size <= 0) {
        throw new Error(`파일 크기가 0 또는 음수입니다: ${stats.size} bytes`);
      }

      console.log(
        `이미지 메타데이터 추출 시작: ${filePath}, 크기: ${stats.size} bytes`,
      );

      // 이미지 메타데이터 추출
      const metadata = await sharp(filePath).metadata();

      if (!metadata) {
        throw new Error('메타데이터가 추출되지 않았습니다');
      }

      console.log(`메타데이터 추출 성공:`, {
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
      });

      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
      };
    } catch (error) {
      console.error(`이미지 메타데이터 추출 실패(${filePath}):`, error);
      // 추출 실패 시 예외 전달하여 호출자가 적절히 처리하도록 함
      throw error;
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
