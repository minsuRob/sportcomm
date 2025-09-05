import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LotteryService } from './lottery.service';
import { LotteryResolver } from './lottery.resolver';
import { PointLottery } from '../../entities/point-lottery.entity';
import { LotteryEntry } from '../../entities/lottery-entry.entity';
import { User } from '../../entities/user.entity';
import { ProgressModule } from '../progress/progress.module';

/**
 * 포인트 추첨 모듈
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([PointLottery, LotteryEntry, User]),
    ProgressModule,
    // ScheduleModule.forRoot(), // 크론 작업을 위한 스케줄 모듈 - 패키지 설치 후 활성화
  ],
  providers: [LotteryService, LotteryResolver],
  exports: [LotteryService],
})
export class LotteryModule {}
