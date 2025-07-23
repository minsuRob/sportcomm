import { Resolver, Args, Mutation, Query, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Comment } from '../../entities/comment.entity';
import { CreateCommentInput } from './dto/create-comment.input';
import { CommentsService } from './comments.service';
import { User } from '../../entities/user.entity';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { GqlAuthGuard } from 'src/common/guards/gql-auth.guard';

/**
 * 댓글 관련 GraphQL Resolver
 *
 * 게시물에 댓글 생성, 조회, 수정, 삭제 기능을 제공합니다.
 */
@Resolver(() => Comment)
export class CommentsResolver {
  constructor(private readonly commentsService: CommentsService) {}

  /**
   * 새 댓글 생성
   *
   * @param input 댓글 생성 입력 데이터 (게시물 ID, 내용, 부모 댓글 ID)
   * @param user 현재 인증된 사용자
   * @returns 생성된 댓글 객체
   */
  @Mutation(() => Comment, { description: '새 댓글 작성' })
  @UseGuards(GqlAuthGuard)
  async createComment(
    @Args('input') input: CreateCommentInput,
    @CurrentUser() user: User,
  ): Promise<Comment> {
    return await this.commentsService.createComment(input, user.id);
  }

  /**
   * 게시물의 댓글 목록 조회
   *
   * @param postId 게시물 ID
   * @param page 페이지 번호 (기본값: 1)
   * @param limit 페이지당 댓글 수 (기본값: 20)
   * @returns 댓글 목록
   */
  @Query(() => [Comment], { description: '게시물의 댓글 목록 조회' })
  async getCommentsByPostId(
    @Args('postId') postId: string,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
  ): Promise<Comment[]> {
    return await this.commentsService.findByPostId(postId, page, limit);
  }

  /**
   * 댓글 삭제
   *
   * @param id 삭제할 댓글 ID
   * @param user 현재 인증된 사용자
   * @returns 삭제된 댓글
   */
  @Mutation(() => Comment, { description: '댓글 삭제' })
  @UseGuards(GqlAuthGuard)
  async deleteComment(
    @Args('id') id: string,
    @CurrentUser() user: User,
  ): Promise<Comment> {
    return await this.commentsService.deleteComment(id, user.id);
  }
}
