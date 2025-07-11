import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comment } from './comment.entity';
import { CommentsResolver } from './comments.resolver';
import { CommentsService } from './comments.service';
import { PostsModule } from '../posts/posts.module';

/**
 * @description 댓글 관련 기능을 담당하는 모듈입니다.
 * @summary TypeORM을 통해 Comment 엔티티를 주입하고, CommentsResolver와 CommentsService를 프로바이더로 등록합니다.
 * PostsModule을 import하여 게시물의 존재 여부 등을 확인할 수 있도록 합니다.
 */
@Module({
  imports: [
    // TypeOrmModule.forFeature()를 사용하여 이 모듈에서 사용할 Comment 리포지토리를 등록합니다.
    TypeOrmModule.forFeature([Comment]),
    // 댓글 생성 시 게시물의 유효성을 검사하기 위해 PostsModule을 임포트합니다.
    // 이를 통해 PostsService를 주입받아 사용할 수 있습니다.
    PostsModule,
  ],
  // 리졸버와 서비스를 프로바이더로 등록하여 NestJS DI 컨테이너가 관리하도록 합니다.
  providers: [CommentsResolver, CommentsService],
  // CommentsService는 주로 내부적으로 사용되므로, 다른 모듈에서 직접 사용할 필요가 없다면 export 하지 않습니다.
})
export class CommentsModule {}
