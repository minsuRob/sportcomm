import {
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
  UseGuards,
  Req,
  BadRequestException,
  InternalServerErrorException,
  PayloadTooLargeException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';
import { MediaService } from '../media/media.service';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { existsSync, mkdirSync } from 'fs';
import { HttpAuthGuard } from 'src/common/guards/http-auth.guard';

/**
 * 인증 관련 파일 업로드 컨트롤러
 * 프로필 이미지 업로드 등 인증이 필요한 파일 업로드 기능을 제공합니다.
 */
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly mediaService: MediaService) {}

  /**
   * 프로필 이미지 업로드 엔드포인트
   * 단일 이미지 파일만 업로드할 수 있습니다.
   *
   * @param file 업로드할 프로필 이미지 파일
   * @param user 현재 인증된 사용자
   * @returns 업로드된 미디어 엔티티 정보
   */
  @Post('upload-profile-image')
  @UseGuards(HttpAuthGuard)
  @UseInterceptors(
    FilesInterceptor('file', 1, {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB 제한 (프로필 이미지)
        files: 1, // 단일 파일만
      },
      storage: diskStorage({
        destination: (req, file, cb) => {
          // 이미지 파일만 허용
          if (!file.mimetype.startsWith('image/')) {
            cb(
              new Error('프로필 이미지는 이미지 파일만 업로드 가능합니다.'),
              '',
            );
            return;
          }

          const uploadPath = join(process.cwd(), 'uploads', 'images');

          console.log(
            `프로필 이미지 저장 경로 설정: ${file.originalname}, 타입: ${file.mimetype}`,
          );

          try {
            if (!existsSync(uploadPath)) {
              mkdirSync(uploadPath, { recursive: true });
              console.log(`프로필 이미지 디렉토리 생성 완료: ${uploadPath}`);
            }
            cb(null, uploadPath);
          } catch (error) {
            console.error(`프로필 이미지 디렉토리 생성 실패: ${error.message}`);
            cb(error as Error, '');
          }
        },
        filename: (req, file, cb) => {
          try {
            // 파일 확장자 추출
            const fileExtension = extname(file.originalname);
            const allowedExtensions = [
              '.jpg',
              '.jpeg',
              '.png',
              '.gif',
              '.webp',
            ];

            if (!allowedExtensions.includes(fileExtension.toLowerCase())) {
              cb(
                new Error(
                  '지원되지 않는 이미지 형식입니다. JPG, PNG, GIF, WebP만 허용됩니다.',
                ),
                '',
              );
              return;
            }

            // UUID를 사용한 고유 파일명 생성
            const uniqueFilename = `profile_${uuidv4()}${fileExtension}`;
            console.log(
              `프로필 이미지 파일명 생성: ${file.originalname} -> ${uniqueFilename}`,
            );

            cb(null, uniqueFilename);
          } catch (error) {
            console.error('프로필 이미지 파일명 생성 실패:', error);
            cb(error as Error, '');
          }
        },
      }),
      fileFilter: (req, file, cb) => {
        // 이미지 파일만 허용
        if (file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(
            new Error('프로필 이미지는 이미지 파일만 업로드 가능합니다.'),
            false,
          );
        }
      },
    }),
  )
  async uploadProfileImage(
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    const requestId = uuidv4().substring(0, 8);

    try {
      this.logger.log(
        `\n======== 프로필 이미지 업로드 시작 (ID: ${requestId}) ========`,
      );
      this.logger.log(`사용자: ${user.nickname} (${user.id})`);
      this.logger.log(`요청 URL: ${req.url}`);

      // 파일 존재 확인
      if (!files || files.length === 0) {
        throw new BadRequestException('업로드할 프로필 이미지가 없습니다.');
      }

      if (files.length > 1) {
        throw new BadRequestException(
          '프로필 이미지는 하나의 파일만 업로드할 수 있습니다.',
        );
      }

      const file = files[0];

      // 파일 크기 및 타입 재검증
      if (file.size <= 0) {
        throw new BadRequestException('업로드된 파일이 비어있습니다.');
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new BadRequestException('프로필 이미지는 5MB 이하여야 합니다.');
      }

      if (!file.mimetype.startsWith('image/')) {
        throw new BadRequestException(
          '프로필 이미지는 이미지 파일만 업로드 가능합니다.',
        );
      }

      this.logger.log(
        `프로필 이미지 정보: ${file.originalname}, 크기: ${file.size}바이트, 타입: ${file.mimetype}`,
      );

      // MediaService를 사용하여 미디어 엔티티 생성
      const mediaEntities = await this.mediaService.createMediaFromFiles(
        [file],
        user.id,
      );

      if (mediaEntities.length === 0) {
        throw new InternalServerErrorException(
          '프로필 이미지 처리 중 오류가 발생했습니다.',
        );
      }

      const media = mediaEntities[0];

      this.logger.log(`프로필 이미지 업로드 성공: ${media.id}`);
      this.logger.log(
        `======== 프로필 이미지 업로드 완료 (ID: ${requestId}) ========\n`,
      );

      return {
        success: true,
        message: '프로필 이미지가 성공적으로 업로드되었습니다.',
        data: {
          id: media.id,
          url: media.url,
          originalName: media.originalName,
          type: media.type,
          fileSize: media.fileSize,
          width: media.width,
          height: media.height,
        },
      };
    } catch (error) {
      this.logger.error(`프로필 이미지 업로드 실패 (ID: ${requestId}):`, error);

      // 파일이 생성되었다면 정리
      if (files && files.length > 0) {
        for (const file of files) {
          try {
            const fs = require('fs');
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
              this.logger.log(`업로드 실패한 파일 정리: ${file.path}`);
            }
          } catch (cleanupError) {
            this.logger.error('파일 정리 실패:', cleanupError);
          }
        }
      }

      // 에러 타입에 따른 적절한 응답
      if (error instanceof BadRequestException) {
        throw error;
      } else if (error.name === 'MulterError') {
        if (error.code === 'LIMIT_FILE_SIZE') {
          throw new PayloadTooLargeException(
            '프로필 이미지 파일 크기가 너무 큽니다. (최대 5MB)',
          );
        } else if (error.code === 'LIMIT_FILE_COUNT') {
          throw new BadRequestException(
            '프로필 이미지는 하나의 파일만 업로드할 수 있습니다.',
          );
        } else {
          throw new BadRequestException(`파일 업로드 오류: ${error.message}`);
        }
      } else {
        throw new InternalServerErrorException({
          message: '프로필 이미지 업로드 중 서버 오류가 발생했습니다.',
          error: error.message,
        });
      }
    }
  }
}
