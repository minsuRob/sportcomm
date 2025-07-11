import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Comment } from './comment.entity';
import { CommentsService } from './comments.service';
import { CreateCommentInput } from './dto/create-comment.input';
import { UpdateCommentInput } from './dto/update-comment.input';

/**
 * @description 댓글 데이터와 관련된 GraphQL 요청(쿼리, 뮤테이션)을 처리하는 리졸버입니다.
 * @summary `@Resolver()` 데코레이터에 `Comment` 엔티티를 전달하여 이 리졸버가 `Comment` 타입을 처리함을 명시합니다.
 * 모든 요청은 `JwtAuthGuard`를 통해 인증된 사용자만 접근할 수 있도록 보호됩니다.
 */
@Resolver(() => Comment)
export class CommentsResolver {
  /**
   * @param commentsService - 댓글 관련 비즈니스 로직을 담고 있는 서비스
   */
  constructor(private readonly commentsService: CommentsService) {}

  /**
   * @description 새로운 댓글을 생성하는 뮤테이션입니다.
   * @param user - `@CurrentUser()` 데코레이터를 통해 주입된 현재 사용자 정보.
   * @param createCommentInput - 댓글 생성을 위한 입력 데이터.
   * @returns 생성된 댓글 객체.
   */
  @Mutation(() => Comment, { description: '새로운 댓글을 작성합니다.' })
  @UseGuards(JwtAuthGuard)
  createComment(
    @CurrentUser() user: { id: string },
    @Args('createCommentInput') createCommentInput: CreateCommentInput,
  ): Promise<Comment> {
    // 서비스 레이어에 작성자 ID와 입력 데이터를 전달하여 댓글 생성을 위임합니다.
    return this.commentsService.create(user.id, createCommentInput);
  }

  /**
   * @description 특정 게시물에 속한 모든 댓글을 조회하는 쿼리입니다.
   * @param postId - 댓글을 조회할 게시물의 ID.
   * @returns 해당 게시물의 댓글 목록.
   */
  @Query(() => [Comment], {
    name: 'commentsByPost',
    description: '특정 게시물의 모든 댓글을 조회합니다.',
  })
  // 댓글 조회가 비로그인 사용자에게도 허용되어야 한다면 @UseGuards(JwtAuthGuard)를 제거할 수 있습니다.
  // 여기서는 일관성을 위해 인증된 사용자만 조회 가능하도록 설정합니다.
  @UseGuards(JwtAuthGuard)
  getCommentsByPost(
    @Args('postId', {
      type: () => String,
      description: '댓글을 조회할 게시물의 ID',
    })
    postId: string,
  ): Promise<Comment[]> {
    return this.commentsService.findAllByPost(postId);
  }

  /**
   * @description 기존 댓글의 내용을 수정하는 뮤테이션입니다.
   * @summary 본인만 수정할 수 있도록 서비스 레이어에서 권한을 검사합니다.
   * @param user - 현재 사용자 정보.
   * @param updateCommentInput - 수정할 댓글의 ID와 새로운 내용.
   * @returns 수정된 댓글 객체.
   */
  @Mutation(() => Comment, { description: '기존 댓글의 내용을 수정합니다.' })
  @UseGuards(JwtAuthGuard)
  updateComment(
    @CurrentUser() user: { id: string },
    @Args('updateCommentInput') updateCommentInput: UpdateCommentInput,
  ): Promise<Comment> {
    // 서비스 레이어에 작성자 ID와 수정 데이터를 전달하여 댓글 수정을 위임합니다.
    return this.commentsService.update(user.id, updateCommentInput);
  }

  /**
   * @description 댓글을 소프트 삭제하는 뮤테이션입니다.
   * @summary 본인만 삭제할 수 있도록 서비스 레이어에서 권한을 검사합니다.
   * @param user - 현재 사용자 정보.
   * @param id - 삭제할 댓글의 ID.
   * @returns 소프트 삭제 처리된 댓글 객체 (deletedAt 필드가 설정됨).
   */
  @Mutation(() => Comment, { description: '댓글을 삭제합니다. (소프트 삭제)' })
  @UseGuards(JwtAuthGuard)
  removeComment(
    @CurrentUser() user: { id: string },
    @Args('id', { type: () => String, description: '삭제할 댓글의 ID' })
    id: string,
  ): Promise<Comment> {
    // 서비스 레이어에 작성자 ID와 댓글 ID를 전달하여 삭제를 위임합니다.
    return this.commentsService.remove(user.id, id);
  }
}
