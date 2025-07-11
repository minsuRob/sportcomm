import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from './post.entity';
import { PostVersion } from './post-version.entity';
import { PostsResolver } from './posts.resolver';
import { PostsService } from './posts.service';

/**
 * @description 게시물 관련 기능을 담당하는 모듈입니다.
 * @summary TypeORM을 통해 Post와 PostVersion 엔티티를 주입하고,
 * PostsResolver와 PostsService를 프로바이더로 등록합니다.
 * PostsService는 다른 모듈에서도 사용할 수 있도록 export합니다.
 */
@Module({
  imports: [
    // 이 모듈에서 사용할 리포지토리(Post, PostVersion)를 등록합니다.
    // 이렇게 하면 PostsService에서 @InjectRepository()를 사용하여
    // 해당 엔티티의 리포지토리를 주입받을 수 있습니다.
    TypeOrmModule.forFeature([Post, PostVersion]),
  ],
  // 프로바이더 배열에 리졸버와 서비스를 등록합니다.
  // NestJS의 DI(의존성 주입) 컨테이너가 이들의 인스턴스를 관리하게 됩니다.
  providers: [PostsResolver, PostsService],
  // PostsService를 다른 모듈에서 주입하여 사용할 수 있도록 export합니다.
  // 예를 들어, CommentsModule에서 게시물의 존재 여부를 확인할 때 PostsService가 필요합니다.
  exports: [PostsService],
})
export class PostsModule {}
