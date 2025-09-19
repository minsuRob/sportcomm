import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { PostsService } from './posts.service';
import { MediaModule } from '../media/media.module';
import { BookmarkModule } from '../bookmarks/bookmark.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PostsResolver } from './posts.resolver';
import { Post } from '../../entities/post.entity';
import { PostVersion } from '../../entities/post-version.entity';
import { PostLike } from '../../entities/post-like.entity';
import { Tag } from '../../entities/tag.entity';
import { PostTag } from '../../entities/post-tag.entity';
import { Media } from '../../entities/media.entity';
import { User } from '../../entities/user.entity';
import { Notification } from '../../entities/notification.entity';
import { UserTeam } from '../../entities/user-team.entity';
import { ProgressModule } from '../progress/progress.module';

// Command Handlers
import { CreatePostHandler } from './commands/handlers/create-post.handler';

// Query Handlers
import { GetPostsHandler } from './queries/handlers/get-posts.handler';

// Event Handlers
import { PostCreatedHandler } from './events/handlers/post-created.handler';

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
    // CQRS 모듈
    CqrsModule,

    // 게시물 관련 엔티티를 위한 TypeORM 모듈
    TypeOrmModule.forFeature([
      Post,
      PostVersion,
      PostLike,
      Tag,
      PostTag,
      Media,
      User,
      Notification,
      UserTeam,
    ]),

    // 미디어 관련 기능 사용을 위한 MediaModule 가져오기
    MediaModule,
    // 북마크 관련 기능 사용을 위한 BookmarkModule 가져오기
    BookmarkModule,
    // 알림 기능 사용을 위한 NotificationsModule 가져오기
    NotificationsModule,
    ProgressModule,
  ],

  // 서비스, 리졸버, CQRS 핸들러 제공
  providers: [
    PostsService,
    PostsResolver,

    // Command Handlers
    CreatePostHandler,

    // Query Handlers
    GetPostsHandler,

    // Event Handlers
    PostCreatedHandler,
  ],

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
