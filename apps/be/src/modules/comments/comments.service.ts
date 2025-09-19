import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Comment } from '../../entities/comment.entity';
import { Post } from '../../entities/post.entity';
import { CreateCommentInput } from './dto/create-comment.input';
import { ProgressService } from '../progress/progress.service';

/**
 * 댓글 서비스
 *
 * 댓글 생성, 조회, 수정, 삭제 등의 비즈니스 로직을 담당합니다.
 */
@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    private readonly eventEmitter: EventEmitter2,
    private readonly progressService: ProgressService,
  ) {}

  /**
   * 새 댓글 생성
   *
   * @param input 댓글 생성 입력 데이터 (게시물 ID, 내용, 부모 댓글 ID)
   * @param userId 현재 인증된 사용자 ID
   * @returns 생성된 댓글 객체
   * @throws NotFoundException 게시물이나 부모 댓글이 존재하지 않는 경우
   */
  async createComment(
    input: CreateCommentInput,
    userId: string,
  ): Promise<Comment> {
    const { postId, content, parentCommentId } = input;

    // 게시물 존재 여부 확인
    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException(`게시물을 찾을 수 없습니다. (ID: ${postId})`);
    }

    // 부모 댓글 존재 여부 확인 (대댓글인 경우)
    if (parentCommentId) {
      const parentComment = await this.commentRepository.findOne({
        where: { id: parentCommentId },
      });
      if (!parentComment) {
        throw new NotFoundException(
          `부모 댓글을 찾을 수 없습니다. (ID: ${parentCommentId})`,
        );
      }
    }

    // 새 댓글 생성
    const newComment = this.commentRepository.create({
      content,
      postId,
      authorId: userId,
      parentCommentId,
    });

    // 게시물의 댓글 수 증가
    post.commentCount += 1;
    await this.postRepository.save(post);

    // 부모 댓글의 답글 수 증가 (대댓글인 경우)
    if (parentCommentId) {
      const parentComment = await this.commentRepository.findOne({
        where: { id: parentCommentId },
      });
      if (parentComment) {
        parentComment.replyCount += 1;
        await this.commentRepository.save(parentComment);
      }
    }

    // 댓글 저장
    const savedComment = await this.commentRepository.save(newComment);

    // author 관계를 포함하여 댓글 다시 조회
    const commentWithAuthor = await this.commentRepository.findOne({
      where: { id: savedComment.id },
      relations: ['author'],
    });

    // 조회된 댓글이 없는 경우(데이터베이스 일관성 문제 등) 예외 처리
    if (!commentWithAuthor) {
      throw new NotFoundException(
        `방금 생성한 댓글을 찾을 수 없습니다. (ID: ${savedComment.id})`,
      );
    }

    // 댓글 알림 이벤트 발생 (자신의 게시물에 댓글을 달 때는 알림 안 보냄)
    if (post.authorId !== userId) {
      this.eventEmitter.emit('notification.comment', {
        postId,
        commentId: savedComment.id,
        userId,
        authorId: post.authorId,
      });
    }

    // 포인트/경험치 적립 (댓글 작성 액션)
    // 실패하더라도 댓글 생성 흐름에 영향을 주지 않도록 예외는 로깅 후 무시
    this.progressService
      ?.awardChatMessage(userId)
      .catch((err) =>
        console.error('[Progress] 댓글 작성 적립 실패:', err?.message || err),
      );

    // 팀별 경험치 적립 (댓글이 달린 게시물의 팀에 경험치 부여)
    // 댓글 작성 시 해당 팀에 3점 경험치 적립
    this.progressService
      ?.awardTeamExperienceForComment(userId, post.teamId, savedComment.id)
      .catch((err) =>
        console.error('[Progress] 팀 경험치 적립 실패:', err?.message || err),
      );

    return commentWithAuthor;
  }

  /**
   * 게시물의 댓글 목록 조회
   *
   * @param postId 게시물 ID
   * @param page 페이지 번호 (기본값: 1)
   * @param limit 페이지당 댓글 수 (기본값: 20)
   * @returns 댓글 목록
   */
  async findByPostId(
    postId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<Comment[]> {
    return await this.commentRepository.find({
      where: { postId, parentCommentId: IsNull() }, // 최상위 댓글만 조회
      relations: ['author', 'childComments', 'childComments.author'],
      skip: (page - 1) * limit,
      take: limit,
      order: {
        isPinned: 'DESC', // 고정 댓글 우선
        createdAt: 'DESC', // 최신 댓글 우선
      },
    });
  }

  /**
   * 댓글 삭제
   *
   * @param id 삭제할 댓글 ID
   * @param userId 현재 인증된 사용자 ID
   * @returns 삭제된 댓글
   * @throws NotFoundException 댓글을 찾을 수 없는 경우
   * @throws ForbiddenException 권한이 없는 경우
   */
  async deleteComment(id: string, userId: string): Promise<Comment> {
    const comment = await this.commentRepository.findOne({
      where: { id },
      relations: ['author', 'post'],
    });

    if (!comment) {
      throw new NotFoundException(`댓글을 찾을 수 없습니다. (ID: ${id})`);
    }

    // 댓글 작성자가 아니면 삭제 불가
    if (comment.authorId !== userId) {
      throw new ForbiddenException('댓글을 삭제할 권한이 없습니다.');
    }

    // 게시물의 댓글 수 감소
    if (comment.post) {
      const post = comment.post;
      post.commentCount = Math.max(0, post.commentCount - 1);
      await this.postRepository.save(post);
    }

    // 부모 댓글의 답글 수 감소 (대댓글인 경우)
    if (comment.parentCommentId) {
      const parentComment = await this.commentRepository.findOne({
        where: { id: comment.parentCommentId },
      });
      if (parentComment) {
        parentComment.replyCount = Math.max(0, parentComment.replyCount - 1);
        await this.commentRepository.save(parentComment);
      }
    }

    // 댓글 삭제 처리
    const deletedComment = { ...comment } as Comment;
    await this.commentRepository.remove(comment);

    // 댓글 삭제 알림 이벤트 발생 (관련 알림 삭제용)
    this.eventEmitter.emit('notification.comment.delete', {
      postId: comment.postId,
      commentId: comment.id,
      userId: comment.authorId,
      authorId: comment.post?.authorId,
    });

    return deletedComment;
  }
}
