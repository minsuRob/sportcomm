import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Media } from '../../entities/media.entity';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { MediaResolver } from './media.resolver';
import { UploadScalar } from '../../common/scalars/upload.scalar';

/**
 * 미디어 모듈
 * 파일 업로드 및 미디어 관리 기능을 제공합니다.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Media])],
  controllers: [MediaController],
  providers: [MediaService, MediaResolver, UploadScalar],
  exports: [MediaService],
})
export class MediaModule {}
