import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Report } from '../../entities/report.entity';
import { Block } from '../../entities/block.entity';
import { User } from '../../entities/user.entity';
import { Post } from '../../entities/post.entity';
import { ModerationService } from './moderation.service';
import { ModerationResolver } from './moderation.resolver';

/**
 * 조정 모듈
 * 신고 및 차단 기능을 제공합니다.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Report, Block, User, Post])],
  providers: [ModerationService, ModerationResolver],
  exports: [ModerationService],
})
export class ModerationModule {}
