import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreatePostInput } from './dto/create-post.input';
import { UpdatePostInput } from './dto/update-post.input';
import { PostVersion } from './post-version.entity';
import { Post } from './post.entity';

/**
 * @description 게시물 데이터와 관련된 비즈니스 로직을 처리하는 서비스 클래스입니다.
 * @summary 데이터베이스와의 상호작용(생성, 조회, 수정, 삭제) 및 권한 검사를 담당하며, PostsResolver에 의해 호출됩니다.
 */
@Injectable()
export class PostsService {
  /**
   * @param postRepository TypeORM의 Post 리포지토리.
   * @param postVersionRepository TypeORM의 PostVersion 리포지토리.
   * @param dataSource TypeORM 데이터 소스 객체. 트랜잭션 관리에 사용됩니다.
   */
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(PostVersion)
    private readonly postVersionRepository: Repository<PostVersion>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * @description 새로운 게시물을 생성하고 초기 버전 기록을 남깁니다.
   * @summary 모든 과정은 단일 트랜잭션 내에서 처리됩니다.
   * @param createPostInput - 게시물 생성을 위한 데이터 (내용, 타입).
   * @param authorId - 게시물을 작성한 사용자의 ID.
   * @returns 생성된 게시물 객체.
   */
  async create(
    createPostInput: CreatePostInput,
    authorId: string,
  ): Promise<Post> {
    return this.dataSource.transaction(async (transactionalEntityManager) => {
      // 1. Post 엔티티를 생성합니다.
      const newPost = transactionalEntityManager.create(Post, {
        ...createPostInput,
        authorId,
      });
      const savedPost = await transactionalEntityManager.save(newPost);

      // 2. 초기 버전(version: 1)의 PostVersion을 생성합니다.
      const initialVersion = transactionalEntityManager.create(PostVersion, {
        post: savedPost,
        postId: savedPost.id,
        authorId,
        version: 1,
        content: savedPost.content,
        editReason: 'Initial creation',
      });
      await transactionalEntityManager.save(initialVersion);

      return savedPost;
    });
  }

  /**
   * @description 페이지네이션을 적용하여 모든 게시물을 조회합니다.
   * @param take - 가져올 게시물의 수.
   * @param skip - 건너뛸 게시물의 수.
   * @returns 게시물 객체의 배열.
   */
  async findAll(take: number, skip: number): Promise<Post[]> {
    return this.postRepository.find({
      relations: ['author', 'comments', 'media'],
      order: { createdAt: 'DESC' },
      take,
      skip,
    });
  }

  /**
   * @description ID를 기준으로 특정 게시물 하나를 조회합니다.
   * @param id - 조회할 게시물의 UUID.
   * @returns 조회된 게시물 객체.
   * @throws {NotFoundException} - 해당 ID의 게시물을 찾을 수 없을 경우 발생합니다.
   */
  async findOne(id: string): Promise<Post> {
    const post = await this.postRepository.findOne({
      where: { id },
      relations: ['author', 'comments', 'media', 'versions'],
    });
    if (!post) {
      throw new NotFoundException(`ID가 "${id}"인 게시물을 찾을 수 없습니다.`);
    }
    return post;
  }

  /**
   * @description 기존 게시물을 수정하고 변경 이력을 남깁니다.
   * @summary 수정 전 내용을 PostVersion으로 백업하고, 게시물 내용을 업데이트합니다.
   * @param authorId - 수정을 요청한 사용자의 ID (권한 검사용).
   * @param updatePostInput - 수정할 게시물의 ID와 새로운 데이터.
   * @returns 수정된 게시물 객체.
   */
  async update(
    authorId: string,
    updatePostInput: UpdatePostInput,
  ): Promise<Post> {
    return this.dataSource.transaction(async (transactionalEntityManager) => {
      const { id, content, type, editReason } = updatePostInput;

      // 1. 게시물을 조회하고 잠금을 걸어 동시성 문제를 방지합니다.
      const post = await transactionalEntityManager.findOne(Post, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!post) {
        throw new NotFoundException(
          `ID가 "${id}"인 게시물을 찾을 수 없습니다.`,
        );
      }

      // 2. 권한을 검사합니다.
      if (post.authorId !== authorId) {
        throw new ForbiddenException('게시물을 수정할 권한이 없습니다.');
      }

      // 3. 마지막 버전 번호를 조회합니다.
      const lastVersion = await transactionalEntityManager.findOne(
        PostVersion,
        {
          where: { postId: id },
          order: { version: 'DESC' },
        },
      );
      const newVersionNumber = (lastVersion?.version || 0) + 1;

      // 4. 현재 내용을 기반으로 새로운 PostVersion을 생성합니다.
      const newVersion = transactionalEntityManager.create(PostVersion, {
        postId: post.id,
        authorId,
        version: newVersionNumber,
        content: post.content, // 수정 전 내용을 저장
        editReason: editReason || 'Content updated',
      });
      await transactionalEntityManager.save(newVersion);

      // 5. 원본 게시물의 내용을 업데이트합니다.
      // DTO에서 값이 제공된 경우에만 업데이트하여 undefined 할당을 방지합니다.
      if (content !== undefined) {
        post.content = content;
      }
      if (type !== undefined) {
        post.type = type;
      }

      return transactionalEntityManager.save(post);
    });
  }

  /**
   * @description 게시물을 소프트 삭제합니다.
   * @param authorId - 삭제를 요청한 사용자의 ID (권한 검사용).
   * @param id - 삭제할 게시물의 ID.
   * @returns 삭제된 게시물 객체.
   */
  async remove(authorId: string, id: string): Promise<Post> {
    const post = await this.findOne(id);

    if (post.authorId !== authorId) {
      throw new ForbiddenException('게시물을 삭제할 권한이 없습니다.');
    }

    await this.postRepository.softDelete(id);
    return post;
  }
}
