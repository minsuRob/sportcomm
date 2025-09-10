import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedbackResolver } from './feedback.resolver';
import { FeedbackService } from './feedback.service';
import { Feedback } from '../../entities/feedback.entity';
import { User } from '../../entities/user.entity';

/**
 * 피드백 모듈
 *
 * 피드백 관련 기능을 제공합니다.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Feedback, User])],
  providers: [FeedbackResolver, FeedbackService],
  exports: [FeedbackService],
})
export class FeedbackModule {}
