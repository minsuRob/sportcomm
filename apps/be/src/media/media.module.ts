import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Media } from './media.entity';
import { MediaResolver } from './media.resolver';
import { MediaService } from './media.service';
import { PostsModule } from '../posts/posts.module';

/**
 * @description 미디어(이미지, 비디오) 파일 관련 기능을 담당하는 모듈입니다.
 * @summary TypeORM을 통해 Media 엔티티를 주입하고, MediaResolver와 MediaService를 프로바이더로 등록합니다.
 * 미디어가 첨부될 게시물의 유효성 검사를 위해 PostsModule을 임포트합니다.
 */
@Module({
  imports: [
    // 이 모듈에서 사용할 Media 리포지토리를 등록합니다.
    TypeOrmModule.forFeature([Media]),
    // 미디어를 첨부할 게시물이 존재하는지 확인하기 위해 PostsModule을 임포트합니다.
    PostsModule,
  ],
  // 리졸버와 서비스를 프로바이더로 등록합니다.
  providers: [MediaResolver, MediaService],
  // MediaService는 게시물 생성 등 다른 서비스에서 함께 사용될 수 있으므로 export합니다.
  exports: [MediaService],
})
export class MediaModule {}
