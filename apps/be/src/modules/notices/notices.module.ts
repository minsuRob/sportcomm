import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notice } from '../../entities/notice.entity';
import { NoticesService } from './notices.service';
import { NoticesResolver } from './notices.resolver';

/**
 * NoticesModule
 *
 * 간단한 공지(Notice) 도메인 모듈.
 * - 관리자(ADMIN) 전용 CRUD 제공 (Resolver/Service 에서 권한 검사)
 * - 공개(사용자) 쿼리: 단건 조회, 목록 조회, 하이라이트(배너) 1건 조회
 *
 * 구성 요소:
 * - NoticesService: 비즈니스 로직 (생성/수정/삭제/조회)
 * - NoticesResolver: GraphQL Query & Mutation 정의
 *
 * 최소 구현 원칙:
 * - 복잡한 CQRS / 이벤트 처리 제외
 * - 트래픽/기능 확장이 필요해질 때 확장 (검색/태그/다국어 등)
 */
@Module({
  imports: [
    // Notice 엔티티 등록
    TypeOrmModule.forFeature([Notice]),
  ],
  providers: [NoticesService, NoticesResolver],
  exports: [NoticesService],
})
export class NoticesModule {
  constructor() {
    if (process.env.NODE_ENV === 'development') {
      console.log('📰 NoticesModule 초기화');
    }
  }
}

/**
 * 공지 모듈 활성화
 * - 서비스/리졸버 등록 완료
 * - FE: highlightNotice / notices / notice 쿼리 사용
 * - AppModule 에 이미 NoticesModule import 완료
 */
