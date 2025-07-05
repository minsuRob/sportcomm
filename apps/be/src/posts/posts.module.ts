import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from './post.entity';
import { PostsResolver } from './posts.resolver';
import { PostsService } from './posts.service';
import { PostVersion } from './post-version.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [
    // Register the entities that are directly managed by this module's services.
    // This makes the repositories for Post and PostVersion available for injection.
    TypeOrmModule.forFeature([Post, PostVersion, User]),
  ],
  // The resolver is the entry point for GraphQL requests.
  // The service contains the business logic.
  providers: [PostsResolver, PostsService],
  // Exporting the service allows other modules to use it if needed.
  exports: [PostsService],
})
export class PostsModule {}
