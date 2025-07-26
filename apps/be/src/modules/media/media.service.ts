import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Media, MediaType, UploadStatus } from '../../entities/media.entity';
import * as sharp from 'sharp';
// Sharp 옵션 조정 - 애플리케이션 시작 시 한 번 설정
sharp.cache(false); // 캐시 비활성화로 메모리 누수 방지
sharp.concurrency(2); // 병렬 처리 제한
import * as path from 'path';

/**
 * 미디어 서비스
 * 파일 업로드 및 미디어 관리 기능을 제공합니다.
 */
@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
  ) {
    // 서비스 시작 시 Sharp 설정 로그
    this.logger.log('Sharp 이미지 처리 라이브러리 초기화 완료');
  }

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

        // 이미지 메타데이터 추출 - extractImageMetadata 메서드가 항상 객체 반환
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

      this.logger.log(
        `이미지 메타데이터 추출 시작: ${filePath}, 크기: ${stats.size} bytes`,
      );

      // 파일 내용 확인 (첫 몇 바이트)
      try {
        const fileHeader = fs.readFileSync(filePath, { length: 12 }); // 첫 12 바이트만 읽기
        this.logger.log(`파일 헤더: ${fileHeader.toString('hex')}`);
      } catch (e) {
        this.logger.warn(`파일 헤더 읽기 실패: ${e.message}`);
      }

      // 이미지 메타데이터 추출 - 안전하게 처리
      let metadata;
      try {
        // failOn: 'none'으로 설정하여 일부 오류를 무시
        metadata = await sharp(filePath, {
          failOn: 'none',
          limitInputPixels: false, // 픽셀 수 제한 해제
          sequentialRead: true, // 순차적 읽기
        }).metadata();
      } catch (sharpError) {
        this.logger.error('Sharp 라이브러리 오류:', sharpError);

        // 에러 상세 정보 기록
        this.logger.error(
          `Sharp 에러 세부 정보: ${JSON.stringify({
            message: sharpError.message,
            code: sharpError.code,
            name: sharpError.name,
            stack: sharpError.stack?.split('\n')[0],
          })}`,
        );

        // 기본값 반환 (서버 중단 방지)
        return {
          width: 0,
          height: 0,
        };
      }

      if (!metadata) {
        this.logger.warn('메타데이터가 추출되지 않았습니다 - 기본값 사용');
        return {
          width: 0,
          height: 0,
        };
      }

      this.logger.log(`메타데이터 추출 성공:`, {
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
      });

      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
      };
    } catch (error) {
      this.logger.error(`이미지 메타데이터 추출 실패(${filePath}):`, error);

      // 서버가 중단되지 않도록 기본값 반환
      return {
        width: 0,
        height: 0,
      };

      // 특정 에러 유형에 대한 더 친숙한 메시지 제공
      if (error.message && error.message.includes('unsupported image format')) {
        throw new Error(
          '지원되지 않는 이미지 형식입니다. JPG, PNG, GIF, WebP 형식만 지원합니다.',
        );
      } else if (
        error.message &&
        error.message.includes('Input file is missing')
      ) {
        throw new Error(
          '파일을 찾을 수 없습니다. 업로드가 제대로 이루어지지 않았습니다.',
        );
      } else if (
        error.message &&
        error.message.includes('Input file contains truncated data')
      ) {
        throw new Error(
          '손상된 이미지 파일입니다. 다른 이미지를 업로드해주세요.',
        );
      }

      // 그 외 에러는 원본 에러 전달
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
