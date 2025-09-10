import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProgressService } from './progress.service';
import { ProgressResolver } from './progress.resolver';
import { User } from '../../entities/user.entity';

/**
 * ProgressModule
 *
 * 사용자 활동(채팅 메시지, 게시글 작성, 데일리 출석 등)에 따른
 * 포인트 및 경험치 적립/레벨 관리 기능을 제공하는 모듈입니다.
 *
 * - 확장성:
 *   새로운 적립 액션을 추가하려면 `UserProgressAction` enum과
 *   `USER_PROGRESS_REWARD` 매핑에 항목을 추가하고,
 *   필요한 경우 서비스에 편의 메서드를 추가하면 됩니다.
 * - 이벤트 연동:
 *   진행 상황 적립 시 'progress.awarded', 레벨업 시 'progress.levelup'
 *   이벤트를 발행하여 알림/배지/로그/분석 등과 쉽게 연계할 수 있습니다.
 */
@Module({
  imports: [
    // 포인트/경험치 적립을 위해 User 엔티티 접근
    TypeOrmModule.forFeature([User]),
  ],
  providers: [ProgressService, ProgressResolver],
  exports: [
    // 다른 모듈(채팅, 게시글 등)에서 ProgressService 사용을 위해 export
    ProgressService,
  ],
})
export class ProgressModule {}

/**
 * 커밋 메세지: feat(progress): ProgressModule 생성 및 의존성 구성
 */
