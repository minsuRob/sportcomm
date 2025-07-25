import {
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
  UseGuards,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';
import { MediaService } from './media.service';
// multer v2에서는 diskStorage 사용 방식이 변경됨
// import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { existsSync, mkdirSync } from 'fs';
import { GqlAuthGuard } from 'src/common/guards/gql-auth.guard';
// Multer 타입 정의 추가
import 'multer';

// // Express에 Multer 타입 확장
// declare global {
//   namespace Express {
//     namespace Multer {
//       interface File {
//         fieldname: string;
//         originalname: string;
//         encoding: string;
//         mimetype: string;
//         size: number;
//         destination: string;
//         filename: string;
//         path: string;
//         buffer: Buffer;
//       }
//     }
//   }
// }

/**
 * 미디어 업로드 컨트롤러
 * REST API를 통한 파일 업로드 기능을 제공합니다.
 * GraphQL과 분리하여 파일 업로드만 처리합니다.
 * 웹과 React Native 클라이언트 모두 지원합니다.
 */
@Controller('api/upload')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  /**
   * 파일 업로드 REST API
   * 최대 4개의 이미지/비디오 파일을 업로드할 수 있습니다.
   *
   * @param files 업로드할 파일들
   * @param user 현재 인증된 사용자
   * @returns 업로드된 파일들의 ID와 URL 정보
   */
  @Post()
  @UseGuards(GqlAuthGuard)
  @UseInterceptors(
    FilesInterceptor('files', 4, {
      storage: {
        destination: (req, file, cb) => {
          const uploadPath = join(process.cwd(), 'uploads/images');
          // 디렉토리 존재 확인 및 생성
          try {
            if (!existsSync(uploadPath)) {
              mkdirSync(uploadPath, { recursive: true });
            }
            cb(null, uploadPath);
          } catch (error) {
            cb(new Error(`디렉토리 생성 오류: ${error.message}`), '');
          }
        },
        filename: (req, file, callback) => {
          const uniqueSuffix = uuidv4();
          const ext = extname(file.originalname);
          const timestamp = Date.now();
          callback(null, `${timestamp}_${uniqueSuffix}${ext}`);
        },
      },
      fileFilter: (req, file, callback) => {
        // 이미지 및 비디오 파일 허용
        const allowedMimeTypes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'image/webp',
          'video/mp4',
          'video/avi',
          'video/mov',
          'video/quicktime', // iOS에서 사용하는 MOV 타입
          'video/wmv',
          'application/octet-stream', // React Native에서 때때로 이 타입으로 전송됨
        ];

        // React Native에서 전송되는 파일은 때때로 다른 MIME 타입을 가질 수 있음
        // 파일 확장자로 추가 검증
        const allowedExtensions = [
          'jpg',
          'jpeg',
          'png',
          'gif',
          'webp',
          'mp4',
          'avi',
          'mov',
          'wmv',
        ];
        const fileExt = file.originalname.split('.').pop()?.toLowerCase();

        if (
          !allowedMimeTypes.includes(file.mimetype) &&
          (!fileExt || !allowedExtensions.includes(fileExt))
        ) {
          return callback(
            new BadRequestException(
              `지원되지 않는 파일 형식입니다(${file.mimetype}). 이미지(jpg, png, gif, webp) 또는 비디오(mp4, avi, mov, wmv) 파일만 업로드 가능합니다.`,
            ),
            false,
          );
        }

        // React Native에서 전송된 application/octet-stream 타입 파일의 경우 확장자로 타입 추론
        if (file.mimetype === 'application/octet-stream' && fileExt) {
          if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt)) {
            file.mimetype = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;
          } else if (['mp4', 'avi', 'mov', 'wmv'].includes(fileExt)) {
            file.mimetype = `video/${fileExt === 'mov' ? 'quicktime' : fileExt}`;
          }
        }

        callback(null, true);
      },
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB 제한 (비디오 파일 고려)
        files: 4, // 최대 4개 파일
      },
      // React Native와의 호환성을 위한 Multer 설정
      preservePath: true,
    }),
  )
  async uploadFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: User,
    @Body() body: any,
  ) {
    console.log('파일 업로드 요청 받음:', {
      fileCount: files?.length || 0,
      userId: user?.id,
      bodyParams: Object.keys(body || {}),
    });

    if (!files || files.length === 0) {
      throw new BadRequestException('업로드할 파일이 없습니다.');
    }

    if (files.length > 4) {
      throw new BadRequestException('최대 4개의 파일만 업로드할 수 있습니다.');
    }

    try {
      console.log(
        '파일 정보:',
        files.map((f) => ({
          originalname: f.originalname,
          mimetype: f.mimetype,
          size: f.size,
          path: f.path?.substring(0, 50) + '...',
        })),
      );

      // 미디어 엔티티 생성
      const uploadedMedia = await this.mediaService.createMediaFromFiles(
        files,
        user.id,
      );

      console.log('업로드 완료:', {
        mediaCount: uploadedMedia.length,
        firstMediaId: uploadedMedia[0]?.id,
      });

      // REST API 표준 응답 형식
      return {
        success: true,
        message: `${files.length}개의 파일이 성공적으로 업로드되었습니다.`,
        data: {
          files: uploadedMedia.map((media) => ({
            id: media.id,
            url: media.url,
            originalName: media.originalName,
            mimeType: media.mimeType,
            fileSize: media.fileSize,
            type: media.type,
            status: media.status,
            thumbnailUrl: media.thumbnailUrl,
          })),
          totalCount: uploadedMedia.length,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('파일 업로드 오류:', error);
      throw new BadRequestException(
        `파일 업로드 중 오류가 발생했습니다: ${error.message}`,
      );
    }
  }

  /**
   * 단일 파일 업로드 REST API
   * 편의를 위한 단일 파일 업로드 엔드포인트
   *
   * @param file 업로드할 파일
   * @param user 현재 인증된 사용자
   * @returns 업로드된 파일의 ID와 URL 정보
   */
  @Post('single')
  @UseGuards(GqlAuthGuard)
  @UseInterceptors(
    FilesInterceptor('file', 1, {
      storage: {
        destination: (req, file, cb) => {
          const uploadPath = join(process.cwd(), 'uploads/images');
          // 디렉토리 존재 확인 및 생성
          try {
            if (!existsSync(uploadPath)) {
              mkdirSync(uploadPath, { recursive: true });
            }
            cb(null, uploadPath);
          } catch (error) {
            cb(new Error(`디렉토리 생성 오류: ${error.message}`), '');
          }
        },
        filename: (req, file, callback) => {
          const uniqueSuffix = uuidv4();
          const ext = extname(file.originalname);
          const timestamp = Date.now();
          callback(null, `${timestamp}_${uniqueSuffix}${ext}`);
        },
      },
      fileFilter: (req, file, callback) => {
        const allowedMimeTypes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'image/webp',
          'video/mp4',
          'video/avi',
          'video/mov',
          'video/quicktime', // iOS에서 사용하는 MOV 타입
          'video/wmv',
          'application/octet-stream', // React Native에서 때때로 이 타입으로 전송됨
        ];

        // React Native에서 전송되는 파일은 때때로 다른 MIME 타입을 가질 수 있음
        // 파일 확장자로 추가 검증
        const allowedExtensions = [
          'jpg',
          'jpeg',
          'png',
          'gif',
          'webp',
          'mp4',
          'avi',
          'mov',
          'wmv',
        ];
        const fileExt = file.originalname.split('.').pop()?.toLowerCase();

        if (
          !allowedMimeTypes.includes(file.mimetype) &&
          (!fileExt || !allowedExtensions.includes(fileExt))
        ) {
          return callback(
            new BadRequestException(
              `지원되지 않는 파일 형식입니다(${file.mimetype}). 이미지 또는 비디오 파일만 업로드 가능합니다.`,
            ),
            false,
          );
        }

        // React Native에서 전송된 application/octet-stream 타입 파일의 경우 확장자로 타입 추론
        if (file.mimetype === 'application/octet-stream' && fileExt) {
          if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt)) {
            file.mimetype = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;
          } else if (['mp4', 'avi', 'mov', 'wmv'].includes(fileExt)) {
            file.mimetype = `video/${fileExt === 'mov' ? 'quicktime' : fileExt}`;
          }
        }

        callback(null, true);
      },
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB 제한
      },
    }),
  )
  async uploadSingleFile(
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: User,
    @Body() body: any,
  ) {
    console.log('단일 파일 업로드 요청 받음:', {
      hasFiles: !!files?.length,
      userId: user?.id,
      bodyParams: Object.keys(body || {}),
    });
    if (!files || files.length === 0) {
      throw new BadRequestException('업로드할 파일이 없습니다.');
    }

    const file = files[0];

    try {
      const uploadedMedia = await this.mediaService.createMediaFromFiles(
        [file],
        user.id,
      );

      const media = uploadedMedia[0];

      return {
        success: true,
        message: '파일이 성공적으로 업로드되었습니다.',
        data: {
          id: media.id,
          url: media.url,
          originalName: media.originalName,
          mimeType: media.mimeType,
          fileSize: media.fileSize,
          type: media.type,
          status: media.status,
          thumbnailUrl: media.thumbnailUrl,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('단일 파일 업로드 오류:', error);
      throw new BadRequestException(
        `파일 업로드 중 오류가 발생했습니다: ${error.message}`,
      );
    }
  }
}
