import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PointTransaction, User } from '../../entities';
import { PointsResolver } from './points.resolver';

/**
 * PointsModule
 *
 * 포인트 트랜잭션(적립/차감) 조회 및 관리자 수동 조정 기능을 제공하는 GraphQL 리졸버를 구성하는 모듈입니다.
 *
 * 포함 기능:
 * - getMyPointTransactions: 현재 사용자 포인트 이력 페이징 조회
 * - getPointTransactions: (관리자/본인) 대상 사용자 포인트 이력 조회
 * - adminRecordPointAdjustment: 관리자 수동 가/감 기록 (PointTransaction 생성 + User.points 반영)
 *
 * 의존성:
 * - TypeORM Repository 주입을 위해 PointTransaction, User 엔티티를 forFeature 로 등록
 *
 * 확장 여지:
 * - 향후 서비스 계층(PointsService)을 도입하여 비즈니스 로직(포인트 재계산, 집계, 캐시)을 분리 가능
 * - 이벤트 발행(예: 'points.adjusted') 로 알림/배지 시스템 연동 가능
 */
@Module({
  imports: [TypeOrmModule.forFeature([PointTransaction, User])],
  providers: [PointsResolver],
  /**
   * 현재는 외부 모듈에서 리졸버/서비스를 직접 참조할 필요가 없으므로 exports 비움
   * 필요 시 PointsService 도입 후 exports 배열에 추가
   */
  exports: [],
})
export class PointsModule {}
/**
 * commit: feat(be-points): PointsModule 생성 및 PointsResolver 등록
 */
