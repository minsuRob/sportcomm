/**
 * 게시물 생성 Command Handler
 *
 * CQRS 패턴에서 게시물 생성 명령을 처리하는 핸들러입니다.
 */

import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePostCommand } from '../create-post.command';
import { Post } from '../../../entities/post.entity';
import { User } from '../../../entities/user.entity';
import { Media } from '../../../entities/media.entity';
import { PostCreatedEvent } from '../events/post-created.event';
import { Transactional } from '../../../common/decorators/transactional.decorator';

@Injectable()
@CommandHandler(CreatePostCommand)
export class CreatePostHandler implements ICommandHandler<CreatePostCommand> {
  private readonly logger = new Logger(CreatePostHandler.name);

  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
    private readonly eventBus: EventBus,
  ) {}

  @Transactional()
  async execute(command: CreatePostCommand): Promise<Post> {
    const { title, content, type, teamId, authorId, mediaIds } = command;

    this.logger.debug(`게시물 생성 시작: 작성자=${authorId}, 팀=${teamId}`);

    // 1. 작성자 존재 확인
    const author = await this.userRepository.findOne({
      where: { id: authorId },
      relations: ['myTeams', 'myTeams.team'],
    });

    if (!author) {
      throw new NotFoundException('작성자를 찾을 수 없습니다.');
    }

    // 2. 팀 권한 확인
    const hasTeamAccess = author.myTeams?.some(
      (userTeam) => userTeam.team.id === teamId,
    );

    if (!hasTeamAccess) {
      throw new BadRequestException(
        '해당 팀에 게시물을 작성할 권한이 없습니다.',
      );
    }

    // 3. 미디어 파일 확인 및 연결
    let mediaFiles: Media[] = [];
    if (mediaIds && mediaIds.length > 0) {
      mediaFiles = await this.mediaRepository.findBy({
        id: mediaIds as any, // TypeORM In 연산자 사용
      });

      if (mediaFiles.length !== mediaIds.length) {
        throw new BadRequestException('일부 미디어 파일을 찾을 수 없습니다.');
      }

      // 미디어 파일이 이미 다른 게시물에 연결되어 있는지 확인
      const usedMedia = mediaFiles.filter((media) => media.postId);
      if (usedMedia.length > 0) {
        throw new BadRequestException('이미 사용 중인 미디어 파일이 있습니다.');
      }
    }

    // 4. 게시물 생성
    const post = this.postRepository.create({
      title: title?.trim() || null,
      content: content.trim(),
      type,
      teamId,
      author,
      media: mediaFiles,
      likeCount: 0,
      commentCount: 0,
      viewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 5. 게시물 저장
    const savedPost = await this.postRepository.save(post);

    // 6. 미디어 파일에 게시물 ID 연결
    if (mediaFiles.length > 0) {
      await this.mediaRepository.update(
        { id: mediaIds as any },
        { postId: savedPost.id },
      );
    }

    this.logger.log(`게시물 생성 완료: ID=${savedPost.id}, 작성자=${authorId}`);

    // 7. 이벤트 발행 (비동기 후속 처리)
    const event = new PostCreatedEvent(
      savedPost.id,
      savedPost.author.id,
      savedPost.teamId,
      savedPost.type,
      savedPost.title,
      savedPost.content,
      mediaFiles.map((m) => m.id),
    );

    this.eventBus.publish(event);

    return savedPost;
  }
}
