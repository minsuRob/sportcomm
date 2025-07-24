import { Module, CacheModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from '../../entities/post.entity';
import { User } from '../../entities/user.entity';
import { SearchService } from './search.service';
import { SearchResolver } from './search.resolver';

/**
 * 검색 모듈
 *
 * 게시물 및 사용자 검색 기능을 제공합니다.
 * 인기순, 최신순, 관련성순 검색이 가능하며 결과 캐싱을 지원합니다.
 */
@Module({
  imports: [
    // 검색에 필요한 엔티티 등록
    TypeOrmModule.forFeature([Post, User]),

    // 검색 결과 캐싱 (TTL: 10분)
    CacheModule.register({
      ttl: 600, // 10분
    }),
  ],
  providers: [SearchService, SearchResolver],
  exports: [SearchService],
})
export class SearchModule {}
