import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from './post.entity';
import { PostsResolver } from './posts.resolver';
import { PostsService } from './posts.service';
import { PostVersion } from './post-version.entity';
import { User } from '../users/user.entity';
import { Comment } from '../comments/comment.entity';
import { Media } from '../media/media.entity';
import { Follow } from '../follows/follow.entity';
import { ChatMessage } from '../chat-message.entity';
import { ChatRoom } from '../chat-room.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Post,
      PostVersion,
      User,
      Comment,
      Media,
      Follow,
      ChatMessage,
      ChatRoom,
    ]),
  ],
  providers: [PostsResolver, PostsService],
  exports: [PostsService],
})
export class PostsModule {}
