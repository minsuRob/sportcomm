import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { ChatResolver } from './chat.resolver';
import { ChatRoom } from '../../entities/chat-room.entity';
import { ChatMessage } from '../../entities/chat-message.entity';
import { User } from '../../entities/user.entity';
import { UserTeam } from '../../entities/user-team.entity';
import { Team } from '../../entities/team.entity';

/**
 * 채팅 모듈
 *
 * 채팅방 및 메시지 관련 기능을 제공하는 모듈입니다.
 * 팀별 채팅방 필터링 및 공용 채팅방 기능을 포함합니다.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([ChatRoom, ChatMessage, User, UserTeam, Team]),
  ],
  providers: [ChatService, ChatResolver],
  exports: [ChatService],
})
export class ChatModule {}
