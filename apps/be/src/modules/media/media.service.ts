import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Media, MediaType, UploadStatus } from '../../entities/media.entity';
import { SupabaseService } from '../../common/services/supabase.service';
import {
  generateAvatarFileName,
  generatePostMediaFileName,
  getMimeTypeFromFileName,
} from '../../common/utils/file-utils';
import * as sharp from 'sharp';
// Sharp 옵션 조정 - 애플리케이션 시작 시 한 번 설정
sharp.cache(false); // 캐시 비활성화로 메모리 누수 방지
sharp.concurrency(2); // 병렬 처리 제한
import * as path from 'path';
import * as ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import { MediaOptimizerService } from './media-optimizer.service';

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
    private readonly supabaseService: SupabaseService,
    private readonly mediaOptimizerService: MediaOptimizerService,
  ) {
    // 서비스 시작 시 Sharp 설정 로그
    this.logger.log('Sharp 이미지 처리 라이브러리 초기화 완료');
  }

  /**
   * 아바타 이미지 전용 업로드 함수
   * @param file 업로드된 아바타 이미지 파일
   * @param userId 업로드한 사용자 ID
   * @returns 생성된 미디어 엔티티
   */
  async createAvatarMedia(
    file: Express.Multer.File,
    userId: string,
  ): Promise<Media> {
    try {
      console.log(`아바타 파일 정보:`, {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path,
      });

      // 파일 유효성 검사
      if (file.size <= 0) {
        throw new Error(`파일 크기가 0 또는 음수입니다: ${file.size} bytes`);
      }

      // 이미지 파일인지 확인
      if (!file.mimetype.startsWith('image/')) {
        throw new Error('아바타는 이미지 파일만 업로드 가능합니다.');
      }

      // 이미지 메타데이터 추출
      const metadata = await this.extractImageMetadata(file.path);

      // 파일을 Supabase Storage에 업로드
      const fileBuffer = await fs.promises.readFile(file.path);

      // 한글 파일명 처리: 안전한 아바타 파일명 생성
      const fileName = generateAvatarFileName(file.originalname, userId);

      console.log(`아바타 파일명 변환: ${file.originalname} -> ${fileName}`);

      // Supabase Storage avatars 버킷에 업로드
      await this.supabaseService.uploadFile(
        'avatars',
        fileName,
        fileBuffer,
        file.mimetype,
      );

      // Supabase Storage 공개 URL 생성
      const publicUrl = this.supabaseService.getPublicUrl('avatars', fileName);

      // 로컬 파일 정리
      try {
        await fs.promises.unlink(file.path);
        this.logger.log(`로컬 파일 삭제 완료: ${file.path}`);
      } catch (unlinkError) {
        this.logger.warn(`로컬 파일 삭제 실패: ${file.path}`, unlinkError);
      }

      const media = this.mediaRepository.create({
        originalName: file.originalname,
        url: publicUrl,
        type: MediaType.IMAGE,
        status: UploadStatus.COMPLETED,
        fileSize: file.size,
        mimeType: file.mimetype,
        extension: path.extname(file.originalname).substring(1),
        width: metadata.width,
        height: metadata.height,
      });

      const savedMedia = await this.mediaRepository.save(media);
      this.logger.log(
        `아바타 업로드 성공: ${savedMedia.id}, URL: ${publicUrl}`,
      );

      return savedMedia;
    } catch (error) {
      this.logger.error(`아바타 업로드 실패: ${file.originalname}`, error);

      // 실패한 경우에도 DB에 기록
      const media = this.mediaRepository.create({
        originalName: file.originalname,
        url: '',
        type: MediaType.IMAGE,
        status: UploadStatus.FAILED,
        fileSize: file.size,
        mimeType: file.mimetype,
        extension: path.extname(file.originalname).substring(1),
        width: 0,
        height: 0,
        failureReason: error.message || '아바타 업로드 오류',
      });

      const savedMedia = await this.mediaRepository.save(media);
      throw new Error(`아바타 업로드 실패: ${error.message}`);
    }
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

        // 파일 타입에 따른 처리 분기
        const isVideo = file.mimetype.startsWith('video/');
        let metadata: { width: number; height: number; duration?: number };
        let mediaTypeEnum: MediaType;
        let bucket: string;

        if (isVideo) {
          // 동영상 메타데이터 추출
          metadata = await this.extractVideoMetadata(file.path);
          mediaTypeEnum = MediaType.VIDEO;
          bucket = 'post-videos';
        } else {
          // 이미지 메타데이터 추출
          metadata = await this.extractImageMetadata(file.path);
          mediaTypeEnum = MediaType.IMAGE;
          // 파일명에 따라 버킷 결정 (아바타 vs 일반 이미지)
          bucket =
            file.originalname.toLowerCase().includes('profile') ||
            file.originalname.toLowerCase().includes('avatar')
              ? 'avatars'
              : 'post-images';
        }

        // 파일을 Supabase Storage에 업로드
        const fileBuffer = await fs.promises.readFile(file.path);

        // 한글 파일명 처리: 안전한 파일명 생성
        const mediaTypeStr: 'video' | 'image' = isVideo ? 'video' : 'image';
        const fileName = generatePostMediaFileName(
          file.originalname,
          mediaTypeStr,
        );

        console.log(`파일명 변환: ${file.originalname} -> ${fileName}`);

        // Supabase Storage에 업로드
        await this.supabaseService.uploadFile(
          bucket,
          fileName,
          fileBuffer,
          file.mimetype,
        );

        // Supabase Storage 공개 URL 생성
        const publicUrl = this.supabaseService.getPublicUrl(bucket, fileName);

        // 로컬 파일 정리 (업로드 완료 후)
        try {
          await fs.promises.unlink(file.path);
          this.logger.log(`로컬 파일 삭제 완료: ${file.path}`);
        } catch (unlinkError) {
          this.logger.warn(`로컬 파일 삭제 실패: ${file.path}`, unlinkError);
        }

        const media = this.mediaRepository.create({
          originalName: file.originalname,
          url: publicUrl, // Supabase Storage 공개 URL 사용
          type: mediaTypeEnum,
          status: UploadStatus.COMPLETED,
          fileSize: file.size,
          mimeType: file.mimetype,
          extension: path.extname(file.originalname).substring(1),
          width: metadata.width,
          height: metadata.height,
          duration: metadata.duration, // 동영상인 경우에만 값이 있음 (decimal 타입으로 소수점 지원)
          // postId는 나중에 게시물 작성 시 연결됨
        });

        const savedMedia = await this.mediaRepository.save(media);
        // 미디어 타입별 최적화 처리
        if (isVideo) {
          // 동영상인 경우 썸네일 3종 생성
          try {
            await this.mediaOptimizerService.optimizeVideoMedia(savedMedia);
          } catch (optError) {
            this.logger.warn(
              `동영상 썸네일 생성 실패: ${file.originalname} - ${optError?.message || optError}`,
            );
          }
        } else {
          // 이미지인 경우 WebP 최적화 3종 생성
          try {
            await this.mediaOptimizerService.optimizeImageMedia(savedMedia);
          } catch (optError) {
            this.logger.warn(
              `이미지 최적화 실패: ${file.originalname} - ${optError?.message || optError}`,
            );
          }
        }
        mediaEntities.push(savedMedia);
      } catch (error) {
        console.error(`파일 처리 실패: ${file.originalname}`, error);
        // 실패해도 DB에 기록하여 클라이언트에서 처리할 수 있게 함
        try {
          const isVideo = file.mimetype.startsWith('video/');

          // 세분화된 에러 메시지 생성
          let detailedError = error.message || '미디어 처리 오류';
          if (error.message?.includes('ENOENT')) {
            detailedError =
              '파일을 찾을 수 없습니다. 업로드가 중단되었을 수 있습니다.';
          } else if (error.message?.includes('EACCES')) {
            detailedError = '파일 접근 권한이 없습니다.';
          } else if (
            error.message?.includes('EMFILE') ||
            error.message?.includes('ENFILE')
          ) {
            detailedError = '시스템 리소스 부족으로 업로드에 실패했습니다.';
          } else if (error.message?.includes('unsupported image format')) {
            detailedError = '지원되지 않는 이미지 형식입니다.';
          } else if (error.message?.includes('Storage')) {
            detailedError =
              '스토리지 업로드에 실패했습니다. 네트워크를 확인해주세요.';
          }

          const media = this.mediaRepository.create({
            originalName: file.originalname,
            url: '', // 실패한 경우 빈 URL
            type: isVideo ? MediaType.VIDEO : MediaType.IMAGE,
            status: UploadStatus.FAILED,
            fileSize: file.size,
            mimeType: file.mimetype,
            extension: path.extname(file.originalname).substring(1),
            width: 0,
            height: 0,
            duration: isVideo ? 0 : undefined,
            failureReason: detailedError,
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

  /**
   * 동영상 메타데이터를 추출합니다.
   * @param filePath 동영상 파일 경로
   * @returns 동영상 메타데이터
   */
  private async extractVideoMetadata(filePath: string): Promise<{
    width: number;
    height: number;
    duration: number;
  }> {
    try {
      // 파일이 존재하는지 확인
      const fs = require('fs');
      const fileExists = fs.existsSync(filePath);
      if (!fileExists) {
        throw new Error(`동영상 파일이 존재하지 않습니다: ${filePath}`);
      }

      // 파일 크기 확인
      const stats = fs.statSync(filePath);
      if (stats.size <= 0) {
        throw new Error(
          `동영상 파일 크기가 0 또는 음수입니다: ${stats.size} bytes`,
        );
      }

      this.logger.log(
        `동영상 메타데이터 추출 시작: ${filePath}, 크기: ${stats.size} bytes`,
      );

      // FFmpeg를 사용한 동영상 메타데이터 추출
      return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
          if (err) {
            this.logger.error('FFmpeg 메타데이터 추출 실패:', err);
            // 기본값 반환 (서버 중단 방지)
            resolve({
              width: 0,
              height: 0,
              duration: 0,
            });
            return;
          }

          try {
            // 비디오 스트림 찾기
            const videoStream = metadata.streams.find(
              (stream) => stream.codec_type === 'video',
            );

            if (!videoStream) {
              this.logger.warn('비디오 스트림을 찾을 수 없습니다');
              resolve({
                width: 0,
                height: 0,
                duration: 0,
              });
              return;
            }

            const width = videoStream.width || 0;
            const height = videoStream.height || 0;
            const duration = parseFloat(
              String(metadata.format.duration || '0'),
            );

            this.logger.log(`동영상 메타데이터 추출 성공:`, {
              width,
              height,
              duration,
              format: metadata.format.format_name,
            });

            resolve({
              width,
              height,
              duration,
            });
          } catch (parseError) {
            this.logger.error('메타데이터 파싱 오류:', parseError);
            resolve({
              width: 0,
              height: 0,
              duration: 0,
            });
          }
        });
      });
    } catch (error) {
      this.logger.error(`동영상 메타데이터 추출 실패(${filePath}):`, error);

      // 서버가 중단되지 않도록 기본값 반환
      return {
        width: 0,
        height: 0,
        duration: 0,
      };
    }
  }

  /**
   * 동영상 썸네일을 생성합니다.
   * @param videoPath 동영상 파일 경로
   * @param outputPath 썸네일 출력 경로
   * @param timeStamp 썸네일을 추출할 시간 (초)
   * @returns 썸네일 생성 성공 여부
   */
  async generateVideoThumbnail(
    videoPath: string,
    outputPath: string,
    timeStamp: number = 1,
  ): Promise<boolean> {
    try {
      this.logger.log(`동영상 썸네일 생성 시작: ${videoPath} -> ${outputPath}`);

      return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .screenshots({
            timestamps: [timeStamp],
            filename: path.basename(outputPath),
            folder: path.dirname(outputPath),
            size: '320x240',
          })
          .on('end', () => {
            this.logger.log('동영상 썸네일 생성 완료');
            resolve(true);
          })
          .on('error', (err) => {
            this.logger.error('동영상 썸네일 생성 실패:', err);
            resolve(false);
          });
      });
    } catch (error) {
      this.logger.error('동영상 썸네일 생성 중 오류:', error);
      return false;
    }
  }
}
