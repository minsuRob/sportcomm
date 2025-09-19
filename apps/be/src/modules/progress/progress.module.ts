import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProgressService } from './progress.service';
import { ProgressResolver } from './progress.resolver';
import { User } from '../../entities/user.entity';
import { PointTransaction } from '../../entities/point-transaction.entity';
import { UserTeam } from '../../entities/user-team.entity';

/**
 * ProgressModule
 *
 * 사용자 활동(채팅 메시지, 게시글 작성, 데일리 출석 등)에 따른
 * 포인트 적립/차감 및 포인트 트랜잭션 이력 기록(PointTransaction)을
 * 담당하는 서비스/리졸버를 제공하는 모듈입니다.
 *
 * 업데이트 사항:
 * - ProgressService 가 포인트 변동 시 point_transactions 테이블에
 *   PointTransaction 레코드를 저장하도록 확장됨 (award/deduct/custom).
 *
 * 확장 포인트:
 * - 새로운 적립 액션 추가 시 UserProgressAction / USER_PROGRESS_REWARD 확장
 * - 경험치/레벨 시스템 재도입 시 별도 필드 및 계산 서비스 추가 가능
 * - 이벤트(progress.awarded / progress.deducted) 기반 배지, 알림 연동
 */
@Module({
  imports: [
    // 포인트 적립/차감 및 트랜잭션 이력 작성을 위해 User, PointTransaction, UserTeam 엔티티 주입
    TypeOrmModule.forFeature([User, PointTransaction, UserTeam]),
  ],
  providers: [ProgressService, ProgressResolver],
  exports: [
    // 다른 모듈(채팅, 게시글, 상점, 추첨 등)에서 ProgressService 사용을 위해 export
    ProgressService,
  ],
})
export class ProgressModule {}

/**
 * 커밋 메세지: chore(progress): PointTransaction 리포지토리 주입 위해 ProgressModule 업데이트
 */
