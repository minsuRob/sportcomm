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
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
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
 * 파일 업로드 및 미디어 관리 기능을 제공합니다.
 */
@Controller('media')
@UseGuards(GqlAuthGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  /**
   * 이미지 파일 업로드
   * 최대 4개의 이미지 파일을 업로드할 수 있습니다.
   */
  @Post('upload')
  @UseInterceptors(
    FilesInterceptor('files', 4, {
      storage: diskStorage({
        destination: './uploads/images',
        filename: (req, file, callback) => {
          const uniqueSuffix = uuidv4();
          const ext = extname(file.originalname);
          callback(null, `${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, callback) => {
        // 이미지 파일만 허용
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return callback(
            new BadRequestException('이미지 파일만 업로드 가능합니다.'),
            false,
          );
        }
        callback(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB 제한
      },
    }),
  )
  async uploadImages(
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: User,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('업로드할 파일이 없습니다.');
    }

    try {
      const uploadedMedia = await this.mediaService.createMediaFromFiles(
        files,
        user.id,
      );

      return {
        success: true,
        message: `${files.length}개의 파일이 성공적으로 업로드되었습니다.`,
        data: uploadedMedia,
      };
    } catch (error) {
      throw new BadRequestException(
        `파일 업로드 중 오류가 발생했습니다: ${error.message}`,
      );
    }
  }
}
