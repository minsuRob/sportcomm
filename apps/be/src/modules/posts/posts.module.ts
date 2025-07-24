import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostsService } from './posts.service';
import { MediaModule } from '../media/media.module';
import { PostsResolver } from './posts.resolver';
import { Post } from '../../entities/post.entity';
import { PostVersion } from '../../entities/post-version.entity';
import { PostLike } from '../../entities/post-like.entity';
import { Media } from '../../entities/media.entity';

/**
 * 게시물 모듈
 *
 * 게시물과 관련된 모든 기능을 제공합니다.
 * 게시물 CRUD 작업, 검색, 통계, 버전 관리 등의 기능을 포함합니다.
 *
 * 구성 요소:
 * - PostsService: 게시물 비즈니스 로직
 * - PostsResolver: GraphQL 리졸버
 * - Post Entity: 게시물 엔티티
 * - PostVersion Entity: 게시물 버전 엔티티
 */
@Module({
  imports: [
    // 게시물 관련 엔티티를 위한 TypeORM 모듈
    TypeOrmModule.forFeature([Post, PostVersion, PostLike, Media]),
    // 미디어 관련 기능 사용을 위한 MediaModule 가져오기
    MediaModule,
  ],

  // 서비스 및 리졸버 제공
  providers: [PostsService, PostsResolver],

  // 다른 모듈에서 사용할 수 있도록 내보내기
  exports: [PostsService],
})
export class PostsModule {
  constructor() {
    // 모듈 초기화 시 로그 출력 (개발 환경에서만)
    if (process.env.NODE_ENV === 'development') {
      console.log('📝 게시물 모듈이 성공적으로 초기화되었습니다.');
    }
  }
}
