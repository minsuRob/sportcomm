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
@Controller('upload')
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
          const uploadPath = join(process.cwd(), 'uploads/images');
          // 파일 수신 시 디버그 정보 출력
          console.log(
            `파일 저장 경로 설정 중: ${file.originalname}, 필드명: ${file.fieldname}, 크기: ${file.size || '알 수 없음'}`,
          );
          // 디렉토리 존재 확인 및 생성
          try {
            if (!existsSync(uploadPath)) {
              mkdirSync(uploadPath, { recursive: true });
              console.log(`업로드 디렉토리 생성 완료: ${uploadPath}`);
            }
            cb(null, uploadPath);
          } catch (error) {
            console.error(`업로드 디렉토리 생성 오류: ${error.message}`, error);
            cb(new Error(`디렉토리 생성 오류: ${error.message}`), '');
          }
        },
        filename: (req, file, callback) => {
          const uniqueSuffix = uuidv4();
          const ext = extname(file.originalname);
          const timestamp = Date.now();
          const filename = `${timestamp}_${uniqueSuffix}${ext}`;
          console.log(
            `파일 이름 생성: ${filename} (원본: ${file.originalname})`,
          );
          callback(null, filename);
        },
      }),
      fileFilter: (req, file, callback) => {
        // 파일 필터링 시작 시 로깅
        console.log(
          `파일 필터링: ${file.originalname}, MIME 타입: ${file.mimetype}`,
        );

        // 이미지 및 비디오 파일 허용
        console.log(
          `파일 타입 검사 시작: ${file.mimetype}, 파일명: ${file.originalname}`,
        );

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
          'binary/octet-stream', // 또 다른 가능한 타입
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
          console.log(
            `파일 타입 거부: ${file.mimetype}, 확장자: ${fileExt || '없음'}`,
          );
          return callback(
            new BadRequestException(
              `지원되지 않는 파일 형식입니다(${file.mimetype}). 이미지(jpg, png, gif, webp) 또는 비디오(mp4, avi, mov, wmv) 파일만 업로드 가능합니다.`,
            ),
            false,
          );
        }

        // React Native에서 전송된 application/octet-stream 타입 파일의 경우 확장자로 타입 추론
        if (
          (file.mimetype === 'application/octet-stream' ||
            file.mimetype === 'binary/octet-stream') &&
          fileExt
        ) {
          console.log(
            `octet-stream 파일 타입 추론 시작: 확장자 ${fileExt} 분석`,
          );
          if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt)) {
            const newMimeType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;
            console.log(`MIME 타입 변경: ${file.mimetype} -> ${newMimeType}`);
            file.mimetype = newMimeType;
          } else if (['mp4', 'avi', 'mov', 'wmv'].includes(fileExt)) {
            const newMimeType = `video/${fileExt === 'mov' ? 'quicktime' : fileExt}`;
            console.log(`MIME 타입 변경: ${file.mimetype} -> ${newMimeType}`);
            file.mimetype = newMimeType;
          }
        }

        console.log(
          `파일 ${file.originalname} 승인됨, 최종 MIME 타입: ${file.mimetype}`,
        );
        callback(null, true);
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
    // 요청 로깅 강화
    const requestId = uuidv4().substring(0, 8);
    console.log(`\n======== 파일 업로드 요청 시작 (ID: ${requestId}) ========`);
    console.log(`요청 URL: ${req.url}`);
    console.log(`요청 메서드: ${req.method}`);
    console.log(`Content-Type: ${req.headers['content-type']}`);
    console.log(`Content-Length: ${req.headers['content-length']}`);

    // 파일 정보 로깅
    console.log('Multer files:', files ? `${files.length}개` : '없음');

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
        } catch (e) {
          console.error(`  - 파일시스템 확인 실패: ${e.message}`);
        }
      });
    }

    // 원본 요청 body를 콘솔에 출력
    try {
      console.log('원본 요청 데이터:');
      if (req.body && typeof req.body === 'object') {
        for (const key in req.body) {
          console.log(`[${key}]`, typeof req.body[key], req.body[key]);
        }
      }
    } catch (e) {
      console.error('요청 바디 로깅 중 오류:', e);
    }

    console.log('파일 업로드 요청 받음:', {
      fileCount: files?.length || 0,
      userId: user?.id,
      bodyParams: Object.keys(body || {}),
      bodyValues: body,
      filesInfo: files
        ? files.map((f) => ({
            fieldname: f.fieldname,
            originalname: f.originalname,
            size: f.size,
            mimetype: f.mimetype,
          }))
        : [],
      hasFiles: !!files && files.length > 0,
      reqHeaders: this.getHeadersInfo(req),
      authHeader: user ? '인증 토큰 있음' : '인증 토큰 없음',
    });

    // 파일 데이터 유효성 검사 강화
    console.log('업로드 파일 검증:');
    console.log('- files 변수 타입:', typeof files);
    console.log('- files 변수 존재:', !!files);
    console.log('- files length:', files?.length);

    // 파일 누락 처리
    if (!files || files.length === 0) {
      // multipart/form-data 요청인지 확인
      const isMultipartRequest = req.headers['content-type']?.includes(
        'multipart/form-data',
      );

      // 원본 요청 분석을 위한 추가 로깅
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
        details: '멀티파트 폼에 유효한 파일 필드가 포함되어 있는지 확인하세요.',
        error: 'NO_FILES_UPLOADED',
      });
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
      // 파일 유효성 검증
      let validFiles = files;

      // 크기가 너무 작은 파일(0바이트 또는 손상된 파일) 필터링
      if (validFiles.some((file) => file.size <= 0)) {
        console.warn('파일 크기가 0인 파일이 발견되었습니다. 필터링합니다.');
        validFiles = validFiles.filter((file) => {
          const isValid = file.size > 0;
          if (!isValid) {
            console.warn(
              `유효하지 않은 파일 건너뜀: ${file.originalname}, 크기: ${file.size}바이트`,
            );
          }
          return isValid;
        });
      }

      // 파일 확장자 검사
      validFiles.forEach((file) => {
        const ext = file.originalname.split('.').pop()?.toLowerCase();
        console.log(
          `파일 ${file.originalname} 검사: 확장자 ${ext}, 크기 ${file.size}바이트`,
        );
      });

      const uploadedMedia = await this.mediaService.createMediaFromFiles(
        validFiles,
        user.id,
      );

      console.log('업로드 완료:', {
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
      console.error('파일 업로드 오류:', error);
      console.error('오류 세부정보:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
      });
      throw new BadRequestException({
        message: `파일 업로드 중 오류가 발생했습니다: ${error.message}`,
        error: error.name,
        statusCode: 400,
      });
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
  @UseGuards(HttpAuthGuard)
  @UseInterceptors(
    FilesInterceptor('file', 1, {
      // 단일 파일 업로드 설정

      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = join(process.cwd(), 'uploads/images');
          // 디렉토리 존재 확인 및 생성
          try {
            if (!existsSync(uploadPath)) {
              mkdirSync(uploadPath, { recursive: true });
              console.log(
                `단일 파일 업로드 - 업로드 디렉토리 생성 완료: ${uploadPath}`,
              );
            }
            cb(null, uploadPath);
          } catch (error) {
            console.error(
              `단일 파일 업로드 - 디렉토리 생성 오류: ${error.message}`,
              error,
            );
            cb(new Error(`디렉토리 생성 오류: ${error.message}`), '');
          }
        },
        filename: (req, file, callback) => {
          const uniqueSuffix = uuidv4();
          const ext = extname(file.originalname);
          const timestamp = Date.now();
          callback(null, `${timestamp}_${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, callback) => {
        console.log(
          `단일 파일 필터링: ${file.originalname}, ${file.mimetype}, ${file.size || '크기 알 수 없음'}`,
        );

        // 0바이트 파일 거부
        if (file.size === 0) {
          return callback(
            new BadRequestException('0바이트 파일은 업로드할 수 없습니다.'),
            false,
          );
        }

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
      console.error('오류 세부정보:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
      });
      throw new BadRequestException({
        message: `파일 업로드 중 오류가 발생했습니다: ${error.message}`,
        error: error.name,
        statusCode: 400,
        path: '/api/upload/single',
      });
    }
  }

  /**
   * 파일 업로드 테스트를 위한 엔드포인트
   * 업로드 기능이 제대로 작동하는지 확인하기 위한 간단한 HTML 폼을 반환합니다.
   * @param res Express 응답 객체
   */
  @Get('test')
  testUploadForm(@Res() res: Response) {
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
