import { Resolver, Query, Mutation, Args, Int, ObjectType, Field, InputType } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { IsString, MinLength, MaxLength, IsInt, Min, Max, IsOptional } from 'class-validator';
import { CommentsService } from './comments.service';
import { Comment } from '../../entities/comment.entity';
import { User } from '../../entities/user.entity';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@InputType()
export class CreateCommentInput {
  @Field(() => String, { description: '게시물 ID' })
  @IsString()
  postId: string;

  @Field(() => String, { description: '댓글 내용' })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content: string;
}

@InputType()
export class UpdateCommentInput {
  @Field(() => String, { description: '댓글 ID' })
  @IsString()
  id: string;

  @Field(() => String, { nullable: true, description: '댓글 내용' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content?: string;
}

@ObjectType()
export class CommentsResponse {
  @Field(() => [Comment], { description: '댓글 목록' })
  comments: Comment[];

  @Field(() => Int, { description: '총 댓글 수' })
  total: number;

  @Field(() => Int, { description: '현재 페이지' })
  page: number;

  @Field(() => Int, { description: '페이지 크기' })
  limit: number;

  @Field(() => Int, { description: '총 페이지 수' })
  totalPages: number;

  @Field(() => Boolean, { description: '이전 페이지 존재 여부' })
  hasPrevious: boolean;

  @Field(() => Boolean, { description: '다음 페이지 존재 여부' })
  hasNext: boolean;
}

@Resolver(() => Comment)
export class CommentsResolver {
  constructor(private readonly commentsService: CommentsService) {}

  @UseGuards(GqlAuthGuard)
  @Mutation(() => Comment, { description: '댓글 생성' })
  async createComment(
    @CurrentUser() user: User,
    @Args('createCommentInput') createCommentInput: CreateCommentInput,
  ): Promise<Comment> {
    return this.commentsService.create(user.id, createCommentInput);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => Comment, { description: '댓글 수정' })
  async updateComment(
    @CurrentUser() user: User,
    @Args('updateCommentInput') updateCommentInput: UpdateCommentInput,
  ): Promise<Comment> {
    const { id, content } = updateCommentInput;

    if (content === null || content === undefined) {
      return this.commentsService.findById(id);
    }

    return this.commentsService.update(id, user.id, { content });
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => Comment, { description: '댓글 삭제' })
  async removeComment(
    @CurrentUser() user: User,
    @Args('id', { type: () => String }) id: string,
  ): Promise<Comment> {
    return this.commentsService.remove(id, user.id);
  }

  @Query(() => CommentsResponse, { description: '게시물별 댓글 목록 조회' })
  async comments(
    @Args('postId', { type: () => String }) postId: string,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
  ): Promise<CommentsResponse> {
    return this.commentsService.findAll({ postId, page, limit });
  }
}