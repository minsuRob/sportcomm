import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentsResolver } from './comments.resolver';
import { CommentsService } from './comments.service';
import { Comment } from '../../entities/comment.entity';
import { Post } from '../../entities/post.entity';
import { ProgressModule } from '../progress/progress.module';

/**
 * 댓글 모듈
 *
 * 댓글 관련 기능을 제공하는 모듈입니다.
 * 댓글 생성, 조회, 수정, 삭제 등의 기능이 포함됩니다.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Comment, Post]),
    ProgressModule, // ProgressService를 사용하기 위해 import
  ],
  providers: [CommentsResolver, CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
