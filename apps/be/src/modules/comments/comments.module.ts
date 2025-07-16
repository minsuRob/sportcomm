import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentsService } from './comments.service';
import { CommentsResolver } from './comments.resolver';
import { Comment } from '../../entities/comment.entity';
import { CommentVersion } from '../../entities/comment-version.entity';

/**
 * 댓글 모듈
 *
 * 댓글과 관련된 모든 기능을 제공합니다.
 * 댓글 CRUD 작업, 검색, 통계, 버전 관리 등의 기능을 포함합니다.
 *
 * 구성 요소:
 * - CommentsService: 댓글 비즈니스 로직
 * - CommentsResolver: GraphQL 리졸버
 * - Comment Entity: 댓글 엔티티
 * - CommentVersion Entity: 댓글 버전 엔티티
 */
@Module({
  imports: [
    // 댓글 관련 엔티티를 위한 TypeORM 모듈
    TypeOrmModule.forFeature([Comment, CommentVersion]),
  ],

  // 서비스 및 리졸버 제공
  providers: [
    CommentsService,
    CommentsResolver,
  ],

  // 다른 모듈에서 사용할 수 있도록 내보내기
  exports: [
    CommentsService,
  ],
})
export class CommentsModule {
  constructor() {
    // 모듈 초기화 시 로그 출력 (개발 환경에서만)
    if (process.env.NODE_ENV === 'development') {
      console.log('📝 댓글 모듈이 성공적으로 초기화되었습니다.');
    }
  }
}