import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bookmark } from '../../entities/bookmark.entity';
import { Post } from '../../entities/post.entity';
import { BookmarkService } from './bookmark.service';
import { BookmarkResolver } from './bookmark.resolver';

/**
 * 북마크 모듈
 *
 * 북마크 기능과 관련된 모든 컴포넌트를 관리합니다.
 * - 북마크 추가/제거
 * - 사용자별 북마크 목록 조회
 * - 북마크 상태 확인
 */
@Module({
  imports: [TypeOrmModule.forFeature([Bookmark, Post])],
  providers: [BookmarkService, BookmarkResolver],
  exports: [BookmarkService],
})
export class BookmarkModule {}
