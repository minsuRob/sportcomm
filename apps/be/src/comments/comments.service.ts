import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './comment.entity';
import { CreateCommentInput } from './dto/create-comment.input';
import { UpdateCommentInput } from './dto/update-comment.input';
import { PostsService } from '../posts/posts.service';

/**
 * @description 댓글 데이터와 관련된 비즈니스 로직을 처리하는 서비스 클래스입니다.
 * @summary 데이터베이스와의 상호작용(생성, 조회, 수정, 삭제)을 담당하며, CommentsResolver에 의해 호출됩니다.
 */
@Injectable()
export class CommentsService {
  /**
   * @param commentRepository TypeORM의 Comment 리포지토리.
   * @param postsService 게시물의 존재 여부를 확인하기 위한 PostsService.
   */
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    private readonly postsService: PostsService, // 게시물 존재 확인을 위해 주입
  ) {}

  /**
   * @description 새로운 댓글을 생성하고 데이터베이스에 저장합니다.
   * @summary 게시물과 부모 댓글의 유효성을 검사한 후 댓글을 생성합니다.
   * @param authorId - 댓글을 작성한 사용자의 ID.
   * @param createCommentInput - 댓글 생성을 위한 데이터 (postId, content, parentCommentId).
   * @returns 생성된 댓글 객체.
   * @throws {NotFoundException} - 대상 게시물이나 부모 댓글을 찾을 수 없을 경우 발생합니다.
   */
  async create(
    authorId: string,
    createCommentInput: CreateCommentInput,
  ): Promise<Comment> {
    const { postId, content, parentCommentId } = createCommentInput;

    // 1. 댓글을 달 게시물이 존재하는지 확인합니다.
    await this.postsService.findOne(postId);

    // 2. 대댓글인 경우, 부모 댓글이 존재하는지, 그리고 같은 게시물에 속해 있는지 확인합니다.
    if (parentCommentId) {
      const parentComment = await this.commentRepository.findOneBy({
        id: parentCommentId,
      });
      if (!parentComment) {
        throw new NotFoundException(
          `ID가 "${parentCommentId}"인 부모 댓글을 찾을 수 없습니다.`,
        );
      }
      if (parentComment.postId !== postId) {
        throw new ForbiddenException(
          '부모 댓글이 다른 게시물에 속해 있습니다.',
        );
      }
    }

    // 3. 새로운 댓글 엔티티를 생성합니다.
    const newComment = this.commentRepository.create({
      content,
      postId,
      authorId,
      parentCommentId,
    });

    // 4. 데이터베이스에 저장하고 결과를 반환합니다.
    return this.commentRepository.save(newComment);
  }

  /**
   * @description 특정 게시물에 달린 모든 댓글을 조회합니다.
   * @param postId - 댓글을 조회할 게시물의 ID.
   * @returns 해당 게시물의 댓글 목록.
   */
  async findAllByPost(postId: string): Promise<Comment[]> {
    return this.commentRepository.find({
      where: { postId },
      order: { createdAt: 'ASC' }, // 오래된 순으로 정렬
      relations: ['author'], // 작성자 정보 포함
    });
  }

  /**
   * @description 댓글 내용을 수정합니다.
   * @param authorId - 요청을 보낸 사용자의 ID.
   * @param updateCommentInput - 수정할 댓글의 ID와 새로운 내용.
   * @returns 수정된 댓글 객체.
   * @throws {NotFoundException} - 수정할 댓글을 찾을 수 없을 경우 발생합니다.
   * @throws {ForbiddenException} - 댓글 작성자가 아닌 다른 사용자가 수정을 시도할 경우 발생합니다.
   */
  async update(
    authorId: string,
    updateCommentInput: UpdateCommentInput,
  ): Promise<Comment> {
    const { id, content } = updateCommentInput;

    const comment = await this.commentRepository.findOneBy({ id });

    if (!comment) {
      throw new NotFoundException(`ID가 "${id}"인 댓글을 찾을 수 없습니다.`);
    }

    if (comment.authorId !== authorId) {
      throw new ForbiddenException('댓글을 수정할 권한이 없습니다.');
    }

    // content 필드를 새로운 내용으로 업데이트하고 저장합니다.
    comment.content = content;
    return this.commentRepository.save(comment);
  }

  /**
   * @description 댓글을 삭제합니다. (소프트 삭제)
   * @param authorId - 요청을 보낸 사용자의 ID.
   * @param id - 삭제할 댓글의 ID.
   * @returns 삭제된 댓글 객체 (소프트 삭제 정보 포함).
   * @throws {NotFoundException} - 삭제할 댓글을 찾을 수 없을 경우 발생합니다.
   * @throws {ForbiddenException} - 댓글 작성자가 아닌 다른 사용자가 삭제를 시도할 경우 발생합니다.
   */
  async remove(authorId: string, id: string): Promise<Comment> {
    const comment = await this.commentRepository.findOneBy({ id });

    if (!comment) {
      throw new NotFoundException(`ID가 "${id}"인 댓글을 찾을 수 없습니다.`);
    }

    if (comment.authorId !== authorId) {
      throw new ForbiddenException('댓글을 삭제할 권한이 없습니다.');
    }

    // softRemove는 deletedAt 컬럼에 타임스탬프를 기록합니다.
    await this.commentRepository.softRemove(comment);

    // 삭제된 객체(deletedAt이 설정된)를 반환합니다.
    return comment;
  }
}
