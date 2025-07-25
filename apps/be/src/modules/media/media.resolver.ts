import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GraphQLUpload } from '../../common/scalars/upload.scalar';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';
import { Media } from '../../entities/media.entity';
import { MediaService } from './media.service';
import { createWriteStream } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ensureDir } from 'fs-extra';

// FileUpload 타입 직접 정의
interface FileUpload {
  filename: string;
  mimetype: string;
  encoding: string;
  createReadStream: () => NodeJS.ReadableStream;
}

/**
 * 미디어 GraphQL 리졸버
 * GraphQL을 통한 파일 업로드 기능을 제공합니다.
 */
@Resolver(() => Media)
@UseGuards(GqlAuthGuard)
export class MediaResolver {
  constructor(private readonly mediaService: MediaService) {}

  /**
   * 파일 업로드 뮤테이션
   * 여러 파일을 동시에 업로드할 수 있습니다.
   *
   * @param user 현재 인증된 사용자
   * @param files 업로드할 파일들
   * @returns 업로드된 미디어 엔티티 배열
   */
  @Mutation(() => [Media], { description: '파일 업로드' })
  async uploadFiles(
    @CurrentUser() user: User,
    @Args({ name: 'files', type: () => [GraphQLUpload] }) files: FileUpload[],
  ): Promise<Media[]> {
    if (!files || files.length === 0) {
      throw new Error('업로드할 파일이 없습니다.');
    }

    if (files.length > 4) {
      throw new Error('최대 4개의 파일만 업로드할 수 있습니다.');
    }

    const uploadDir = join(process.cwd(), 'uploads', 'images');
    await ensureDir(uploadDir);

    const uploadedFiles: Express.Multer.File[] = [];

    try {
      // 각 파일을 처리
      for (const filePromise of files) {
        const file = await filePromise;
        const { createReadStream, filename, mimetype, encoding } = file;

        // 파일 타입 검증
        if (!mimetype.startsWith('image/')) {
          throw new Error(`${filename}: 이미지 파일만 업로드 가능합니다.`);
        }

        // 고유한 파일명 생성
        const uniqueFilename = `${uuidv4()}_${filename}`;
        const filepath = join(uploadDir, uniqueFilename);

        // 파일 스트림 생성 및 저장
        const stream = createReadStream();
        const writeStream = createWriteStream(filepath);

        await new Promise<void>((resolve, reject) => {
          stream.pipe(writeStream);
          writeStream.on('finish', () => resolve());
          writeStream.on('error', reject);
        });

        // 파일 정보 수집
        const stats = require('fs').statSync(filepath);

        uploadedFiles.push({
          fieldname: 'files',
          originalname: filename,
          encoding,
          mimetype,
          destination: uploadDir,
          filename: uniqueFilename,
          path: filepath,
          size: stats.size,
        } as Express.Multer.File);
      }

      // 미디어 엔티티 생성
      const mediaEntities = await this.mediaService.createMediaFromFiles(
        uploadedFiles,
        user.id,
      );

      return mediaEntities;
    } catch (error) {
      // 업로드 실패 시 생성된 파일들 정리
      for (const uploadedFile of uploadedFiles) {
        try {
          require('fs').unlinkSync(uploadedFile.path);
        } catch (cleanupError) {
          console.error('파일 정리 실패:', cleanupError);
        }
      }

      console.error('파일 업로드 실패:', error);
      throw new Error(error.message || '파일 업로드 중 오류가 발생했습니다.');
    }
  }

  /**
   * 단일 파일 업로드 뮤테이션
   * 편의를 위한 단일 파일 업로드 메서드
   *
   * @param user 현재 인증된 사용자
   * @param file 업로드할 파일
   * @returns 업로드된 미디어 엔티티
   */
  @Mutation(() => Media, { description: '단일 파일 업로드' })
  async uploadFile(
    @CurrentUser() user: User,
    @Args({ name: 'file', type: () => GraphQLUpload }) file: FileUpload,
  ): Promise<Media> {
    const result = await this.uploadFiles(user, [file]);
    return result[0];
  }
}
