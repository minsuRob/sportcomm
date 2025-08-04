import {
  Controller,
  Post,
  Get,
  UploadedFiles,
  UseInterceptors,
  UseGuards,
  Body,
  BadRequestException,
  Res,
  Req,
  Logger,
  InternalServerErrorException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';
import { MediaService } from './media.service';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { existsSync, mkdirSync } from 'fs';
import { GqlAuthGuard } from 'src/common/guards/gql-auth.guard';
import { HttpAuthGuard } from 'src/common/guards/http-auth.guard';
// Multer 타입 정의 추가
import 'multer';

/**
 * 미디어 업로드 컨트롤러
 * REST API를 통한 파일 업로드 기능을 제공합니다.
 * GraphQL과 분리하여 파일 업로드만 처리합니다.
 * 웹과 React Native 클라이언트 모두 지원합니다.
 */
@Controller('upload')
export class MediaController {
  private readonly logger = new Logger(MediaController.name);

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
  @UseGuards(HttpAuthGuard)
  // 파일 업로드 요청 수신 시 로깅
  @UseInterceptors(
    FilesInterceptor('files', 4, {
      // Multer 설정 시작 로깅
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB 제한 (비디오 파일 고려)
        files: 4, // 최대 4개 파일
      },
      storage: diskStorage({
        destination: (req, file, cb) => {
          // 파일 타입에 따라 저장 경로 결정
          const isVideo = file.mimetype.startsWith('video/');
          const folderName = isVideo ? 'videos' : 'images';
          const uploadPath = join(process.cwd(), 'uploads', folderName);

          // 파일 수신 시 디버그 정보 출력
          console.log(
            `파일 저장 경로 설정 중: ${file.originalname}, 필드명: ${file.fieldname}, 크기: ${file.size || '알 수 없음'}, 타입: ${file.mimetype}, 폴더: ${folderName}`,
          );

          // 파일 데이터 확인 로깅
          console.log('업로드된 파일 데이터 확인:', {
            fieldname: file.fieldname,
            originalname: file.originalname,
            encoding: file.encoding,
            mimetype: file.mimetype,
            size: file.size,
            stream: typeof file.stream,
            buffer: file.buffer ? '버퍼 존재' : '버퍼 없음',
            destination: file.destination || '미설정',
            isVideo: isVideo,
            targetFolder: folderName,
          });

          // 디렉토리 존재 확인 및 생성
          try {
            if (!existsSync(uploadPath)) {
              mkdirSync(uploadPath, { recursive: true });
              console.log(`업로드 디렉토리 생성 완료: ${uploadPath}`);
            }
            cb(null, uploadPath);
          } catch (error) {
            console.error(`업로드 디렉토리 생성 실패: ${error.message}`);
            cb(error as Error, '');
          }
        },
        filename: (req, file, cb) => {
          try {
            // 안전한 파일명 생성
            const uniqueSuffix = `${Date.now()}-${Math.round(
              Math.random() * 1e9,
            )}`;
            // 파일 확장자 가져오기 (소문자로 변환)
            let fileExt = extname(file.originalname).toLowerCase();

            // 확장자가 없거나 비정상적인 경우 MIME 타입에서 유추
            if (!fileExt || fileExt === '.') {
              const mimeToExt = {
                'image/jpeg': '.jpg',
                'image/jpg': '.jpg',
                'image/png': '.png',
                'image/gif': '.gif',
                'image/webp': '.webp',
                'video/mp4': '.mp4',
                'video/quicktime': '.mov',
              };
              fileExt = mimeToExt[file.mimetype] || '.jpg';
              console.log(
                `확장자 누락 감지 - MIME 타입(${file.mimetype})에서 확장자(${fileExt}) 유추`,
              );
            }

            // 최종 파일명 생성 (UUID-원본파일명.확장자)
            const safeName = `${uuidv4()}-${uniqueSuffix}${fileExt}`;

            console.log(
              `파일명 생성 완료: ${file.originalname} -> ${safeName} (크기: ${file.size || '알 수 없음'})`,
            );
            cb(null, safeName);
          } catch (error) {
            console.error(`파일명 생성 실패: ${error.message}`);
            cb(error as Error, '');
          }
        },
      }),
      fileFilter: (req, file, callback) => {
        try {
          console.log(`파일 필터 검사 시작:`, {
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size || '크기 알 수 없음',
            fieldname: file.fieldname,
          });

          // 지원되는 MIME 타입 확인
          const allowedMimeTypes = [
            // 이미지
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            // 비디오
            'video/mp4',
            'video/quicktime', // MOV
            'video/x-msvideo', // AVI
            // React Native에서 전송될 수 있는 특별 타입들
            'application/octet-stream',
            'binary/octet-stream',
          ];

          // 파일 형식 유효성 검사
          if (!file || !file.mimetype) {
            console.error('파일 형식 오류: MIME 타입이 없음');
            return callback(
              new UnsupportedMediaTypeException(
                '지원되지 않는 파일 형식입니다.',
              ),
              false,
            );
          }

          // MIME 타입이 허용 목록에 없는 경우 확장자 기반 확인
          const fileExt = file.originalname.split('.').pop()?.toLowerCase();
          const allowedExtensions = [
            'jpg',
            'jpeg',
            'png',
            'gif',
            'webp',
            'mp4',
            'mov',
            'avi',
          ];

          // MIME 타입 또는 확장자 중 하나라도 유효하면 허용
          const hasValidMimeType = allowedMimeTypes.includes(file.mimetype);
          const hasValidExtension =
            fileExt && allowedExtensions.includes(fileExt);

          if (!hasValidMimeType && !hasValidExtension) {
            console.error(
              `파일 형식 오류: 허용되지 않은 형식 - MIME: ${file.mimetype}, 확장자: ${fileExt || '없음'}`,
            );
            return callback(
              new UnsupportedMediaTypeException(
                '지원되지 않는 파일 형식입니다. 이미지(JPEG, PNG, GIF, WebP) 또는 비디오(MP4, MOV, AVI) 파일만 업로드할 수 있습니다.',
              ),
              false,
            );
          }

          // 파일 크기 확인 (이미 Multer의 limits에서 처리하고 있지만 이중 검증)
          if (file.size && file.size > 50 * 1024 * 1024) {
            console.error(`파일 크기 오류: ${file.size}바이트 (최대 50MB)`);
            return callback(
              new PayloadTooLargeException(
                '파일 크기가 너무 큽니다. 최대 50MB까지 업로드할 수 있습니다.',
              ),
              false,
            );
          }

          // React Native에서 전송한 경우 MIME 타입 보정
          if (
            fileExt &&
            (file.mimetype === 'application/octet-stream' ||
              file.mimetype === 'binary/octet-stream') &&
            allowedExtensions.includes(fileExt)
          ) {
            console.log(
              `MIME 타입 보정: ${file.mimetype} -> ${fileExt} 기반으로 변경`,
            );
            // 올바른 MIME 타입으로 수정
            if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt)) {
              file.mimetype = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;
            } else if (['mp4', 'avi', 'mov', 'wmv'].includes(fileExt)) {
              file.mimetype = `video/${fileExt === 'mov' ? 'quicktime' : fileExt}`;
            }
          }

          console.log(
            `파일 필터 검사 통과: ${file.originalname}, 최종 MIME 타입: ${file.mimetype}`,
          );
          callback(null, true);
        } catch (error) {
          console.error(`파일 필터 처리 중 오류 발생: ${error.message}`);
          return callback(null, false);
        }
      },

      // React Native와의 호환성을 위한 Multer 설정
      preservePath: true,
    }),
  )
  async uploadFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: User,
    @Body() body: any,
    @Req() req: Request,
  ) {
    // 업로드 디버그 정보 추가
    console.log('요청 Content-Type:', req.headers['content-type']);
    console.log('요청 Content-Length:', req.headers['content-length']);
    console.log('요청 Origin:', req.headers['origin']);
    console.log('요청 User-Agent:', req.headers['user-agent']);
    try {
      // 요청 로깅 강화
      const requestId = uuidv4().substring(0, 8);
      this.logger.log(
        `\n======== 파일 업로드 요청 시작 (ID: ${requestId}) ========`,
      );
      this.logger.log(`요청 URL: ${req.url}`);
      this.logger.log(`요청 메서드: ${req.method}`);
      this.logger.log(`Content-Type: ${req.headers['content-type']}`);
      this.logger.log(`Content-Length: ${req.headers['content-length']}`);

      // 파일 정보 로깅
      this.logger.log('Multer files:', files ? `${files.length}개` : '없음');

      // 파일 세부 정보 로깅 (MIME 타입과 크기 확인)
      if (files && files.length > 0) {
        files.forEach((file, index) => {
          console.log(
            `파일 [${index}]: ${file.originalname}, 크기: ${file.size}바이트, 타입: ${file.mimetype}`,
          );

          // 0바이트 파일 경고
          if (file.size <= 0) {
            console.warn(
              `⚠️ 경고: 파일 ${file.originalname}의 크기가 ${file.size}바이트입니다. 처리 실패 가능성 높음.`,
            );
          }

          // 실제 파일 존재 여부 확인
          try {
            const fs = require('fs');
            const exists = fs.existsSync(file.path);
            const stats = exists ? fs.statSync(file.path) : null;
            console.log(
              `  - 파일시스템: 존재=${exists}, 크기=${stats ? stats.size : '알 수 없음'}바이트, 경로=${file.path}`,
            );
          } catch (err) {
            console.error(`  - 파일시스템 확인 실패:`, err);
          }
        });
      } else {
        this.logger.warn('업로드된 파일이 없습니다.');

        // 헤더 정보 로깅
        const headerInfo = this.getHeadersInfo(req);
        this.logger.log('헤더 정보:', headerInfo);

        // 요청 본문 정보 로깅 (파일 필드 존재 여부 확인)
        const bodyKeys = Object.keys(req.body || {});
        this.logger.log('요청 본문 필드:', bodyKeys);

        // multer 멀티파트 폼 데이터 분석 문제 진단
        const isMultipartRequest =
          req.headers['content-type']?.includes('multipart/form-data') || false;

        console.error('파일 없음 오류 발생. 상세 분석:', {
          bodyKeys: Object.keys(req.body || {}),
          filesObject: req['files'] ? '존재함' : '없음',
          filesCount: req['files']?.length,
          contentType: req.headers['content-type'],
          isMultipartRequest: isMultipartRequest,
          hasFilesField: 'files' in req.body || 'files' in req,
        });

        // 폼데이터에 files 필드가 있지만 내용이 없는 경우 확인
        if (req.body && 'files' in req.body) {
          console.log(
            'files 필드가 존재하지만 유효한 파일이 아님:',
            req.body.files,
          );
        }

        throw new BadRequestException({
          message: '업로드할 파일이 없습니다.',
          details:
            '멀티파트 폼에 유효한 파일 필드가 포함되어 있는지 확인하세요.',
          error: 'NO_FILES_UPLOADED',
        });
      }

      if (files.length > 4) {
        throw new BadRequestException(
          '최대 4개의 파일만 업로드할 수 있습니다.',
        );
      }

      console.log(
        '파일 정보:',
        files.map((f) => ({
          originalname: f.originalname,
          mimetype: f.mimetype,
          size: f.size,
          path: f.path?.substring(0, 50) + '...',
        })),
      );

      this.logger.log(
        `파일 업로드 처리 시작: ${files.length}개 파일, 사용자 ID: ${user?.id}`,
      );

      // 파일 유효성 검증
      let validFiles = files;

      // 크기가 너무 작은 파일(0바이트 또는 손상된 파일) 필터링
      if (validFiles.some((file) => file.size <= 0)) {
        this.logger.warn(
          '파일 크기가 0인 파일이 발견되었습니다. 필터링합니다.',
        );
        validFiles = validFiles.filter((file) => {
          const isValid = file.size > 0;
          if (!isValid) {
            this.logger.warn(
              `유효하지 않은 파일 건너뜀: ${file.originalname}, 크기: ${file.size}바이트`,
            );
          }
          return isValid;
        });
      }

      // 유효한 파일이 없는 경우 처리
      if (validFiles.length === 0) {
        throw new BadRequestException(
          '처리 가능한 유효한 파일이 없습니다. 파일이 손상되었거나 지원되지 않는 형식입니다.',
        );
      }

      // 파일 확장자 검사
      validFiles.forEach((file) => {
        const ext = file.originalname.split('.').pop()?.toLowerCase();
        this.logger.log(
          `파일 ${file.originalname} 검사: 확장자 ${ext}, 크기 ${file.size}바이트`,
        );
      });

      // 예외 처리를 포함하여 미디어 생성
      const uploadedMedia = await this.mediaService
        .createMediaFromFiles(validFiles, user.id)
        .catch((error) => {
          this.logger.error(`미디어 생성 실패: ${error.message}`, error.stack);
          throw new BadRequestException(
            `파일 처리 중 오류가 발생했습니다: ${error.message}`,
          );
        });

      if (!uploadedMedia || uploadedMedia.length === 0) {
        throw new BadRequestException(
          '파일 업로드에 실패했습니다. 파일 형식을 확인해주세요.',
        );
      }

      this.logger.log('업로드 완료:', {
        mediaCount: uploadedMedia.length,
        firstMediaId: uploadedMedia[0]?.id,
        mediaStatus: uploadedMedia.map((m) => m.status),
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
      this.logger.error('파일 업로드 오류:', error);
      this.logger.error('오류 세부정보:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
      });

      // 오류 유형에 따른 적절한 예외 처리
      if (error instanceof BadRequestException) {
        throw error; // 이미 BadRequestException인 경우 그대로 전달
      } else if (
        error.message?.includes('unsupported image format') ||
        error.message?.includes('지원되지 않는 이미지 형식')
      ) {
        throw new UnsupportedMediaTypeException(
          '지원되지 않는 이미지 형식입니다. JPG, PNG, GIF, WebP 형식만 지원합니다.',
        );
      } else if (error.message?.includes('File too large')) {
        throw new PayloadTooLargeException(
          '파일 크기가 너무 큽니다. 최대 50MB까지 업로드 가능합니다.',
        );
      } else if (error.status === 413) {
        throw new PayloadTooLargeException('파일 크기가 너무 큽니다.');
      } else if (error.status === 415) {
        throw new UnsupportedMediaTypeException(
          '지원되지 않는 파일 형식입니다.',
        );
      } else {
        throw new BadRequestException({
          message: `파일 업로드 중 오류가 발생했습니다: ${error.message}`,
          error: error.name || 'UPLOAD_ERROR',
          statusCode: 400,
        });
      }
    } finally {
      this.logger.log(`파일 업로드 요청 처리 완료`);
    }
  }

  /**
   * 단일 파일 업로드 REST API
   * 하나의 이미지/비디오 파일을 업로드할 수 있습니다.
   */
  @Post('single')
  @UseGuards(HttpAuthGuard)
  @UseInterceptors(
    FilesInterceptor('files', 1, {
      storage: diskStorage({
        destination: (req, file, cb) => {
          // 파일 타입에 따라 저장 경로 결정
          const isVideo = file.mimetype.startsWith('video/');
          const folderName = isVideo ? 'videos' : 'images';
          const uploadPath = join(process.cwd(), 'uploads', folderName);

          console.log(
            `단일 파일 업로드 - 저장 경로: ${uploadPath} (타입: ${file.mimetype})`,
          );

          // 디렉토리 존재 확인 및 생성
          try {
            if (!existsSync(uploadPath)) {
              mkdirSync(uploadPath, { recursive: true });
              console.log(`업로드 디렉토리 생성 완료: ${uploadPath}`);
            }
            cb(null, uploadPath);
          } catch (error) {
            console.error(`업로드 디렉토리 생성 실패: ${error.message}`);
            cb(error as Error, '');
          }
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          // 파일 확장자 가져오기 (소문자로 변환)
          let fileExt = extname(file.originalname).toLowerCase();

          // 확장자가 없는 경우 MIME 타입에서 유추
          if (!fileExt || fileExt === '.') {
            const mimeToExt = {
              'image/jpeg': '.jpg',
              'image/jpg': '.jpg',
              'image/png': '.png',
              'image/gif': '.gif',
              'image/webp': '.webp',
              'video/mp4': '.mp4',
              'video/quicktime': '.mov',
            };
            fileExt = mimeToExt[file.mimetype] || '.jpg';
          }

          const fileName = `${uniqueSuffix}${fileExt}`;
          console.log(
            `단일 파일 업로드 - 파일명 생성: ${file.originalname} -> ${fileName} (크기: ${file.size || '알 수 없음'})`,
          );
          cb(null, fileName);
        },
      }),
      fileFilter: (req, file, callback) => {
        const allowedMimeTypes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'video/mp4',
        ];
        if (!allowedMimeTypes.includes(file.mimetype)) {
          return callback(
            new UnsupportedMediaTypeException('지원되지 않는 파일 형식입니다.'),
            false,
          );
        }
        return callback(null, true);
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
      this.logger.error('파일 업로드 오류:', error);
      this.logger.error('오류 세부정보:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
      });

      // 오류 유형에 따른 적절한 예외 처리
      if (
        error.message?.includes('unsupported image format') ||
        error.message?.includes('지원되지 않는 이미지 형식')
      ) {
        throw new UnsupportedMediaTypeException(
          '지원되지 않는 이미지 형식입니다. JPG, PNG, GIF, WebP 형식만 지원합니다.',
        );
      } else if (error.message?.includes('File too large')) {
        throw new PayloadTooLargeException(
          '파일 크기가 너무 큽니다. 최대 50MB까지 업로드 가능합니다.',
        );
      } else if (error instanceof BadRequestException) {
        throw error; // 기존 BadRequestException은 그대로 전달
      } else if (error.status === 413) {
        throw new PayloadTooLargeException('파일 크기가 너무 큽니다.');
      } else if (error.status === 415) {
        throw new UnsupportedMediaTypeException(
          '지원되지 않는 파일 형식입니다.',
        );
      } else if (error.name === 'Error' && error.message.includes('Sharp')) {
        // Sharp 라이브러리 관련 오류
        throw new BadRequestException(
          '이미지 처리 중 오류가 발생했습니다. 다른 이미지를 사용해보세요.',
        );
      } else {
        // 기타 모든 오류
        throw new BadRequestException({
          message: `파일 업로드 중 오류가 발생했습니다: ${error.message}`,
          error: error.name,
          statusCode: 400,
        });
      }
    } finally {
      this.logger.log(`파일 업로드 요청 처리 완료`);
    }
  }

  /**
   * 프로필 이미지 업로드 전용 엔드포인트
   * 단일 이미지 파일만 업로드할 수 있습니다.
   *
   * @param file 업로드할 프로필 이미지 파일
   * @param user 현재 인증된 사용자
   * @returns 업로드된 미디어 엔티티 정보
   */
  @Post('profile-image')
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

  /**
   * 파일 업로드 테스트를 위한 엔드포인트
   * 업로드 기능이 제대로 작동하는지 확인하기 위한 간단한 HTML 폼을 반환합니다.
   * @param res Express 응답 객체
   */
  @Get('test')
  async testUploadForm(@Res() res: Response) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>파일 업로드 테스트</title>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            h1 { color: #333; }
            form { background: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
            .form-group { margin-bottom: 15px; }
            label { display: block; margin-bottom: 5px; }
            input[type="file"] { display: block; }
            button { background: #4CAF50; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer; }
            button:hover { background: #45a049; }
            pre { background: #f1f1f1; padding: 10px; border-radius: 4px; overflow-x: auto; }
            .response-area { margin-top: 20px; border: 1px solid #ddd; padding: 10px; border-radius: 4px; min-height: 100px; }
          </style>
        </head>
        <body>
          <h1>파일 업로드 테스트</h1>

          <form id="uploadForm" enctype="multipart/form-data">
            <div class="form-group">
              <label for="files">파일 선택 (최대 4개):</label>
              <input type="file" id="files" name="files" multiple accept="image/*,video/*" />
            </div>
            <div class="form-group">
              <label for="token">인증 토큰 (JWT):</label>
              <input type="text" id="token" name="token" style="width: 100%" placeholder="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." />
            </div>
            <button type="submit">업로드</button>
          </form>

          <h3>응답 결과:</h3>
          <div class="response-area">
            <pre id="response">여기에 응답이 표시됩니다.</pre>
          </div>

          <script>
            document.getElementById('uploadForm').addEventListener('submit', async function(e) {
              e.preventDefault();

              const fileInput = document.getElementById('files');
              const tokenInput = document.getElementById('token').value;
              const responseArea = document.getElementById('response');

              if (fileInput.files.length === 0) {
                responseArea.textContent = '오류: 파일을 선택해주세요.';
                return;
              }

              const formData = new FormData();
              for (let i = 0; i < fileInput.files.length; i++) {
                formData.append('files', fileInput.files[i]);
              }

              try {
                responseArea.textContent = '업로드 중...';

                const response = await fetch('/api/upload', {
                  method: 'POST',
                  headers: tokenInput ? {
                    'Authorization': tokenInput.startsWith('Bearer ') ? tokenInput : 'Bearer ' + tokenInput
                  } : {},
                  body: formData
                });

                const result = await response.json();
                responseArea.textContent = JSON.stringify(result, null, 2);
              } catch (error) {
                responseArea.textContent = '오류 발생: ' + error.message;
              }
            });
          </script>
        </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }

  /**
   * 요청 헤더 정보를 로깅에 적합한 형태로 변환
   * @param req Express 요청 객체
   * @returns 헤더 정보 객체
   */
  private getHeadersInfo(req: Request): Record<string, any> {
    const headerInfo = {
      contentType: req.headers['content-type'],
      contentLength: req.headers['content-length'],
      hasAuth: !!req.headers['authorization'],
      origin: req.headers['origin'],
      referer: req.headers['referer'],
      userAgent: req.headers['user-agent'],
      boundary: req.headers['content-type']?.includes('boundary=')
        ? req.headers['content-type']?.split('boundary=')[1]
        : 'boundary not found',
    };

    return headerInfo;
  }
}
