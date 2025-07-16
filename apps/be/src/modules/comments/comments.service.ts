import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from '../../entities/comment.entity';
import { CommentVersion } from '../../entities/comment-version.entity';

/**
 * 댓글 생성 입력 인터페이스
 */
export interface CreateCommentInput {
  /** 댓글 내용 */
  content: string;
  /** 게시물 ID */
  postId: string;
}

/**
 * 댓글 업데이트 입력 인터페이스
 */
export interface UpdateCommentInput {
  /** 댓글 내용 */
  content: string;
  /** 수정 사유 */
  editReason?: string;
}

/**
 * 댓글 목록 조회 옵션 인터페이스
 */
export interface FindCommentsOptions {
  /** 페이지 번호 (1부터 시작) */
  page?: number;
  /** 페이지 크기 */
  limit?: number;
  /** 게시물 ID 필터 */
  postId?: string;
}

/**
 * 댓글 목록 응답 인터페이스
 */
export interface CommentsResponse {
  /** 댓글 목록 */
  comments: Comment[];
  /** 총 댓글 수 */
  total: number;
  /** 현재 페이지 */
  page: number;
  /** 페이지 크기 */
  limit: number;
  /** 총 페이지 수 */
  totalPages: number;
  /** 이전 페이지 존재 여부 */
  hasPrevious: boolean;
  /** 다음 페이지 존재 여부 */
  hasNext: boolean;
}

/**
 * 댓글 서비스
 *
 * 댓글 생성, 조회, 수정, 삭제 등의 비즈니스 로직을 처리합니다.
 */
@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(CommentVersion)
    private readonly commentVersionRepository: Repository<CommentVersion>,
  ) {}

  /**
   * 댓글 생성
   *
   * @param authorId - 작성자 ID
   * @param createCommentInput - 댓글 생성 정보
   * @returns 생성된 댓글
   */
  async create(
    authorId: string,
    createCommentInput: CreateCommentInput,
  ): Promise<Comment> {
    const { content, postId } = createCommentInput;

    const comment = this.commentRepository.create({
      content,
      postId,
      authorId,
    });

    const savedComment = await this.commentRepository.save(comment);

    await this.createCommentVersion(savedComment, 1, '댓글 생성');

    return await this.findById(savedComment.id);
  }

  /**
   * 댓글 목록 조회
   *
   * @param options - 조회 옵션
   * @returns 댓글 목록과 페이지네이션 정보
   */
  async findAll(
    options: FindCommentsOptions = {},
  ): Promise<CommentsResponse> {
    const { page = 1, limit = 10, postId } = options;

    const skip = (page - 1) * limit;

    const queryBuilder = this.commentRepository
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.author', 'author')
      .where('comment.deletedAt IS NULL');

    if (postId) {
      queryBuilder.andWhere('comment.postId = :postId', { postId });
    }

    queryBuilder.orderBy('comment.createdAt', 'ASC');

    const total = await queryBuilder.getCount();
    const comments = await queryBuilder.skip(skip).take(limit).getMany();

    const totalPages = Math.ceil(total / limit);
    const hasPrevious = page > 1;
    const hasNext = page < totalPages;

    return {
      comments,
      total,
      page,
      limit,
      totalPages,
      hasPrevious,
      hasNext,
    };
  }

  /**
   * 댓글 상세 조회
   *
   * @param id - 댓글 ID
   * @returns 댓글 정보
   * @throws NotFoundException - 댓글을 찾을 수 없음
   */
  async findById(id: string): Promise<Comment> {
    const comment = await this.commentRepository.findOne({
      where: { id },
      relations: ['author', 'versions'],
    });

    if (!comment) {
      throw new NotFoundException('댓글을 찾을 수 없습니다.');
    }

    return comment;
  }

  /**
   * 댓글 수정
   *
   * @param id - 댓글 ID
   * @param userId - 수정하는 사용자 ID
   * @param updateCommentInput - 수정 정보
   * @returns 수정된 댓글
   * @throws NotFoundException - 댓글을 찾을 수 없음
   * @throws UnauthorizedException - 수정 권한이 없음
   */
  async update(
    id: string,
    userId: string,
    updateCommentInput: UpdateCommentInput,
  ): Promise<Comment> {
    const existingComment = await this.findById(id);

    if (existingComment.authorId !== userId) {
      throw new UnauthorizedException('댓글을 수정할 권한이 없습니다.');
    }

    const { content, editReason } = updateCommentInput;
    const previousContent = existingComment.content;

    existingComment.content = content;

    const updatedComment = await this.commentRepository.save(existingComment);

    if (content !== previousContent) {
      const latestVersion = await this.getLatestCommentVersion(id);
      const newVersionNumber = latestVersion ? latestVersion.version + 1 : 1;

      await this.createCommentVersion(
        updatedComment,
        newVersionNumber,
        editReason || '댓글 수정',
        previousContent.length - content.length,
      );
    }

    return await this.findById(id);
  }

  /**
   * 댓글 삭제 (소프트 삭제)
   *
   * @param id - 댓글 ID
   * @param userId - 삭제하는 사용자 ID
   * @returns 삭제된 댓글
   * @throws NotFoundException - 댓글을 찾을 수 없음
   * @throws UnauthorizedException - 삭제 권한이 없음
   */
  async remove(id: string, userId: string): Promise<Comment> {
    const existingComment = await this.findById(id);

    if (existingComment.authorId !== userId) {
      throw new UnauthorizedException('댓글을 삭제할 권한이 없습니다.');
    }

    await this.commentRepository.softDelete(id);

    return existingComment;
  }

  /**
   * 댓글 버전 생성
   */
  private async createCommentVersion(
    comment: Comment,
    version: number,
    editReason: string,
    characterDiff: number = 0,
  ): Promise<CommentVersion> {
    const commentVersion = this.commentVersionRepository.create({
      content: comment.content,
      version,
      editReason,
      characterDiff,
      commentId: comment.id,
    });

    return await this.commentVersionRepository.save(commentVersion);
  }

  /**
   * 댓글의 최신 버전 조회
   */
  private async getLatestCommentVersion(
    commentId: string,
  ): Promise<CommentVersion | null> {
    return await this.commentVersionRepository.findOne({
      where: { commentId },
      order: { version: 'DESC' },
    });
  }
}