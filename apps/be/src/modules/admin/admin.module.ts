import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminResolver } from './admin.resolver';
import { TeamManagementService } from './team-management.service';
import { TeamManagementResolver } from './team-management.resolver';
import { User } from '../../entities/user.entity';
import { Post } from '../../entities/post.entity';
import { ChatRoom } from '../../entities/chat-room.entity';
import { ChatMessage } from '../../entities/chat-message.entity';
import { Report } from '../../entities/report.entity';
import { Feedback } from '../../entities/feedback.entity';
import { Team } from '../../entities/team.entity';
import { Sport } from '../../entities/sport.entity';

/**
 * 관리자 모듈
 *
 * 관리자 전용 기능들을 제공하는 모듈입니다.
 * 사용자 관리, 채팅방 관리, 팀 관리, 게시물 관리 등의 기능을 포함합니다.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Post,
      ChatRoom,
      ChatMessage,
      Report,
      Feedback,
      Team,
      Sport,
    ]),
  ],
  providers: [
    AdminService,
    AdminResolver,
    TeamManagementService,
    TeamManagementResolver,
  ],
  exports: [AdminService, TeamManagementService],
})
export class AdminModule {}
